import test from 'node:test';
import assert from 'node:assert/strict';
import { clampAvatarZoom, getCenteredAvatarCrop, isSupportedAvatarDataUrl } from './avatarUtils.js';

test('calculates centered square crop from image dimensions and zoom', () => {
  assert.deepEqual(getCenteredAvatarCrop(400, 200, 2), {
    sx: 150,
    sy: 50,
    size: 100,
  });
});

test('clamps avatar zoom to the supported editor range', () => {
  assert.equal(clampAvatarZoom(0.5), 1);
  assert.equal(clampAvatarZoom(2.25), 2.25);
  assert.equal(clampAvatarZoom(5), 3);
});

test('accepts only image data urls supported by the backend', () => {
  assert.equal(isSupportedAvatarDataUrl('data:image/png;base64,AAAA'), true);
  assert.equal(isSupportedAvatarDataUrl('data:image/webp;base64,AAAA'), true);
  assert.equal(isSupportedAvatarDataUrl('data:text/plain;base64,AAAA'), false);
});
