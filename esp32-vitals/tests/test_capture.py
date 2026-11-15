import importlib.util
from pathlib import Path
import tempfile
import unittest
import xml.etree.ElementTree as ET

spec = importlib.util.spec_from_file_location('inspect_ppg', Path(__file__).parents[1]/'tools/inspect_ppg.py')
capture = importlib.util.module_from_spec(spec)
spec.loader.exec_module(capture)


def log():
    lines = ['15:12:00.000 -> PPG_BEGIN,seq=30,end_ms=180000,rate_hz=25,count=100']
    lines += [f'15:12:00.100 -> PPG,30,{i},{10000+i},{11000+i}' for i in range(100)]
    lines += ['unrelated serial diagnostic', 'BEAT,30,0,100,10000,200,11000,0.55', 'PPG_END,seq=30']
    return '\n'.join(lines)


class CaptureTests(unittest.TestCase):
    def test_timestamped_capture_exports(self):
        with tempfile.TemporaryDirectory() as directory:
            self.assertEqual(capture.export(log(), Path(directory)), 1)
            svg = next(Path(directory).glob('*.svg'))
            ET.parse(svg)
            self.assertIn('NOT isolated pulsatile', svg.read_text())
            self.assertEqual(len(next(Path(directory).glob('*.beats.csv')).read_text().splitlines()), 2)

    def test_missing_duplicate_truncated_or_mixed_rows_rejected(self):
        for broken in (log().replace('PPG,30,50,10050,11050', 'noise'),
                       log().replace('PPG,30,50,', 'PPG,30,49,'),
                       log().replace('PPG_END,seq=30', ''),
                       log().replace('PPG,30,50,', 'PPG,31,50,')):
            with self.assertRaises(ValueError):
                list(capture.captures(broken))

    def test_summary_only_log_cannot_generate_fake_waveform(self):
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaises(ValueError):
                capture.export('Optical IR: mean=10317 min=7233 max=11278', Path(directory))
