import { test } from 'node:test';
import assert from 'node:assert/strict';
import { allowGetReset } from './resetAccess.mjs';

const request = (headers = {}, remoteAddress = '127.0.0.1') => ({ socket: { remoteAddress }, headers: { host: 'localhost:8080', ...headers } });

test('GET reset permits direct loopback navigation only outside production', () => {
  assert.equal(allowGetReset(request(), 'development'), true);
  assert.equal(allowGetReset(request({ 'sec-fetch-site': 'none' }), 'development'), true);
  assert.equal(allowGetReset(request({ origin: 'http://localhost:8080', referer: 'http://localhost:8080/hud/?sync=1', 'sec-fetch-site': 'same-origin' }), 'development'), true);
  assert.equal(allowGetReset(request({ host: '127.0.0.1:8080' }, '::ffff:127.0.0.1'), 'test'), true);
  assert.equal(allowGetReset(request({ host: '[::1]:8080' }, '::1'), undefined), true);
  assert.equal(allowGetReset(request(), 'production'), false);
});

test('GET reset rejects external, proxied, cross-origin and prefetched requests', () => {
  for (const headers of [
    { host: 'example.com:8080' }, { host: '192.168.1.10:8080' }, { host: 'localhost.evil.test:8080' },
    { host: 'invalid host' }, { host: undefined },
    { origin: 'https://external.example' }, { referer: 'https://external.example/link' },
    { 'sec-fetch-site': 'cross-site' }, { 'sec-fetch-site': 'same-site' },
    { forwarded: 'for=127.0.0.1' }, { 'x-forwarded-for': '127.0.0.1' }, { 'x-forwarded-host': 'localhost' },
    { purpose: 'prefetch' }, { 'sec-purpose': 'prefetch;prerender' },
  ]) assert.equal(allowGetReset(request(headers), 'development'), false, JSON.stringify(headers));
  for (const peer of ['192.168.1.20', '203.0.113.1', '::ffff:192.168.1.20', '::2']) {
    assert.equal(allowGetReset(request({}, peer), 'development'), false, peer);
  }
});
