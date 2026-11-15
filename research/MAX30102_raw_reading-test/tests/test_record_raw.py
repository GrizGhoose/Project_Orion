import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('record_raw', Path(__file__).parents[1]/'tools/record_raw.py')
recorder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(recorder)


def started():
    capture = recorder.Capture()
    capture.feed('RAW_READY,version=raw60-v1,duration_ms=60000,rate_hz=25,led=31')
    capture.feed('RAW_BEGIN,start_ms=5000,duration_ms=60000')
    return capture


class CaptureTests(unittest.TestCase):
    def test_sixty_seconds_preserves_low_and_zero_counts(self):
        capture = started()
        for i in range(1500):
            self.assertEqual(capture.feed(f'RAW,{i},{20+i*40},0,1000'), (i, 20+i*40, 0, 1000))
        capture.feed('RAW_END,elapsed_ms=60000,count=1500,status=complete,reason=none')
        self.assertEqual(capture.count, 1500)
        self.assertEqual(capture.max_read_gap_ms, 40)

    def test_missing_and_duplicate_samples_rejected(self):
        for line in ['RAW,1,40,1000,1100', 'RAW,0,40,1000,1100']:
            capture = started()
            if ',0,' in line:
                capture.feed('RAW,0,20,1000,1100')
            with self.assertRaises(ValueError):
                capture.feed(line)

    def test_failed_short_and_mismatched_capture_not_complete(self):
        for line in ['RAW_END,elapsed_ms=60000,count=2,status=complete',
                     'RAW_END,elapsed_ms=30000,count=1,status=complete',
                     'RAW_END,elapsed_ms=60000,count=1,status=aborted,reason=i2c_read_failed',
                     'RAW_READY,version=raw60-v1,duration_ms=60000,rate_hz=25',
                     'RAW_ERROR,reason=i2c_read_failed']:
            capture = started(); capture.feed('RAW,0,20,1000,1100')
            with self.assertRaises(ValueError): capture.feed(line)
