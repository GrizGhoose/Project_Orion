import json
import unittest
from types import SimpleNamespace

from models import Packet
from storage import Store
import test_api
from test_measurement_v2 import packet_v2


def packet_v3(last_seq=90):
    p = packet_v2()
    p['schema'] = 3
    row = p['history'][0]
    p['history'] = [dict(row, seq=i, t_ms=i*1000) for i in range(max(1, last_seq-89), last_seq+1)]
    p['sent_at_ms'] = last_seq*1000
    return p


class MeasurementV3Tests(unittest.TestCase):
    def test_full_window_and_payload_size(self):
        p = packet_v3()
        self.assertEqual(Packet.model_validate(p).model_dump(by_alias=True), p)
        self.assertLess(len(json.dumps(p).encode()), 48000)
        # Long diagnostics and maximum MCU identifier/uptime sizes still fit serializer reserve.
        p['device_id'] = 'a'*32
        p['last_command_id'] = 'b'*64
        start = 2**64-100000
        for i, row in enumerate(p['history']):
            row.update(seq=2**32-100+i, t_ms=start+i*1000, hr=None, hr_valid=False,
                       hr_quality='inconsistent_pulses', spo2_quality='channel_disagreement',
                       state='MEASUREMENT_REJECTED', quality='rejected')
        p['sent_at_ms'] = p['history'][-1]['t_ms']
        Packet.model_validate(p)
        self.assertLess(len(json.dumps(p).encode()), 48000)

    def test_wrong_history_length_or_age_rejected(self):
        p = packet_v3(); p['schema'] = 2
        with self.assertRaises(ValueError): Packet.model_validate(p)
        p = packet_v3(); p['history'].insert(0, dict(p['history'][0], seq=0, t_ms=0))
        with self.assertRaises(ValueError): Packet.model_validate(p)
        p = packet_v3(); p['history'][-1]['t_ms'] += 1000; p['sent_at_ms'] += 1000
        with self.assertRaises(ValueError): Packet.model_validate(p)

    def test_overlap_deduplicates_and_old_archive_is_retained(self):
        store = Store(':memory:')
        self.addCleanup(store.db.close)
        store.ingest(packet_v3(90), 100)
        store.ingest(packet_v3(91), 101)
        self.assertEqual(len(store.readings('astro01')), 91)
        self.assertEqual(len(store.snapshot('astro01', 101)['packet']['history']), 90)
        self.assertEqual(store.snapshot('astro01', 101)['packet']['history'][0]['seq'], 2)

    def test_freshness_uses_one_second_cadence_and_queued_sample_age(self):
        store = Store(':memory:')
        self.addCleanup(store.db.close)
        store.ingest(packet_v3(), 100)
        self.assertTrue(store.snapshot('astro01', 102.9)['fresh'])
        self.assertFalse(store.snapshot('astro01', 103)['fresh'])
        p = packet_v3(91); p['sent_at_ms'] += 3000
        store.ingest(p, 104)
        self.assertFalse(store.snapshot('astro01', 104)['fresh'])


class MeasurementV3ApiTests(unittest.TestCase):
    setUp = test_api.ApiTests.setUp
    tearDown = test_api.ApiTests.tearDown

    def test_large_packet_reaches_hud_and_database(self):
        import app as gateway
        p = packet_v3()
        body = json.dumps(p).encode()
        self.assertGreater(len(body), 12288)
        gateway.on_message(None, None, SimpleNamespace(retain=False, payload=body, topic='eva/astro01/telemetry'))
        result = self.client.get('/api/devices/astro01').json()
        self.assertEqual(result['packet'], p)
        self.assertTrue(result['fresh'])
        self.assertEqual(len(self.client.get('/api/devices/astro01/readings').json()['readings']), 90)
