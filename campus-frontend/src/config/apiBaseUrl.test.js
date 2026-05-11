import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeApiBaseUrl,
  readSavedApiBaseUrl,
  requireConfiguredApiBaseUrl,
  resolveApiBaseUrlCandidates,
  writeSavedApiBaseUrl,
} from './apiBaseUrl.js';

const createStorage = () => {
  const values = new Map();

  return {
    getItem: (key) => values.get(key) ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
};

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

test('resolves saved urls before bundled configured urls', () => {
  assert.deepEqual(
    resolveApiBaseUrlCandidates({
      configuredApiBaseUrl: 'https://bundled.example.test/',
      savedApiBaseUrl: ' http://192.168.1.25:8080/ ',
    }),
    ['http://192.168.1.25:8080'],
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

test('stores normalized runtime api base urls', () => {
  const storage = createStorage();

  assert.equal(
    writeSavedApiBaseUrl(' http://192.168.1.25:8080/ ', storage),
    'http://192.168.1.25:8080',
  );
  assert.equal(readSavedApiBaseUrl(storage), 'http://192.168.1.25:8080');

  assert.equal(writeSavedApiBaseUrl('', storage), '');
  assert.equal(readSavedApiBaseUrl(storage), '');
});
