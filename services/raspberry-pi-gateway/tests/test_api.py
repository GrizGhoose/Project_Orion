import os
import unittest
from types import SimpleNamespace
from unittest.mock import patch
from fastapi.testclient import TestClient

os.environ['EVA_DB'] = ':memory:'
import app as gateway
from storage import Store
from test_storage import packet


class ApiTests(unittest.TestCase):
    def setUp(self):
        gateway.store.db.close()
        gateway.store = Store(':memory:')
        gateway.broker_connected = True
        self.client = TestClient(gateway.app)  # No lifespan: do not connect to a real broker.

    def tearDown(self):
        self.client.close()

    def test_serves_built_hud(self):
        if not gateway.DIST.is_dir():
            self.skipTest('Build HUD first to test static serving')
        response=self.client.get('/')
        self.assertEqual(response.status_code, 200)
        self.assertIn('id="root"', response.text)

    def test_ingest_to_hud_api_and_database(self):
        import json
        p=packet()
        gateway.on_message(None, None, SimpleNamespace(retain=False, payload=json.dumps(p).encode(), topic='eva/astro01/telemetry'))
        result=self.client.get('/api/devices/astro01').json()
        self.assertEqual(result['packet'], p)
        self.assertTrue(result['fresh'])
        self.assertEqual(len(self.client.get('/api/devices/astro01/readings').json()['readings']), 1)

    def test_retained_and_wrong_topic_ignored(self):
        import json
        body=json.dumps(packet()).encode()
        gateway.on_message(None, None, SimpleNamespace(retain=True, payload=body, topic='eva/astro01/telemetry'))
        gateway.on_message(None, None, SimpleNamespace(retain=False, payload=body, topic='eva/astro02/telemetry'))
        self.assertIsNone(self.client.get('/api/devices/astro01').json()['packet'])

    def test_restart_is_pending_until_device_ack(self):
        gateway.store.ingest(packet())
        with patch.object(gateway.client, 'publish', return_value=SimpleNamespace(rc=0)) as publish:
            result=self.client.post('/api/devices/astro01/baseline/restart')
        self.assertEqual(result.status_code, 202)
        command=result.json()['command_id']
        publish.assert_called_once_with('eva/astro01/command', 'restart:'+command, qos=1, retain=False)
        self.assertEqual(gateway.store.snapshot('astro01')['packet']['last_command_id'], '')
        p=packet(2); p.update(last_command_id=command, calibration_id=2)
        gateway.store.ingest(p)
        self.assertEqual(self.client.get('/api/devices/astro01').json()['packet']['last_command_id'], command)

    def test_restart_requires_live_device(self):
        self.assertEqual(self.client.post('/api/devices/astro01/baseline/restart').status_code, 409)
        gateway.store.ingest(packet(), received=1)
        self.assertEqual(self.client.post('/api/devices/astro01/baseline/restart').status_code, 409)

    def test_limits(self):
        self.assertEqual(self.client.get('/api/devices/astro01/readings?limit=1001').status_code, 422)
