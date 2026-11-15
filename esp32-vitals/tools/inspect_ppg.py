#!/usr/bin/env python3
"""Extract complete `w` captures from Serial Monitor logs into CSV and SVG.

No third-party dependencies. Plots raw counts and normalized optical variations;
does not estimate or validate SpO2. Accepts Arduino Serial Monitor time prefixes.
"""
import argparse
import csv
import math
from pathlib import Path
import re


def captures(text):
    current = None
    for line in text.splitlines():
        match = re.search(r'(PPG_BEGIN,|PPG_END,|PPG,|BEAT,).*', line)
        if not match:
            continue
        fields = match.group().split(',')
        if fields[0] == 'PPG_BEGIN':
            if current is not None:
                raise ValueError('Incomplete capture before next PPG_BEGIN')
            metadata = dict(field.split('=', 1) for field in fields[1:])
            if metadata.get('rate_hz') != '25' or metadata.get('count') != '100':
                raise ValueError('Expected a 100-pair, 25 Hz capture')
            current = {'seq': int(metadata['seq']), 'end_ms': int(metadata['end_ms']),
                       'samples': [], 'beats': []}
            if 'led_drive' in metadata:
                current['led_drive'] = int(metadata['led_drive'])
                if not 0 <= current['led_drive'] <= 255:
                    raise ValueError('Invalid LED drive code')
        elif current is not None and fields[0] in ('PPG', 'BEAT'):
            if int(fields[1]) != current['seq']:
                raise ValueError('Mixed sequences in capture')
            if fields[0] == 'PPG':
                if len(fields) != 5:
                    raise ValueError('Malformed PPG row')
                index, red, ir = map(int, fields[2:])
                if index != len(current['samples']) or not (0 <= red <= 262143 and 0 <= ir <= 262143):
                    raise ValueError('Missing/duplicate sample or invalid ADC count')
                current['samples'].append((index / 25, red, ir))
            else:
                if len(fields) != 8 or int(fields[2]) != len(current['beats']):
                    raise ValueError('Malformed or unordered beat row')
                values = tuple(map(float, fields[3:]))
                if not all(math.isfinite(v) for v in values):
                    raise ValueError('Nonfinite beat diagnostic')
                current['beats'].append((int(fields[2]), *values))
        elif current is not None and fields[0] == 'PPG_END':
            if fields[1] != f"seq={current['seq']}" or len(current['samples']) != 100:
                raise ValueError('Incomplete capture: expected 100 ordered pairs')
            yield current
            current = None
    if current is not None:
        raise ValueError('Incomplete capture: missing PPG_END')


def waveform_svg(capture):
    red = [row[1] for row in capture['samples']]
    ir = [row[2] for row in capture['samples']]
    svg = ['<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="820" viewBox="0 0 1000 820">',
           '<rect width="1000" height="820" fill="white"/>',
           '<g font-family="sans-serif" font-size="14" fill="#222">',
           f'<text x="70" y="28">PPG window {capture["seq"]}; report uptime {capture["end_ms"]} ms; 25 pairs/s</text>',
           f'<text x="70" y="52">Red = red channel; blue = infrared. LED drive code: {capture.get("led_drive", "unspecified")}. Source: supplied log.</text>']

    def panel(top, title, series):
        vals = [v for values, _ in series for v in values]
        lo, hi = min(vals), max(vals)
        padding = max((hi-lo)*.08, 1e-6)
        lo -= padding; hi += padding
        svg.append(f'<text x="70" y="{top}">{title}</text>')
        y0 = top+15
        for tick in range(5):
            y = y0 + tick*37.5
            value = hi-(hi-lo)*tick/4
            svg.append(f'<path d="M70 {y} H970" stroke="#ddd"/><text x="4" y="{y+5}">{value:.4g}</text>')
        for values, color in series:
            points = ' '.join(f'{70+i*900/99:.2f},{y0+150*(hi-v)/(hi-lo):.2f}' for i, v in enumerate(values))
            svg.append(f'<polyline points="{points}" fill="none" stroke="{color}" stroke-width="1.6"/>')
        for index in (0, 25, 50, 75, 99):
            svg.append(f'<text x="{70+index*900/99-8}" y="{y0+171}">{index/25:g}</text>')
        svg.append(f'<text x="440" y="{y0+193}">Seconds from first sample</text>')

    panel(83, 'Raw red counts', [(red, '#c22')])
    panel(318, 'Raw infrared counts', [(ir, '#1672bc')])
    # Retain drift in this plot: subtract mean only, unlike the firmware RMS/correlation detrend.
    def normalized(values):
        mean = sum(values)/len(values)
        return [(v-mean)/mean if mean else 0 for v in values]
    panel(553, '(Raw - mean) / mean: includes drift and artifacts; NOT isolated pulsatile AC/DC',
          [(normalized(red), '#c22'), (normalized(ir), '#1672bc')])
    svg.append('</g></svg>')
    return '\n'.join(svg)


def export(text, output):
    windows = list(captures(text))  # Validate all captures before writing output.
    if not windows:
        raise ValueError('No complete raw captures found. Send w, then save PPG_BEGIN through PPG_END.')
    output.mkdir(parents=True, exist_ok=True)
    for number, window in enumerate(windows, 1):
        stem = output / f'capture-{number:03d}-seq-{window["seq"]}'
        with stem.with_suffix('.csv').open('w', newline='') as stream:
            writer = csv.writer(stream)
            writer.writerow(['seconds_from_first_sample', 'red', 'ir'])
            writer.writerows(window['samples'])
        with stem.with_suffix('.beats.csv').open('w', newline='') as stream:
            writer = csv.writer(stream)
            writer.writerow(['beat', 'red_ac', 'red_dc_peak', 'ir_ac', 'ir_dc_peak', 'R'])
            writer.writerows(window['beats'])
        stem.with_suffix('.svg').write_text(waveform_svg(window))
    return len(windows)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('log', type=Path)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    try:
        count = export(args.log.read_text(), args.output)
    except ValueError as error:
        parser.exit(1, f'{error}\n')
    print(f'Exported {count} complete window(s) to {args.output}. No physiological accuracy inferred.')
