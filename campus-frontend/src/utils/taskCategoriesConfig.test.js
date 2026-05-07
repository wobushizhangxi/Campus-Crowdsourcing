import test from 'node:test';
import assert from 'node:assert/strict';
import { getTaskCategories } from './taskFilters.js';

test('configured categories are included before task-derived categories', () => {
  const tasks = [
    { id: 1, status: 'open', category: '快递代取' },
    { id: 2, status: 'open', category: '学习资料' },
  ];

  assert.deepEqual(getTaskCategories(tasks, ['跑腿代办', '学习资料']), [
    '全部',
    '跑腿代办',
    '学习资料',
    '快递代取',
  ]);
});
