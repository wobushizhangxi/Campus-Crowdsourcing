import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const testDir = dirname(fileURLToPath(import.meta.url));
const frontendDir = resolve(testDir, '..');

test('keeps primary visible chrome text in Chinese', () => {
  const appHeaderSource = readFileSync(resolve(testDir, 'components/layout/AppHeader.jsx'), 'utf8');
  const sidebarSource = readFileSync(resolve(testDir, 'components/layout/SidebarNav.jsx'), 'utf8');
  const avatarUtilsSource = readFileSync(resolve(testDir, 'utils/avatarUtils.js'), 'utf8');
  const htmlSource = readFileSync(resolve(frontendDir, 'index.html'), 'utf8');
  const visibleEnglishPatterns = [
    /\|\| 'U'\)/,
    /label: 'Home'/,
    /label: 'Tasks'/,
    /label: 'Post'/,
    /label: 'Messages'/,
    /label: 'Profile'/,
    /'Create a new task'/,
    /'Browse the task feed'/,
    /'Track assigned work'/,
    /'Review unread conversations'/,
    /'Manage your profile'/,
    /'Unable to read image'/,
    /'Unsupported avatar image'/,
    /'Canvas is unavailable'/,
    /'Unable to load image'/,
    />Campus</,
    /\|\| 'User'/,
    /<title>campus-frontend<\/title>/,
    /lang="en"/,
  ];

  for (const pattern of visibleEnglishPatterns) {
    assert.equal(
      pattern.test(appHeaderSource) ||
        pattern.test(sidebarSource) ||
        pattern.test(avatarUtilsSource) ||
        pattern.test(htmlSource),
      false,
      String(pattern),
    );
  }
});
