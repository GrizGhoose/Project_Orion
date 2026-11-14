"""Persistence only: physiological decisions belong to the ESP32."""
import json
import sqlite3
import threading
import time


class Store:
    def __init__(self, path):
        self.lock = threading.RLock()
        self.db = sqlite3.connect(path, check_same_thread=False)
        self.db.row_factory = sqlite3.Row
        self.db.executescript('''
        PRAGMA journal_mode=WAL;
        CREATE TABLE IF NOT EXISTS boots(device TEXT, boot TEXT, PRIMARY KEY(device,boot));
        CREATE TABLE IF NOT EXISTS calibrations(device TEXT, boot TEXT, calibration INTEGER,
          baseline TEXT, updated REAL, PRIMARY KEY(device,boot,calibration));
        CREATE TABLE IF NOT EXISTS latest(device TEXT PRIMARY KEY, boot TEXT, seq INTEGER,
          received REAL, packet TEXT);
        CREATE TABLE IF NOT EXISTS readings(device TEXT, boot TEXT, seq INTEGER,
          calibration INTEGER, received REAL, sample_time_estimate REAL, data TEXT,
          PRIMARY KEY(device,boot,seq));
        ''')

    def ingest(self, packet, received=None):
        received = time.time() if received is None else received
        device, boot = packet['device_id'], packet['boot_id']
        last = packet['history'][-1]
        with self.lock, self.db:
            previous = self.db.execute('SELECT * FROM latest WHERE device=?', (device,)).fetchone()
            known = self.db.execute('SELECT 1 FROM boots WHERE device=? AND boot=?', (device, boot)).fetchone()
            if previous:
                if previous['boot'] == boot and last['seq'] <= previous['seq']:
                    return False  # Duplicate packets must not refresh freshness.
                if previous['boot'] != boot and known:
                    return False  # A delayed packet from a retired boot.
                old = json.loads(previous['packet'])
                if previous['boot'] == boot and (packet['calibration_id'] < old['calibration_id'] or
                        last['t_ms'] <= old['history'][-1]['t_ms']):
                    return False
            self.db.execute('INSERT OR IGNORE INTO boots VALUES(?,?)', (device, boot))
            self.db.execute('INSERT OR REPLACE INTO calibrations VALUES(?,?,?,?,?)',
                (device, boot, packet['calibration_id'], json.dumps(packet['baseline']), received))
            for row in packet['history']:
                estimate = received - (packet['sent_at_ms'] - row['t_ms']) / 1000
                self.db.execute('INSERT OR IGNORE INTO readings VALUES(?,?,?,?,?,?,?)',
                    (device, boot, row['seq'], packet['calibration_id'], received, estimate, json.dumps(row)))
            self.db.execute('INSERT OR REPLACE INTO latest VALUES(?,?,?,?,?)',
                (device, boot, last['seq'], received, json.dumps(packet)))
        return True

    def snapshot(self, device, now=None):
        with self.lock:
            row = self.db.execute('SELECT * FROM latest WHERE device=?', (device,)).fetchone()
        if not row:
            return {'packet': None, 'fresh': False, 'age_seconds': None, 'received_at': None}
        packet = json.loads(row['packet'])
        age = max(0, (time.time() if now is None else now) - row['received']) + (packet['sent_at_ms'] - packet['history'][-1]['t_ms']) / 1000
        return {'packet': json.loads(row['packet']), 'fresh': age < 18,
                'age_seconds': round(age, 1), 'received_at': row['received']}

    def readings(self, device, limit=100, offset=0):
        with self.lock:
            rows = self.db.execute('SELECT * FROM readings WHERE device=? ORDER BY received DESC, seq DESC LIMIT ? OFFSET ?',
                                   (device, limit, offset)).fetchall()
        return [{**dict(r), 'data': json.loads(r['data'])} for r in rows]

    def calibrations(self, device):
        with self.lock:
            rows = self.db.execute('SELECT * FROM calibrations WHERE device=? ORDER BY updated DESC LIMIT 100', (device,)).fetchall()
        return [{**dict(r), 'baseline': json.loads(r['baseline'])} for r in rows]
