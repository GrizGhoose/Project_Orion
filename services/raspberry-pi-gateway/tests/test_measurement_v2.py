import json
import unittest
from types import SimpleNamespace

from models import Packet
import test_api
from test_storage import packet


def packet_v2():
    p = packet()
    p['schema'] = 2
    p['history'][0].update(hr_valid=True, spo2_valid=False, valid=False, spo2=None,
        acquisition='ok', hr_quality='accepted', spo2_quality='unstable_ratio',
        quality='partial', state='PARTIAL_SIGNAL')
    return p


class MeasurementV2Tests(unittest.TestCase):
    def test_partial_metric_is_preserved(self):
        p = packet_v2()
        self.assertEqual(Packet.model_validate(p).model_dump(by_alias=True), p)

    def test_inconsistent_validity_or_schema_rejected(self):
        for updates in ({'hr': None}, {'spo2_valid': True}, {'valid': True},
                        {'state': 'NORMAL'}, {'hr_quality': 'weak_signal'},
                        {'acquisition': 'i2c_error'}, {'quality': 'accepted'}):
            p = packet_v2()
            p['history'][0].update(updates)
            with self.assertRaises(ValueError):
                Packet.model_validate(p)
        p = packet_v2(); p['schema'] = 1
        with self.assertRaises(ValueError):
            Packet.model_validate(p)
        p = packet(); p['schema'] = 2
        with self.assertRaises(ValueError):
            Packet.model_validate(p)

    def test_acquisition_and_rejection_are_distinct(self):
        p = packet_v2(); r = p['history'][0]
        r.update(hr=None, hr_valid=False, hr_quality='unstable_signal',
                 quality='rejected', state='MEASUREMENT_REJECTED', alert='CRITICAL')
        Packet.model_validate(p)  # Prior alert preserved, not a current oxygen result.
        r.update(acquisition='i2c_error', hr_quality='not_evaluated',
                 spo2_quality='not_evaluated', quality='not_evaluated', state='ACQUISITION_ERROR')
        Packet.model_validate(p)
        r['state'] = 'MEASUREMENT_REJECTED'
        with self.assertRaises(ValueError):
            Packet.model_validate(p)

    def test_oxygen_alert_does_not_require_hr(self):
        p = packet_v2()
        p['history'][0].update(hr=None, hr_valid=False, hr_quality='out_of_range',
            spo2=80, spo2_valid=True, spo2_quality='accepted', alert='CRITICAL', state='CRITICAL')
        Packet.model_validate(p)

    def test_full_history_fits_mqtt_budget(self):
        p = packet_v2()
        row = p['history'][0]
        p['history'] = [dict(row, seq=i, t_ms=i*6000) for i in range(1, 16)]
        p['sent_at_ms'] = 90000
        Packet.model_validate(p)
        self.assertLess(len(json.dumps(p).encode()) + 100, 12288)


class MeasurementV2ApiTests(unittest.TestCase):
    setUp = test_api.ApiTests.setUp
    tearDown = test_api.ApiTests.tearDown

    def test_v2_ingestion_retains_partial_reading(self):
        import app as gateway
        p = packet_v2()
        gateway.on_message(None, None, SimpleNamespace(retain=False,
            payload=json.dumps(p).encode(), topic='eva/astro01/telemetry'))
        result = self.client.get('/api/devices/astro01').json()
        self.assertEqual(result['packet'], p)
        saved = self.client.get('/api/devices/astro01/readings').json()['readings'][0]['data']
        self.assertEqual(saved['hr'], 72)
        self.assertIsNone(saved['spo2'])
        self.assertEqual(saved['spo2_quality'], 'unstable_ratio')
