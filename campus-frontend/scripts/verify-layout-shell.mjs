import { readFileSync, existsSync } from 'node:fs';

const root = new URL('..', import.meta.url);
const appSource = readFileSync(new URL('./src/App.jsx', root), 'utf8');
const useChatSource = readFileSync(new URL('./src/hooks/useChat.js', root), 'utf8');
const messagesViewSource = readFileSync(new URL('./src/components/pages/MessagesView.jsx', root), 'utf8');
const homeViewSource = readFileSync(new URL('./src/components/pages/HomeView.jsx', root), 'utf8');
const ordersViewSource = readFileSync(new URL('./src/components/pages/OrdersView.jsx', root), 'utf8');
const postTaskViewSource = readFileSync(new URL('./src/components/pages/PostTaskView.jsx', root), 'utf8');
const profileViewSource = readFileSync(new URL('./src/components/pages/ProfileView.jsx', root), 'utf8');
const walletViewSource = readFileSync(new URL('./src/components/pages/WalletView.jsx', root), 'utf8');
const historyViewSource = readFileSync(new URL('./src/components/pages/HistoryView.jsx', root), 'utf8');
const adminViewSource = readFileSync(new URL('./src/components/pages/AdminView.jsx', root), 'utf8');
const authScreenSource = readFileSync(new URL('./src/components/AuthScreen.jsx', root), 'utf8');
const chatOverlaySource = readFileSync(new URL('./src/components/overlays/ChatOverlay.jsx', root), 'utf8');
const chatPanelPath = new URL('./src/components/chat/ChatPanel.jsx', root);
const chatPanelSource = existsSync(chatPanelPath) ? readFileSync(chatPanelPath, 'utf8') : '';
const bottomNavSource = readFileSync(new URL('./src/components/layout/BottomNav.jsx', root), 'utf8');
const appHeaderSource = readFileSync(new URL('./src/components/layout/AppHeader.jsx', root), 'utf8');
const sidebarPath = new URL('./src/components/layout/SidebarNav.jsx', root);
const sidebarSource = existsSync(sidebarPath) ? readFileSync(sidebarPath, 'utf8') : '';

const countOccurrences = (source, needle) => source.split(needle).length - 1;

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
    description: 'App.jsx initializes desktop messages workspace synchronously from matchMedia',
    passed:
      appSource.includes("useState(() =>") &&
      appSource.includes("typeof window !== 'undefined' && window.matchMedia('(min-width: 1280px)').matches"),
  },
  {
    description: 'App.jsx closes desktop messages chat when leaving the messages tab',
    passed:
      appSource.includes("if (activeTab === 'messages' && isDesktopMessagesWorkspace && tabId !== 'messages') {") &&
      appSource.includes('closeChat();'),
  },
  {
    description: 'App.jsx clears chat state when the session expires',
    passed: appSource.includes('resetChatState();') && appSource.includes('const handleSessionExpired = () => {'),
  },
  {
    description: 'useChat.js resets scroll state when opening a conversation',
    passed:
      useChatSource.includes('isChatPinnedToBottomRef.current = true;') &&
      useChatSource.includes('lastActiveChatTaskIdRef') &&
      useChatSource.includes('isConversationSwitch') &&
      useChatSource.includes('lastActiveChatTaskIdRef.current = null;'),
  },
  {
    description: 'MessagesView.jsx contains the desktop chat workspace columns',
    passed: messagesViewSource.includes('xl:grid-cols-[380px_minmax(0,1fr)]'),
  },
  {
    description: 'HomeView.jsx keeps selected task scoped to openTasks',
    passed:
      homeViewSource.includes('xl:grid-cols-[minmax(0,1.15fr)_380px]') &&
      homeViewSource.includes('const currentSelectedTask = selectedTaskId ? openTasks.find((task) => task.id === selectedTaskId) || null : null;') &&
      homeViewSource.includes('if (selectedTaskId && !currentSelectedTask)') &&
      homeViewSource.includes('setSelectedTask(null);') &&
      homeViewSource.includes('type="button"') &&
      homeViewSource.includes('aria-pressed={desktopSelectedTask?.id === task.id}') &&
      homeViewSource.includes('focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2') &&
      homeViewSource.includes('xl:sticky xl:top-5'),
  },
  {
    description: 'OrdersView.jsx contains the safe desktop order selector structure',
    passed:
      ordersViewSource.includes('selectedOrderId') &&
      ordersViewSource.includes('xl:grid-cols-[minmax(0,1fr)_340px]') &&
      ordersViewSource.includes('className={`rounded-3xl border bg-white p-5 text-sm text-slate-700 shadow-sm transition ${') &&
      ordersViewSource.includes('className={`w-full rounded-2xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 ${') &&
      ordersViewSource.includes('type="button"') &&
      ordersViewSource.includes('aria-pressed={selectedOrder?.id === task.id}') &&
      ordersViewSource.includes('setSelectedOrderId(task.id)') &&
      ordersViewSource.includes('className="mt-4 flex justify-end gap-2 border-t border-slate-200 pt-3"') &&
      ordersViewSource.includes('handleCompleteTask(task.id, event)') &&
      ordersViewSource.includes('openChat(task)'),
  },
  {
    description: 'OrdersView.jsx keeps readable Chinese copy in mobile and desktop branches',
    passed:
      countOccurrences(ordersViewSource, '\u8ba2\u5355\u603b\u89c8') === 2 &&
      countOccurrences(ordersViewSource, '\u5728\u8fd9\u91cc\u67e5\u770b\u4f60\u53d1\u5e03\u7684\u4efb\u52a1\u548c\u5df2\u63a5\u53d6\u7684\u4efb\u52a1\u3002') === 2 &&
      countOccurrences(ordersViewSource, '\u6211\u53d1\u5e03\u7684') === 2 &&
      countOccurrences(ordersViewSource, '\u6211\u63a5\u53d6\u7684') === 2 &&
      countOccurrences(ordersViewSource, '\u5f53\u524d\u5217\u8868\u91cc\u8fd8\u6ca1\u6709\u4efb\u52a1\u3002') === 2 &&
      countOccurrences(ordersViewSource, '\u72b6\u6001\uff1a{getOrderStatusLabel(') === 3 &&
      countOccurrences(ordersViewSource, '\u8d4f\u91d1\uff1a') === 3 &&
      countOccurrences(ordersViewSource, '\u6807\u8bb0\u5b8c\u6210') === 3 &&
      countOccurrences(ordersViewSource, '\u6253\u5f00\u804a\u5929') === 3 &&
      countOccurrences(ordersViewSource, '\u5f53\u524d\u9009\u4e2d') === 1 &&
      countOccurrences(ordersViewSource, '\u4efb\u52a1\u7f16\u53f7') === 1 &&
      countOccurrences(ordersViewSource, '\u4efb\u52a1\u8bf4\u660e') === 2 &&
      countOccurrences(ordersViewSource, '\u6682\u65e0\u8865\u5145\u8bf4\u660e\u3002') === 1 &&
      countOccurrences(ordersViewSource, '\u4efb\u52a1\u4fe1\u606f') === 1 &&
      countOccurrences(ordersViewSource, '\u53d1\u5e03\u8005') === 1 &&
      countOccurrences(ordersViewSource, '\u533f\u540d\u7528\u6237') === 1 &&
      countOccurrences(ordersViewSource, '\u63a5\u5355\u4eba') === 1 &&
      countOccurrences(ordersViewSource, '\u5c1a\u672a\u63a5\u5355') === 1 &&
      countOccurrences(ordersViewSource, '\u8ba2\u5355\u8be6\u60c5') === 1 &&
      countOccurrences(
        ordersViewSource,
        '\u4ece\u5de6\u4fa7\u9009\u62e9\u4e00\u4e2a\u8ba2\u5355'
      ) === 1 &&
      countOccurrences(
        ordersViewSource,
        '\u8fd9\u91cc\u4f1a\u663e\u793a\u4efb\u52a1\u8bf4\u660e\u3001\u72b6\u6001\u548c\u53ef\u6267\u884c\u64cd\u4f5c\u3002\u4f60\u53ef\u4ee5\u7ee7\u7eed\u5728\u5de6\u4fa7\u5207\u6362\u5217\u8868\u3002'
      ) === 1 &&
      ordersViewSource.includes("return '\u5f85\u63a5\u5355';") &&
      ordersViewSource.includes("return '\u8fdb\u884c\u4e2d';") &&
      ordersViewSource.includes("return '\u5df2\u5b8c\u6210';") &&
      ordersViewSource.includes("return status || '\u672a\u77e5';"),
  },
  {
    description: 'PostTaskView.jsx contains the desktop workflow grid columns',
    passed: postTaskViewSource.includes('xl:grid-cols-[minmax(0,1fr)_360px]'),
  },
  {
    description: 'ProfileView.jsx contains the desktop account grid columns',
    passed: profileViewSource.includes('xl:grid-cols-[320px_minmax(0,1fr)]'),
  },
  {
    description: 'WalletView.jsx contains the desktop wallet grid columns',
    passed:
      walletViewSource.includes('xl:grid-cols-[minmax(0,1fr)_320px]') &&
      walletViewSource.includes('xl:order-2') &&
      walletViewSource.includes('xl:order-1') &&
      walletViewSource.includes('\\u6211\\u7684\\u94b1\\u5305') &&
      walletViewSource.indexOf('<aside') < walletViewSource.indexOf('walletRecords.map(') &&
      walletViewSource.indexOf('<aside') < walletViewSource.indexOf('xl:order-1'),
  },
  {
    description: 'HistoryView.jsx contains the desktop history grid columns',
    passed:
      historyViewSource.includes('xl:grid-cols-[minmax(0,1fr)_320px]') &&
      historyViewSource.includes('xl:order-2') &&
      historyViewSource.includes('xl:order-1') &&
      historyViewSource.includes('\\u5386\\u53f2\\u8bb0\\u5f55') &&
      historyViewSource.indexOf('<aside') < historyViewSource.indexOf('completedHistoryTasks.map(') &&
      historyViewSource.indexOf('<aside') < historyViewSource.indexOf('xl:order-1'),
  },
  {
    description: 'AdminView.jsx contains the 2xl admin grid columns',
    passed: adminViewSource.includes('2xl:grid-cols-[360px_minmax(0,1fr)]'),
  },
  {
    description: 'AuthScreen.jsx contains the large-screen auth split and shell width',
    passed: authScreenSource.includes('lg:grid-cols-[1.05fr_0.95fr]') && authScreenSource.includes('max-w-[1280px]'),
  },
  {
    description: 'MessagesView.jsx renders the shared chat panel',
    passed: messagesViewSource.includes('<ChatPanel'),
  },
  {
    description: 'MessagesView.jsx exposes the selected conversation state',
    passed: messagesViewSource.includes('aria-pressed={isSelectedConversation}') && messagesViewSource.includes('ACTIVE_CONVERSATION_LABEL'),
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
    description: 'ChatOverlay.jsx exposes modal semantics, Escape handling, and focus trap',
    passed:
      chatOverlaySource.includes('role="dialog"') &&
      chatOverlaySource.includes('aria-modal="true"') &&
      chatOverlaySource.includes("event.key === 'Escape'") &&
      chatOverlaySource.includes("event.key !== 'Tab'") &&
      chatOverlaySource.includes('focusin') &&
      chatOverlaySource.includes('FOCUSABLE_SELECTOR'),
  },
  {
    description: 'ChatPanel.jsx carries the wider overlay sizing',
    passed: chatPanelSource.includes('sm:max-w-3xl') && chatPanelSource.includes('xl:max-w-5xl'),
  },
  {
    description: 'ChatPanel.jsx exposes accessible dialog labels and no autoFocus',
    passed:
      chatPanelSource.includes('dialogTitleId') &&
      chatPanelSource.includes('dialogDescriptionId') &&
      !chatPanelSource.includes('autoFocus='),
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
