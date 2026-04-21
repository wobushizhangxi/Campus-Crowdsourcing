import { readFileSync, existsSync } from 'node:fs';

const root = new URL('..', import.meta.url);
const appSource = readFileSync(new URL('./src/App.jsx', root), 'utf8');
const messagesViewSource = readFileSync(new URL('./src/components/pages/MessagesView.jsx', root), 'utf8');
const chatOverlaySource = readFileSync(new URL('./src/components/overlays/ChatOverlay.jsx', root), 'utf8');
const chatPanelPath = new URL('./src/components/chat/ChatPanel.jsx', root);
const chatPanelSource = existsSync(chatPanelPath) ? readFileSync(chatPanelPath, 'utf8') : '';
const bottomNavSource = readFileSync(new URL('./src/components/layout/BottomNav.jsx', root), 'utf8');
const appHeaderSource = readFileSync(new URL('./src/components/layout/AppHeader.jsx', root), 'utf8');
const sidebarPath = new URL('./src/components/layout/SidebarNav.jsx', root);
const sidebarSource = existsSync(sidebarPath) ? readFileSync(sidebarPath, 'utf8') : '';

const checks = [
  {
    description: 'App.jsx contains the md sidebar grid columns',
    passed: appSource.includes('md:grid-cols-[88px_minmax(0,1fr)]'),
  },
  {
    description: 'App.jsx contains the xl sidebar grid columns',
    passed: appSource.includes('xl:grid-cols-[260px_minmax(0,1fr)]'),
  },
  {
    description: 'MessagesView.jsx contains the desktop chat workspace columns',
    passed: messagesViewSource.includes('xl:grid-cols-[380px_minmax(0,1fr)]'),
  },
  {
    description: 'MessagesView.jsx renders the shared chat panel',
    passed: messagesViewSource.includes('<ChatPanel'),
  },
  {
    description: 'ChatPanel.jsx exists and defaults to the inline variant',
    passed: existsSync(chatPanelPath) && chatPanelSource.includes("variant = 'inline'"),
  },
  {
    description: 'ChatOverlay.jsx renders the shared chat panel',
    passed: chatOverlaySource.includes('<ChatPanel'),
  },
  {
    description: 'ChatPanel.jsx carries the wider overlay sizing',
    passed: chatPanelSource.includes('sm:max-w-3xl') && chatPanelSource.includes('xl:max-w-5xl'),
  },
  {
    description: 'App.jsx contains the shell max width',
    passed: appSource.includes('max-w-[1600px]'),
  },
  {
    description: 'App.jsx renders the sidebar navigation',
    passed: appSource.includes('<SidebarNav'),
  },
  {
    description: 'BottomNav.jsx is mobile-only',
    passed: bottomNavSource.includes('md:hidden'),
  },
  {
    description: 'AppHeader.jsx supports desktop wrapping and padding',
    passed: appHeaderSource.includes('lg:flex-row') && appHeaderSource.includes('xl:px-8'),
  },
  {
    description: 'SidebarNav.jsx exists and tracks unread and active state',
    passed: existsSync(sidebarPath) && sidebarSource.includes('hasUnreadMessages') && sidebarSource.includes('activeTab'),
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
