import test from 'node:test';
import assert from 'node:assert/strict';
import { getFavoriteTasks, getTaskFavoriteStorageKey, toggleFavoriteTaskId } from './taskFavorites.js';

const tasks = [
  { id: 1, title: 'A', status: 'open', reward: 10 },
  { id: 2, title: 'B', status: 'accepted', reward: 20 },
  { id: 3, title: 'C', status: 'completed', reward: 30 },
];

test('builds a user-scoped favorite storage key', () => {
  assert.equal(getTaskFavoriteStorageKey('student001'), 'campus-task-favorites:student001');
});

test('toggles task ids without duplicates', () => {
  assert.deepEqual(toggleFavoriteTaskId([1, 2], 3), [1, 2, 3]);
  assert.deepEqual(toggleFavoriteTaskId([1, 2, 2], 2), [1]);
});

test('returns current task records for favorited ids only', () => {
  const result = getFavoriteTasks(tasks, [3, 1, 99]);

  assert.deepEqual(result.map((task) => task.id), [3, 1]);
  assert.equal(result[1].status, 'open');
});
