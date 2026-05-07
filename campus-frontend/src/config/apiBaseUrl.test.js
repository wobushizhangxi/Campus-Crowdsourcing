import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeApiBaseUrl,
  requireConfiguredApiBaseUrl,
  resolveApiBaseUrlCandidates,
} from './apiBaseUrl.js';

test('normalizes api base urls', () => {
  assert.equal(normalizeApiBaseUrl(' http://127.0.0.1:8080/ '), 'http://127.0.0.1:8080');
});

test('requires an explicit api base url for android builds', () => {
  assert.equal(
    requireConfiguredApiBaseUrl(' https://example.com/api/ '),
    'https://example.com/api',
  );
  assert.throws(
    () => requireConfiguredApiBaseUrl(''),
    /VITE_API_BASE_URL is required for Android builds/,
  );
});

test('resolves configured urls before development fallbacks', () => {
  assert.deepEqual(
    resolveApiBaseUrlCandidates({
      configuredApiBaseUrl: 'https://api.example.test/',
      isDev: true,
    }),
    ['https://api.example.test'],
  );
});

test('uses same-origin api requests when no url is configured', () => {
  assert.deepEqual(
    resolveApiBaseUrlCandidates({
      configuredApiBaseUrl: '',
      isDev: true,
    }),
    [''],
  );
});
