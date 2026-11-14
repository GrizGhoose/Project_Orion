import tempfile
import unittest
from models import Packet
from storage import Store


def packet(seq=1, boot='a'*16, sent=None):
    return {'schema': 1, 'device_id': 'astro01', 'boot_id': boot, 'calibration_id': 1,
            'sent_at_ms': seq*6000 if sent is None else sent, 'last_command_id': '',
            'baseline': {'ready': False, 'count': 1, 'required': 15, 'hr': None, 'spo2': None},
            'history': [{'seq': seq, 't_ms': seq*6000, 'hr': 72, 'spo2': 98, 'valid': True,
                         'quality': 'good', 'state': 'CALIBRATING', 'alert': 'NORMAL', 'hr_elevated': False}]}


class StorageTests(unittest.TestCase):
    def setUp(self):
        self.store = Store(':memory:')

    def tearDown(self):
        self.store.db.close()

    def test_deduplicated_windows_and_out_of_order(self):
        first=packet()
        second=packet(2)
        second['history'].insert(0, first['history'][0])
        self.assertTrue(self.store.ingest(first, 100))
        self.assertTrue(self.store.ingest(second, 106))
        self.assertFalse(self.store.ingest(second, 120))
        self.assertFalse(self.store.ingest(first, 122))
        self.assertEqual(len(self.store.readings('astro01')), 2)
        self.assertFalse(self.store.snapshot('astro01', 125)['fresh'])

    def test_reboot_and_old_packet(self):
        self.store.ingest(packet(10), 100)
        self.assertTrue(self.store.ingest(packet(1, 'b'*16), 106))
        self.assertFalse(self.store.ingest(packet(11), 112))
        self.assertEqual(self.store.snapshot('astro01', 112)['packet']['boot_id'], 'b'*16)

    def test_sample_age_includes_waiting_on_esp32(self):
        self.store.ingest(packet(1, sent=36000), 100)
        self.assertFalse(self.store.snapshot('astro01', 100)['fresh'])
        self.assertEqual(self.store.readings('astro01')[0]['sample_time_estimate'], 70)

    def test_persistence(self):
        with tempfile.TemporaryDirectory() as d:
            one=Store(d+'/data.sqlite3'); one.ingest(packet(), 100); one.db.close()
            two=Store(d+'/data.sqlite3')
            self.assertEqual(len(two.readings('astro01')), 1)
            self.assertEqual(two.snapshot('astro01', 110)['packet'], packet())
            two.db.close()

    def test_schema_rejects_invalid_data(self):
        Packet.model_validate(packet())
        for update in [{'hr': None}, {'spo2': 101}, {'valid': False}, {'state': 'FAKE'}]:
            p=packet(); p['history'][0].update(update)
            with self.assertRaises(ValueError): Packet.model_validate(p)
        p=packet(); p['sent_at_ms']=0
        with self.assertRaises(ValueError): Packet.model_validate(p)

    def test_invalid_readings_preserved(self):
        p=packet(); p['history'][0].update(valid=False, hr=None, spo2=None, state='NO_SIGNAL', quality='algorithm_invalid')
        Packet.model_validate(p); self.store.ingest(p, 100)
        self.assertIsNone(self.store.readings('astro01')[0]['data']['hr'])

    def test_no_baseline_recalculation(self):
        p=packet(); p['baseline'].update(ready=True, count=15, hr=73.25, spo2=97.8)
        p['history'][0].update(state='CRITICAL', alert='CRITICAL')
        self.store.ingest(p, 100)
        result=self.store.snapshot('astro01', 100)['packet']
        self.assertEqual(result['baseline'], p['baseline'])
        self.assertEqual(result['history'][0]['alert'], 'CRITICAL')

    def test_calibration_history_survives_restart(self):
        p=packet(); p['baseline'].update(ready=True, count=15, hr=72.0, spo2=98.0)
        self.store.ingest(p, 100)
        new=packet(2); new['calibration_id']=2
        self.store.ingest(new, 106)
        sessions=self.store.calibrations('astro01')
        self.assertEqual(len(sessions), 2)
        self.assertEqual(sessions[1]['baseline']['hr'], 72.0)


if __name__ == '__main__': unittest.main()
