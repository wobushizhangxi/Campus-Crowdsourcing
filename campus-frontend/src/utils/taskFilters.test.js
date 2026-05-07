import test from 'node:test';
import assert from 'node:assert/strict';
import { filterAndSortOpenTasks, getTaskCategories } from './taskFilters.js';

const tasks = [
  {
    id: 1,
    title: '帮取快递',
    description: '菜鸟驿站小件',
    status: 'open',
    category: '快递代取',
    reward: 6,
    deadlineAt: '2026-04-29T09:30:00',
  },
  {
    id: 2,
    title: 'PPT 排版',
    description: '课程展示需要统一版式',
    status: 'open',
    category: '学习资料',
    reward: 30,
    deadlineAt: '2026-04-28T22:00:00',
  },
  {
    id: 3,
    title: '修电脑网络',
    description: '宿舍网络连不上',
    status: 'accepted',
    category: '技术帮助',
    reward: 20,
    deadlineAt: '2026-04-28T20:00:00',
  },
];

test('filters open tasks by keyword in title or description', () => {
  const result = filterAndSortOpenTasks(tasks, {
    keyword: '课程',
    category: '全部',
    sortBy: 'latest',
  });

  assert.deepEqual(result.map((task) => task.id), [2]);
});

test('filters open tasks by category and sorts by highest reward', () => {
  const result = filterAndSortOpenTasks(tasks, {
    keyword: '',
    category: '快递代取',
    sortBy: 'reward',
  });

  assert.deepEqual(result.map((task) => task.id), [1]);
});

test('returns task categories with the all option first', () => {
  assert.deepEqual(getTaskCategories(tasks), ['全部', '快递代取', '学习资料']);
});
