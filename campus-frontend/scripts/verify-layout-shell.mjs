import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url);
const appSource = readFileSync(new URL('./src/App.jsx', root), 'utf8');
const navSource = readFileSync(new URL('./src/components/layout/BottomNav.jsx', root), 'utf8');
const profileSource = readFileSync(new URL('./src/components/pages/ProfileView.jsx', root), 'utf8');

const checks = [
  {
    description: 'main app shell stays mobile-sized',
    passed: appSource.includes('max-w-md'),
  },
  {
    description: 'admin view is rendered in a dedicated screen branch',
    passed: appSource.includes('const isAdminScreenActive = profileSection === \'admin\''),
  },
  {
    description: 'default bottom navigation remains mobile-sized',
    passed: navSource.includes('max-w-md'),
  },
  {
    description: 'profile still exposes a dedicated admin entry',
    passed: profileSource.includes('onOpenAdmin'),
  },
];

const failedChecks = checks.filter((check) => !check.passed);

if (failedChecks.length > 0) {
  console.error('Layout shell verification failed:');
  for (const check of failedChecks) {
    console.error(`- ${check.description}`);
  }
  process.exit(1);
}

console.log('Layout shell verification passed.');
