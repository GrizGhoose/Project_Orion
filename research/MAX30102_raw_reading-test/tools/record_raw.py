#!/usr/bin/env python3
"""Record a commanded 60-second raw60-v1 acquisition on macOS/Linux (stdlib only)."""
import argparse
import csv
from datetime import datetime
import fcntl
import json
import os
from pathlib import Path
import select
import struct
import sys
import termios
import time
from zoneinfo import ZoneInfo


def fields(line):
    return dict(item.split('=', 1) for item in line.split(',')[1:])


class Capture:
    def __init__(self):
        self.settings = None
        self.begin = None
        self.end = None
        self.count = 0
        self.last_ms = None
        self.max_read_gap_ms = 0

    def feed(self, line):
        if line.startswith('RAW_ERROR,'):
            raise ValueError(line)
        if line.startswith('RAW_READY,'):
            if self.begin is not None:
                raise ValueError('Device restarted during recording')
            settings = fields(line)
            if settings.get('version') != 'raw60-v1' or settings.get('duration_ms') != '60000' or settings.get('rate_hz') != '25':
                raise ValueError('Unexpected firmware or recording settings')
            self.settings = settings
        elif line.startswith('RAW_BEGIN,'):
            if self.begin is not None or self.settings is None:
                raise ValueError('Unexpected recording start')
            self.begin = fields(line)
            if self.begin.get('duration_ms') != '60000':
                raise ValueError('Expected a 60-second recording')
        elif line.startswith('RAW,'):
            if self.begin is None or self.end is not None:
                raise ValueError('Sample outside recording')
            parts = line.split(',')
            if len(parts) != 5:
                raise ValueError('Malformed raw sample')
            index, ms, red, ir = map(int, parts[1:])
            if index != self.count:
                raise ValueError(f'Missing/duplicate raw row: expected {self.count}, received {index}')
            if not (0 <= ms < 60000 and 0 <= red <= 262143 and 0 <= ir <= 262143):
                raise ValueError('Raw sample outside acquisition bounds')
            if self.last_ms is not None:
                if ms < self.last_ms:
                    raise ValueError('Nonmonotonic device read timestamps')
                self.max_read_gap_ms = max(self.max_read_gap_ms, ms-self.last_ms)
            self.last_ms = ms
            self.count += 1
            return index, ms, red, ir
        elif line.startswith('RAW_END,'):
            if self.begin is None or self.end is not None:
                raise ValueError('Unexpected recording end')
            self.end = fields(line)
            if self.end.get('status') != 'complete':
                raise ValueError(f'Device aborted capture: {self.end.get("reason")}')
            if int(self.end['count']) != self.count or not self.count:
                raise ValueError('Device and saved sample counts disagree')
            if not 60000 <= int(self.end['elapsed_ms']) <= 60500:
                raise ValueError('Recording duration was not 60 seconds')
        return None


def open_port(path):
    fd = os.open(path, os.O_RDWR | os.O_NOCTTY | os.O_NONBLOCK)
    try:
        fcntl.ioctl(fd, termios.TIOCEXCL)
        options = termios.tcgetattr(fd)
        options[0] = options[1] = options[3] = 0
        options[2] = termios.CS8 | termios.CREAD | termios.CLOCAL
        options[4] = options[5] = termios.B115200
        options[6][termios.VMIN] = options[6][termios.VTIME] = 0
        termios.tcsetattr(fd, termios.TCSANOW, options)
        fcntl.ioctl(fd, termios.TIOCMBIC, struct.pack('I', termios.TIOCM_DTR | termios.TIOCM_RTS))
        return fd
    except BaseException:
        os.close(fd)
        raise


def record(port, output, site, countdown):
    stamp = datetime.now(ZoneInfo('Asia/Singapore')).strftime('%Y%m%d_%H%M%S')
    directory = output / f'at_rest_{site}_{stamp}_SGT'
    directory.mkdir(parents=True, exist_ok=False)
    capture = Capture()
    metadata = {'condition': 'at_rest', 'health_status': 'not_verified', 'site': site,
                'reference_oximeter': False, 'requested_duration_seconds': 60,
                'created_at': datetime.now(ZoneInfo('Asia/Singapore')).isoformat(),
                'port': port, 'status': 'incomplete', 'error': None,
                'timing_note': 'Device timestamps are FIFO read times, not exact optical conversion times.'}
    fd = None
    error = None
    try:
        with (directory/'readings.csv').open('w', newline='', buffering=1) as samples, \
             (directory/'readings.txt').open('w', buffering=1) as text, \
             (directory/'timing.csv').open('w', newline='', buffering=1) as timing, \
             (directory/'serial.log').open('wb', buffering=0) as serial_log:
            sample_writer = csv.writer(samples); sample_writer.writerow(['red', 'ir'])
            timing_writer = csv.writer(timing); timing_writer.writerow(['sample_index', 'device_elapsed_ms', 'host_monotonic_s'])
            fd = open_port(port)
            buffer = b''
            opened = time.monotonic()
            last_probe = 0
            armed_at = None
            sent_start = None
            last_progress = 0
            print(f'Files: {directory}', flush=True)
            print('Waiting for raw-only firmware…', flush=True)
            while capture.end is None:
                now = time.monotonic()
                if capture.settings is None:
                    if now-opened > 20:
                        raise TimeoutError('No RAW_READY received; confirm raw-only firmware and close other serial tools')
                    if now-last_probe > 1:
                        os.write(fd, b'p'); last_probe = now
                elif armed_at is None:
                    armed_at = now
                    print(f'Ready. Recording starts in {countdown} seconds. Keep the sensor still.', flush=True)
                elif sent_start is None and now-armed_at >= countdown:
                    os.write(fd, b'r'); sent_start = now
                if sent_start is not None:
                    if capture.begin is None and now-sent_start > 5:
                        raise TimeoutError('Device did not acknowledge recording start')
                    if now-sent_start > 70:
                        raise TimeoutError('No completion marker; partial data preserved')
                    if capture.begin is not None and now-last_progress >= 5:
                        print(f'Recording: {min(60, int(now-sent_start))}/60 seconds, {capture.count} raw pairs saved', flush=True)
                        last_progress = now
                readable, _, _ = select.select([fd], [], [], 0.2)
                if not readable:
                    continue
                data = os.read(fd, 8192)
                if not data:
                    raise OSError('Serial device disconnected')
                serial_log.write(data)
                buffer += data
                while b'\n' in buffer:
                    line, buffer = buffer.split(b'\n', 1)
                    row = capture.feed(line.decode('utf-8', errors='replace').strip())
                    if row is not None:
                        index, ms, red, ir = row
                        sample_writer.writerow([red, ir])
                        text.write(f'Red:{red}\tIR:{ir}\n')
                        timing_writer.writerow([index, ms, f'{time.monotonic():.6f}'])
            metadata['status'] = 'complete'
    except (Exception, KeyboardInterrupt) as exc:
        error = f'{type(exc).__name__}: {exc}'
        metadata['error'] = error
        if fd is not None:
            try:
                os.write(fd, b'x')
            except OSError:
                pass
    finally:
        if fd is not None:
            os.close(fd)
        metadata.update(settings=capture.settings, device_begin=capture.begin,
                        device_end=capture.end, saved_pairs=capture.count,
                        max_read_gap_ms=capture.max_read_gap_ms)
        warnings = []
        if metadata['status'] == 'complete':
            if not 1425 <= capture.count <= 1575:
                warnings.append('Sample count differs by more than 5% from nominal 1500 pairs')
            if capture.max_read_gap_ms > 200:
                warnings.append('A gap between sample read timestamps exceeded 200 ms')
        metadata['integrity_warnings'] = warnings
        (directory/'metadata.json').write_text(json.dumps(metadata, indent=2)+'\n')
    print(json.dumps({'directory': str(directory), **metadata}, indent=2), flush=True)
    return 1 if error else 0


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', required=True)
    parser.add_argument('--site', choices=['earlobe', 'fingertip'], default='earlobe')
    parser.add_argument('--countdown', type=int, choices=range(0, 31), default=5)
    parser.add_argument('--output', type=Path, default=Path(__file__).resolve().parents[1]/'recordings')
    args = parser.parse_args()
    sys.exit(record(args.port, args.output, args.site, args.countdown))
