import test from 'node:test';
import assert from 'node:assert/strict';

import { buildApiRequestHeaders } from './apiHeaders.js';

test('omits saved auth tokens for auth entrypoint requests', () => {
  assert.deepEqual(
    buildApiRequestHeaders({
      path: '/api/auth/login',
      token: 'stale-token',
      headers: {},
    }),
    {},
  );

  assert.deepEqual(
    buildApiRequestHeaders({
      path: '/api/auth/register',
      token: 'stale-token',
      headers: {},
    }),
    {},
  );
});

test('adds saved auth tokens for protected api requests', () => {
  assert.deepEqual(
    buildApiRequestHeaders({
      path: '/api/tasks',
      token: 'fresh-token',
      headers: {},
    }),
    {
      Authorization: 'Bearer fresh-token',
    },
  );
});
