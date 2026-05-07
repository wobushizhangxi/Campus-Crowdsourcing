# Responsive Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `campus-frontend` into a phone/tablet/desktop responsive app with a shared shell, desktop sidebar navigation, desktop message workspace, and page-level multi-column layouts without changing business logic.

**Architecture:** Keep the current single-page React app and hooks, replace the mobile-width authenticated shell with a shared responsive shell, and progressively adapt page components into tablet/desktop grids. Reuse the current chat state in `useChat`, but move message rendering into a shared `ChatPanel` so both the messages page and the overlay use one conversation surface.

**Tech Stack:** React 19, Vite 8, Tailwind CSS 3, lucide-react, source-based regression checks in `node scripts/verify-layout-shell.mjs`, ESLint.

---

## Prerequisite

- Start from commit `75126d1`.
- Create and use a dedicated worktree rooted at `D:\校园众包平台项目`.

## File Structure

- Create: `campus-frontend/src/components/layout/SidebarNav.jsx`
  - Desktop and tablet left navigation for authenticated screens.
- Create: `campus-frontend/src/components/chat/ChatPanel.jsx`
  - Shared conversation surface for desktop messages and overlay chat.
- Modify: `campus-frontend/src/App.jsx`
  - Shared authenticated shell, width modes, and prop wiring.
- Modify: `campus-frontend/src/components/layout/AppHeader.jsx`
  - Responsive header wrapping and spacing.
- Modify: `campus-frontend/src/components/layout/BottomNav.jsx`
  - Mobile-only bottom navigation.
- Modify: `campus-frontend/src/components/overlays/ChatOverlay.jsx`
  - Thin overlay wrapper around `ChatPanel`.
- Modify: `campus-frontend/src/components/pages/HomeView.jsx`
  - Desktop task master-detail layout.
- Modify: `campus-frontend/src/components/pages/OrdersView.jsx`
  - Desktop list plus selected-order detail pane.
- Modify: `campus-frontend/src/components/pages/PostTaskView.jsx`
  - Form and summary split layout.
- Modify: `campus-frontend/src/components/pages/MessagesView.jsx`
  - Desktop conversation workspace.
- Modify: `campus-frontend/src/components/pages/ProfileView.jsx`
  - Desktop hero/actions plus details/edit split.
- Modify: `campus-frontend/src/components/pages/WalletView.jsx`
  - Records and summary split.
- Modify: `campus-frontend/src/components/pages/HistoryView.jsx`
  - History list and aggregate summary split.
- Modify: `campus-frontend/src/components/pages/AdminView.jsx`
  - Wider internal grid inside the shared shell.
- Modify: `campus-frontend/src/components/AuthScreen.jsx`
  - Larger-screen auth card spacing and split tuning.
- Modify: `campus-frontend/scripts/verify-layout-shell.mjs`
  - Incremental regression checks for shell, chat workspace, and responsive page layouts.

### Task 1: Build the shared responsive shell and desktop sidebar

**Files:**
- Create: `campus-frontend/src/components/layout/SidebarNav.jsx`
- Modify: `campus-frontend/src/App.jsx`
- Modify: `campus-frontend/src/components/layout/AppHeader.jsx`
- Modify: `campus-frontend/src/components/layout/BottomNav.jsx`
- Modify: `campus-frontend/scripts/verify-layout-shell.mjs`

- [ ] **Step 1: Write the failing shell regression checks**

```js
import { existsSync, readFileSync } from 'node:fs';

const root = new URL('..', import.meta.url);
const readSource = (relativePath) => {
  const url = new URL(relativePath, root);
  return existsSync(url) ? readFileSync(url, 'utf8') : '';
};

const appSource = readSource('./src/App.jsx');
const navSource = readSource('./src/components/layout/BottomNav.jsx');
const headerSource = readSource('./src/components/layout/AppHeader.jsx');
const sidebarSource = readSource('./src/components/layout/SidebarNav.jsx');

const checks = [
  {
    description: 'authenticated app shell uses a responsive sidebar grid',
    passed: appSource.includes('md:grid-cols-[88px_minmax(0,1fr)]')
      && appSource.includes('xl:grid-cols-[260px_minmax(0,1fr)]')
      && appSource.includes('max-w-[1600px]'),
  },
  {
    description: 'authenticated app renders SidebarNav',
    passed: appSource.includes('<SidebarNav'),
  },
  {
    description: 'bottom navigation is mobile only',
    passed: navSource.includes('md:hidden'),
  },
  {
    description: 'header supports larger-screen wrapping',
    passed: headerSource.includes('lg:flex-row') && headerSource.includes('xl:px-8'),
  },
  {
    description: 'sidebar navigation component exists',
    passed: sidebarSource.includes('hasUnreadMessages') && sidebarSource.includes('activeTab'),
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
```

- [ ] **Step 2: Run the shell regression script to verify it fails**

Run: `node scripts/verify-layout-shell.mjs`  
Expected: FAIL because `SidebarNav.jsx` does not exist and the app shell still contains the `max-w-md` mobile frame.

- [ ] **Step 3: Implement the shared shell, desktop sidebar, and mobile-only bottom nav**

```jsx
// SidebarNav.jsx
import React from 'react';
import { ClipboardList, Home, MessageSquare, PlusCircle, User } from 'lucide-react';

const navItems = [
  { id: 'home', label: '首页', icon: Home },
  { id: 'tasks', label: '订单', icon: ClipboardList },
  { id: 'post', label: '发布', icon: PlusCircle },
  { id: 'messages', label: '消息', icon: MessageSquare },
  { id: 'profile', label: '我的', icon: User },
];

export default function SidebarNav({ activeTab, currentUser, hasUnreadMessages, onSelectTab }) {
  return (
    <aside className="hidden md:flex md:flex-col md:justify-between md:border-r md:border-slate-200 md:bg-slate-950/[0.03] md:px-3 md:py-6 xl:px-5">
      <div className="space-y-3">
        <div className="rounded-3xl bg-slate-900 px-4 py-5 text-white">
          <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-200">Campus</p>
          <p className="mt-3 text-base font-black xl:text-xl">{currentUser.name || currentUser.studentId}</p>
        </div>
        {navItems.map(({ icon, id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => onSelectTab(id)}
            className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${
              activeTab === id ? 'bg-cyan-50 text-cyan-700' : 'text-slate-500 hover:bg-white hover:text-slate-900'
            }`}
          >
            {React.createElement(icon, { size: 18 })}
            <span className="hidden xl:inline">{label}</span>
            {id === 'messages' && hasUnreadMessages ? <span className="ml-auto h-2.5 w-2.5 rounded-full bg-rose-500" /> : null}
          </button>
        ))}
      </div>
    </aside>
  );
}
```

```jsx
// App.jsx
import SidebarNav from './components/layout/SidebarNav';

const isWideContent = profileSection === 'admin' || activeTab === 'messages';
const contentWidthClassName = isWideContent ? 'max-w-[1480px]' : 'max-w-[1180px]';

return (
  <div className="min-h-screen bg-slate-100 text-slate-900 md:p-4">
    <div className="mx-auto grid min-h-screen w-full max-w-[1600px] bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.16),_transparent_38%),linear-gradient(180deg,_#f8fbff_0%,_#ffffff_24%,_#f8fafc_100%)] md:min-h-[calc(100vh-2rem)] md:grid-cols-[88px_minmax(0,1fr)] md:overflow-hidden md:rounded-[32px] md:shadow-2xl xl:grid-cols-[260px_minmax(0,1fr)]">
      <SidebarNav
        activeTab={activeTab}
        currentUser={currentUser}
        hasUnreadMessages={hasUnreadMessages}
        onSelectTab={handleSelectTab}
      />
      <div className="min-w-0 flex min-h-screen flex-col md:min-h-0">
        <AppHeader
          pageMeta={pageMeta}
          currentUser={currentUser}
          onOpenProfile={() => {
            setActiveTab('profile');
            setProfileSection('overview');
            setSelectedTask(null);
          }}
        />
        <main className="min-h-0 flex-1 overflow-y-auto pb-24 md:pb-0">
          <div className={`mx-auto w-full ${contentWidthClassName}`}>{renderAppContent()}</div>
        </main>
        <BottomNav activeTab={activeTab} hasUnreadMessages={hasUnreadMessages} onSelectTab={handleSelectTab} />
      </div>
    </div>
    <ChatOverlay
      activeChatTask={activeChatTask}
      chatInput={chatInput}
      chatMessages={chatMessages}
      chatPendingNewMessageCount={chatPendingNewMessageCount}
      chatScrollContainerRef={chatScrollContainerRef}
      currentUser={currentUser}
      getConversationTitle={getConversationTitle}
      handleSendMessage={handleSendMessage}
      isSendingMessage={isSendingMessage}
      onChatInputChange={setChatInput}
      onClose={closeChat}
      onScroll={syncChatPinnedState}
      scrollChatToBottom={scrollChatToBottom}
    />
  </div>
);
```

```jsx
// AppHeader.jsx
export default function AppHeader({ pageMeta, currentUser, onOpenProfile }) {
  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/88 px-5 pb-4 pt-5 backdrop-blur-xl md:px-6 xl:px-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.34em] text-cyan-600">{pageMeta.eyebrow}</p>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900 md:text-3xl">{pageMeta.title}</h1>
          <p className="mt-1 max-w-[42rem] text-sm leading-6 text-slate-500">{pageMeta.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={onOpenProfile}
          className="flex w-full items-center gap-3 rounded-2xl border border-white/70 bg-white/90 px-3 py-2 shadow-sm transition hover:border-cyan-100 hover:shadow sm:w-auto"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-600 text-sm font-black text-white">
            {(currentUser.name || currentUser.studentId || 'U').slice(0, 1).toUpperCase()}
          </span>
          <span className="min-w-0 text-left sm:text-right">
            <span className="block text-xs font-bold tracking-[0.2em] text-slate-400">账号</span>
            <span className="block truncate text-sm font-semibold text-slate-700 sm:max-w-[14rem]">
              {currentUser.name || currentUser.studentId || '用户'}
            </span>
          </span>
        </button>
      </div>
    </header>
  );
}
```

```jsx
// BottomNav.jsx
export default function BottomNav({ activeTab, hasUnreadMessages, onSelectTab }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-10 border-t border-slate-200 bg-white/96 px-2 pb-3 pt-2 backdrop-blur-xl md:hidden">
      <div className="mx-auto grid w-full max-w-md grid-cols-5 items-end">
        <NavItem activeTab={activeTab} id="home" icon={Home} label="首页" onSelect={onSelectTab} />
        <NavItem activeTab={activeTab} id="tasks" icon={ClipboardList} label="订单" onSelect={onSelectTab} />
        <NavItem activeTab={activeTab} id="post" icon={PlusCircle} label="发布" onSelect={onSelectTab} featured />
        <NavItem activeTab={activeTab} id="messages" icon={MessageSquare} label="消息" onSelect={onSelectTab} showDot={hasUnreadMessages} />
        <NavItem activeTab={activeTab} id="profile" icon={User} label="我的" onSelect={onSelectTab} />
      </div>
    </nav>
  );
}
```

- [ ] **Step 4: Run the shell regression script to verify it passes**

Run: `node scripts/verify-layout-shell.mjs`  
Expected: PASS with the sidebar/grid checks.

- [ ] **Step 5: Run a production build to catch shell wiring mistakes**

Run: `npm run build`  
Expected: PASS.

- [ ] **Step 6: Commit the shell work**

```bash
git add campus-frontend/src/components/layout/SidebarNav.jsx campus-frontend/src/App.jsx campus-frontend/src/components/layout/AppHeader.jsx campus-frontend/src/components/layout/BottomNav.jsx campus-frontend/scripts/verify-layout-shell.mjs
git commit -m "feat: add responsive app shell and sidebar nav"
```

### Task 2: Extract a shared chat panel and add the desktop messages workspace

**Files:**
- Create: `campus-frontend/src/components/chat/ChatPanel.jsx`
- Modify: `campus-frontend/src/App.jsx`
- Modify: `campus-frontend/src/components/pages/MessagesView.jsx`
- Modify: `campus-frontend/src/components/overlays/ChatOverlay.jsx`
- Modify: `campus-frontend/scripts/verify-layout-shell.mjs`

- [ ] **Step 1: Extend the regression script with failing chat workspace checks**

```js
const messagesSource = readSource('./src/components/pages/MessagesView.jsx');
const overlaySource = readSource('./src/components/overlays/ChatOverlay.jsx');
const chatPanelSource = readSource('./src/components/chat/ChatPanel.jsx');

checks.push(
  {
    description: 'messages view has a desktop workspace split',
    passed: messagesSource.includes('xl:grid-cols-[380px_minmax(0,1fr)]'),
  },
  {
    description: 'messages view renders shared ChatPanel inline',
    passed: messagesSource.includes('<ChatPanel'),
  },
  {
    description: 'chat overlay reuses shared ChatPanel',
    passed: overlaySource.includes('<ChatPanel') && chatPanelSource.includes('variant = \'inline\''),
  },
  {
    description: 'desktop chat overlay widens beyond mobile width',
    passed: overlaySource.includes('sm:max-w-3xl') && overlaySource.includes('xl:max-w-5xl'),
  },
);
```

- [ ] **Step 2: Run the regression script to verify it fails**

Run: `node scripts/verify-layout-shell.mjs`  
Expected: FAIL because `ChatPanel.jsx` and the desktop message workspace do not exist yet.

- [ ] **Step 3: Implement the shared chat panel, desktop workspace, and wider overlay**

```jsx
// ChatPanel.jsx
import { ArrowLeft, LoaderCircle, Send } from 'lucide-react';

export default function ChatPanel({
  activeChatTask,
  chatInput,
  chatMessages,
  chatPendingNewMessageCount,
  chatScrollContainerRef,
  currentUser,
  getConversationTitle,
  handleSendMessage,
  isSendingMessage,
  onChatInputChange,
  onClose,
  onScroll,
  scrollChatToBottom,
  variant = 'inline',
}) {
  const panelClassName = variant === 'overlay'
    ? 'relative flex h-full w-full flex-col bg-slate-50 text-slate-900 shadow-2xl sm:h-[85vh] sm:max-w-3xl sm:overflow-hidden sm:rounded-[32px] xl:max-w-5xl'
    : 'relative flex min-h-[32rem] flex-col rounded-[28px] border border-slate-200 bg-white text-slate-900 shadow-sm';

  if (!activeChatTask) {
    return (
      <div className={panelClassName}>
        <div className="flex min-h-[32rem] items-center justify-center p-8 text-center text-sm text-slate-500">
          选择左侧会话后，这里会显示完整聊天内容。
        </div>
      </div>
    );
  }

  const messages = chatMessages[activeChatTask.id] || [];

  return (
    <div className={panelClassName}>
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onClose} className="rounded-full bg-slate-100 p-2 text-slate-600 transition hover:bg-slate-200">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-lg font-bold">{getConversationTitle(activeChatTask)}</h2>
            <p className="text-xs text-slate-500">任务：{activeChatTask.title}</p>
          </div>
        </div>
      </header>
      <div ref={chatScrollContainerRef} onScroll={onScroll} className="flex-1 space-y-4 overflow-y-auto p-5">
        {messages.length === 0 ? (
          <div className="mt-10 text-center text-sm text-slate-400">当前会话还没有消息，先发一条消息开始沟通吧。</div>
        ) : (
          messages.map((message) => {
            const isMe = message.senderUsername === currentUser.studentId || message.sender === 'me';
            return (
              <div key={message.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${isMe ? 'rounded-br-none bg-cyan-600 text-white' : 'rounded-bl-none border border-slate-200 bg-white text-slate-800'}`}>
                  <p className="leading-relaxed">{message.text}</p>
                  <span className={`mt-1 block text-[10px] ${isMe ? 'text-cyan-200' : 'text-slate-400'}`}>{message.createdAt || message.time}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
      <footer className="border-t border-slate-200 bg-white p-4 pb-6">
        <form onSubmit={handleSendMessage} className="flex items-center gap-3">
          <input type="text" value={chatInput} onChange={(event) => onChatInputChange(event.target.value)} placeholder="输入消息内容" disabled={isSendingMessage} className="flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 disabled:bg-slate-100" />
          <button type="submit" disabled={!chatInput.trim() || isSendingMessage} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan-600 text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-300">
            {isSendingMessage ? <LoaderCircle size={18} className="animate-spin" /> : <Send size={18} className="-ml-0.5" />}
          </button>
        </form>
      </footer>
      {chatPendingNewMessageCount > 0 ? (
        <button type="button" onClick={() => scrollChatToBottom('smooth')} className="absolute bottom-24 right-4 rounded-full bg-cyan-600 px-4 py-2 text-xs font-semibold text-white shadow-lg transition hover:bg-cyan-700">
          {chatPendingNewMessageCount > 99 ? '99+ 条新消息' : `${chatPendingNewMessageCount} 条新消息`}
        </button>
      ) : null}
    </div>
  );
}
```

```jsx
// MessagesView.jsx
import { ClipboardList, MessageSquare } from 'lucide-react';
import ChatPanel from '../chat/ChatPanel';

export default function MessagesView({
  activeChatTask,
  chatInput,
  chatMessages,
  chatPendingNewMessageCount,
  chatScrollContainerRef,
  currentUser,
  formatRmb,
  getConversationTitle,
  getLatestServerMessage,
  getTaskStatusMeta,
  handleSendMessage,
  isConversationUnread,
  isSendingMessage,
  onChatInputChange,
  onChatScroll,
  onCloseChat,
  openChat,
  scrollChatToBottom,
  sortedChatableTasks,
}) {
  const conversationList = sortedChatableTasks.length === 0 ? (
    <div className="rounded-3xl border border-slate-200 bg-white px-5 py-8 text-center text-sm text-slate-500 shadow-sm">还没有会话。先接取任务，或等待接单人联系你。</div>
  ) : (
    sortedChatableTasks.map((task) => {
      const latestMessage = getLatestServerMessage(task.id);
      const isUnread = isConversationUnread(task.id);
      const latestPreview = latestMessage?.text || 'No messages yet.';
      const taskStatusMeta = getTaskStatusMeta(task.status);

      return (
        <button key={task.id} type="button" onClick={() => openChat(task)} className="flex w-full items-start justify-between gap-3 rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-cyan-200 hover:bg-slate-50">
          <div className="flex items-center gap-4">
            <div className="mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-cyan-700">
              <MessageSquare size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900">{getConversationTitle(task)}</h3>
                {isUnread ? <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-600">新消息</span> : null}
              </div>
              <div className="mt-3 rounded-2xl border border-cyan-200 bg-slate-50 px-4 py-3">
                <div className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.2em] text-cyan-700">
                  <ClipboardList size={14} />
                  任务
                </div>
                <p className="mt-2 line-clamp-2 text-sm font-bold leading-6 text-slate-900">{task.title || '未命名任务'}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${taskStatusMeta.className}`}>{taskStatusMeta.label}</span>
                  <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700">{formatRmb(task.reward)}</span>
                  <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-slate-500">任务 #{task.id}</span>
                </div>
              </div>
              <p className="mt-3 line-clamp-1 text-xs text-slate-500">最新消息：{latestPreview}</p>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            {latestMessage?.createdAt ? <span className="text-xs text-slate-400">{latestMessage.createdAt}</span> : null}
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${isUnread ? 'bg-rose-100 text-rose-600' : 'bg-cyan-100 text-cyan-600'}`}>{isUnread ? '立即查看' : '打开'}</span>
          </div>
        </button>
      );
    })
  );

  return (
    <div className="space-y-4 p-5 xl:grid xl:grid-cols-[380px_minmax(0,1fr)] xl:gap-6 xl:space-y-0">
      <div className="space-y-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-slate-900">会话列表</h3>
              <p className="mt-1 text-sm text-slate-500">消息按任务分组，方便你持续跟进上下文。</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">{sortedChatableTasks.length}</span>
          </div>
        </div>
        <div className="space-y-4">{conversationList}</div>
      </div>
      <div className="hidden xl:block">
        <ChatPanel
          activeChatTask={activeChatTask}
          chatInput={chatInput}
          chatMessages={chatMessages}
          chatPendingNewMessageCount={chatPendingNewMessageCount}
          chatScrollContainerRef={chatScrollContainerRef}
          currentUser={currentUser}
          getConversationTitle={getConversationTitle}
          handleSendMessage={handleSendMessage}
          isSendingMessage={isSendingMessage}
          onChatInputChange={onChatInputChange}
          onClose={onCloseChat}
          onScroll={onChatScroll}
          scrollChatToBottom={scrollChatToBottom}
          variant="inline"
        />
      </div>
    </div>
  );
}
```

```jsx
// ChatOverlay.jsx
import ChatPanel from '../chat/ChatPanel';

export default function ChatOverlay(props) {
  if (!props.activeChatTask) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex bg-slate-900/40 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4">
      <ChatPanel
        activeChatTask={props.activeChatTask}
        chatInput={props.chatInput}
        chatMessages={props.chatMessages}
        chatPendingNewMessageCount={props.chatPendingNewMessageCount}
        chatScrollContainerRef={props.chatScrollContainerRef}
        currentUser={props.currentUser}
        getConversationTitle={props.getConversationTitle}
        handleSendMessage={props.handleSendMessage}
        isSendingMessage={props.isSendingMessage}
        onChatInputChange={props.onChatInputChange}
        onClose={props.onClose}
        onScroll={props.onScroll}
        scrollChatToBottom={props.scrollChatToBottom}
        variant="overlay"
      />
    </div>
  );
}
```

```jsx
// App.jsx
<MessagesView
  activeChatTask={activeChatTask}
  chatInput={chatInput}
  chatMessages={chatMessages}
  chatPendingNewMessageCount={chatPendingNewMessageCount}
  chatScrollContainerRef={chatScrollContainerRef}
  currentUser={currentUser}
  formatRmb={formatRmb}
  getConversationTitle={getConversationTitle}
  getLatestServerMessage={getLatestServerMessage}
  getTaskStatusMeta={getTaskStatusMeta}
  handleSendMessage={handleSendMessage}
  isConversationUnread={isConversationUnread}
  isSendingMessage={isSendingMessage}
  onChatInputChange={setChatInput}
  onChatScroll={syncChatPinnedState}
  onCloseChat={closeChat}
  openChat={openChat}
  scrollChatToBottom={scrollChatToBottom}
  sortedChatableTasks={sortedChatableTasks}
/>
```

- [ ] **Step 4: Run the regression script to verify the chat workspace passes**

Run: `node scripts/verify-layout-shell.mjs`  
Expected: PASS with the new chat workspace checks.

- [ ] **Step 5: Run a production build after the chat refactor**

Run: `npm run build`  
Expected: PASS.

- [ ] **Step 6: Commit the chat workspace work**

```bash
git add campus-frontend/src/components/chat/ChatPanel.jsx campus-frontend/src/App.jsx campus-frontend/src/components/pages/MessagesView.jsx campus-frontend/src/components/overlays/ChatOverlay.jsx campus-frontend/scripts/verify-layout-shell.mjs
git commit -m "feat: add desktop messages workspace"
```

### Task 3: Re-layout the workflow screens (`HomeView`, `OrdersView`, `PostTaskView`)

**Files:**
- Modify: `campus-frontend/src/components/pages/HomeView.jsx`
- Modify: `campus-frontend/src/components/pages/OrdersView.jsx`
- Modify: `campus-frontend/src/components/pages/PostTaskView.jsx`
- Modify: `campus-frontend/scripts/verify-layout-shell.mjs`

- [ ] **Step 1: Extend the regression script with failing workflow layout checks**

```js
const homeSource = readSource('./src/components/pages/HomeView.jsx');
const ordersSource = readSource('./src/components/pages/OrdersView.jsx');
const postSource = readSource('./src/components/pages/PostTaskView.jsx');

checks.push(
  {
    description: 'home view has a desktop master-detail grid',
    passed: homeSource.includes('xl:grid-cols-[minmax(0,1.15fr)_380px]'),
  },
  {
    description: 'orders view tracks a selected desktop order',
    passed: ordersSource.includes('selectedOrderId') && ordersSource.includes('xl:grid-cols-[minmax(0,1fr)_340px]'),
  },
  {
    description: 'post task view has a desktop form-plus-summary split',
    passed: postSource.includes('xl:grid-cols-[minmax(0,1fr)_360px]'),
  },
);
```

- [ ] **Step 2: Run the regression script to verify it fails**

Run: `node scripts/verify-layout-shell.mjs`  
Expected: FAIL because the workflow screens are still single-column layouts.

- [ ] **Step 3: Implement the workflow page grids**

```jsx
// HomeView.jsx
const mobileScreen = selectedTask ? (
  <div className="space-y-4 p-5">
    <section className="rounded-3xl bg-slate-900 p-5 text-white shadow-lg">
      <button type="button" onClick={() => setSelectedTask(null)} className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-white/15">
        返回大厅
      </button>
      <h2 className="mt-4 text-2xl font-bold">{selectedTask.title}</h2>
      <p className="mt-3 text-sm text-slate-300">{selectedTask.description || '暂无补充说明。'}</p>
    </section>
  </div>
) : (
  <div className="space-y-4 p-5">
    {openTasks.map((task) => (
      <article key={task.id} onClick={() => setSelectedTask(task)} className="cursor-pointer rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-cyan-200 hover:bg-slate-50">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900">{task.title}</h3>
            <p className="mt-2 text-sm text-slate-500">{task.description || '暂无描述。'}</p>
          </div>
          <span className="rounded-full bg-cyan-100 px-3 py-1 text-sm font-bold text-cyan-700">{formatRmb(task.reward)}</span>
        </div>
      </article>
    ))}
  </div>
);

const desktopTaskDetail = selectedTask ? (
  <section className="rounded-3xl bg-slate-900 p-6 text-white shadow-lg">
    <p className="text-sm text-cyan-200">任务详情</p>
    <h2 className="mt-2 text-2xl font-bold">{selectedTask.title}</h2>
    <p className="mt-2 text-sm text-slate-300">{selectedTask.description || '暂无补充说明。'}</p>
    <div className="mt-4 rounded-2xl bg-white/10 px-4 py-3">
      <p className="text-xs text-slate-300">赏金</p>
      <p className="mt-1 text-2xl font-bold">{formatRmb(selectedTask.reward)}</p>
    </div>
  </section>
) : (
  <section className="rounded-3xl border border-dashed border-slate-300 bg-white/80 p-6 text-sm text-slate-500">
    从左侧任务列表选择一项，这里会固定显示详情。
  </section>
);

return (
  <>
    <div className="xl:hidden">{mobileScreen}</div>
    <div className="hidden p-5 xl:grid xl:grid-cols-[minmax(0,1.15fr)_380px] xl:gap-6">
      <div className="space-y-4">
        <section className="rounded-3xl bg-slate-900 p-5 text-white shadow-lg">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-cyan-200">欢迎回来</p>
              <h2 className="mt-1 text-2xl font-bold">{currentUser.name}</h2>
              <p className="mt-2 text-sm text-slate-300">用户标识：{currentUser.studentId} | 已完成：{currentUser.completedCount}</p>
            </div>
            <div className="rounded-2xl bg-white/10 px-4 py-3 text-right">
              <p className="text-xs text-slate-300">余额</p>
              <p className="text-2xl font-bold">{formatRmb(currentUser.balance)}</p>
            </div>
          </div>
        </section>
        {openTasks.map((task) => (
          <article key={task.id} onClick={() => setSelectedTask(task)} className="cursor-pointer rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-cyan-200 hover:bg-slate-50">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{task.title}</h3>
                <p className="mt-2 text-sm text-slate-500">{task.description || '暂无描述。'}</p>
              </div>
              <span className="rounded-full bg-cyan-100 px-3 py-1 text-sm font-bold text-cyan-700">{formatRmb(task.reward)}</span>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
              <span>发布者：{task.author || '匿名用户'}</span>
              <span>任务 #{task.id}</span>
            </div>
          </article>
        ))}
      </div>
      <div className="sticky top-6 self-start">{desktopTaskDetail}</div>
    </div>
  </>
);
```

```jsx
// OrdersView.jsx
import { useEffect, useMemo, useState } from 'react';

const [selectedOrderId, setSelectedOrderId] = useState(null);
const selectedOrder = useMemo(
  () => displayTasks.find((task) => task.id === selectedOrderId) || displayTasks[0] || null,
  [displayTasks, selectedOrderId],
);

useEffect(() => {
  setSelectedOrderId((current) =>
    displayTasks.some((task) => task.id === current) ? current : displayTasks[0]?.id ?? null
  );
}, [displayTasks]);

return (
  <div className="space-y-4 p-5">
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-900">订单总览</h3>
          <p className="mt-1 text-sm text-slate-500">在这里查看你发布的任务和已接取的任务。</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">{displayTasks.length}</span>
      </div>
    </div>
    <div className="flex rounded-2xl bg-slate-100 p-1">
      <button type="button" onClick={() => setOrderTab('posted')} className={`flex-1 rounded-xl py-2 text-sm font-semibold transition ${orderTab === 'posted' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>我发布的</button>
      <button type="button" onClick={() => setOrderTab('accepted')} className={`flex-1 rounded-xl py-2 text-sm font-semibold transition ${orderTab === 'accepted' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>我接取的</button>
    </div>
    <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_340px] xl:gap-6">
      <div className="space-y-4">
        {displayTasks.map((task) => (
          <button
            key={task.id}
            type="button"
            onClick={() => setSelectedOrderId(task.id)}
            className={`w-full rounded-3xl border p-5 text-left shadow-sm transition ${selectedOrder?.id === task.id ? 'border-cyan-200 bg-cyan-50' : 'border-slate-200 bg-white hover:border-cyan-200 hover:bg-slate-50'}`}
          >
            <span className="block text-base font-bold text-slate-900">{task.title}</span>
            <span className="mt-2 block text-sm text-slate-500">状态：{task.status} | 赏金：{formatRmb(task.reward)}</span>
          </button>
        ))}
      </div>
      <aside className="hidden xl:block">
        {selectedOrder ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h4 className="text-lg font-bold text-slate-900">{selectedOrder.title}</h4>
            <p className="mt-3 text-sm text-slate-600">{selectedOrder.description || '暂无描述。'}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-bold text-cyan-700">{formatRmb(selectedOrder.reward)}</span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">任务 #{selectedOrder.id}</span>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white/80 p-5 text-sm text-slate-500">暂无选中的订单。</div>
        )}
      </aside>
    </div>
  </div>
);
```

```jsx
// PostTaskView.jsx
return (
  <div className="space-y-4 p-5">
    <div className="space-y-4 xl:grid xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start xl:gap-6 xl:space-y-0">
      <form onSubmit={handleSubmit} className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">任务标题</span>
          <input type="text" required value={postFormData.title} onChange={(event) => setPostFormData({ ...postFormData, title: event.target.value })} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100" />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">任务描述</span>
          <textarea required rows="4" value={postFormData.desc} onChange={(event) => setPostFormData({ ...postFormData, desc: event.target.value })} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100" />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">赏金</span>
          <input type="number" required min="0.01" step="0.01" value={postFormData.reward} onChange={(event) => setPostFormData({ ...postFormData, reward: event.target.value })} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100" />
        </label>
        <button type="submit" disabled={isPostingTask} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-600 py-3 font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-cyan-300">
          发布任务
        </button>
      </form>
      <aside className="space-y-4">
        <section className="rounded-3xl border border-cyan-100 bg-cyan-50 p-5 shadow-sm">
          <p className="text-xs font-semibold text-cyan-700">当前余额</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{formatRmb(currentUser.balance)}</p>
        </section>
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-base font-bold text-slate-900">发布提示</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-500">
            <li>任务发布后会先预扣赏金。</li>
            <li>任务完成后平台再结算给接单人。</li>
            <li>请在描述里写清时间、地点和要求。</li>
          </ul>
        </section>
      </aside>
    </div>
  </div>
);
```

- [ ] **Step 4: Run the regression script to verify the workflow layouts pass**

Run: `node scripts/verify-layout-shell.mjs`  
Expected: PASS with the workflow layout checks.

- [ ] **Step 5: Run a production build after the workflow changes**

Run: `npm run build`  
Expected: PASS.

- [ ] **Step 6: Commit the workflow layout work**

```bash
git add campus-frontend/src/components/pages/HomeView.jsx campus-frontend/src/components/pages/OrdersView.jsx campus-frontend/src/components/pages/PostTaskView.jsx campus-frontend/scripts/verify-layout-shell.mjs
git commit -m "feat: add responsive workflow page layouts"
```

### Task 4: Re-layout the account, history, wallet, admin, and auth screens

**Files:**
- Modify: `campus-frontend/src/components/AuthScreen.jsx`
- Modify: `campus-frontend/src/components/pages/ProfileView.jsx`
- Modify: `campus-frontend/src/components/pages/WalletView.jsx`
- Modify: `campus-frontend/src/components/pages/HistoryView.jsx`
- Modify: `campus-frontend/src/components/pages/AdminView.jsx`
- Modify: `campus-frontend/scripts/verify-layout-shell.mjs`

- [ ] **Step 1: Extend the regression script with failing account/admin layout checks**

```js
const authSource = readSource('./src/components/AuthScreen.jsx');
const profileSource = readSource('./src/components/pages/ProfileView.jsx');
const walletSource = readSource('./src/components/pages/WalletView.jsx');
const historySource = readSource('./src/components/pages/HistoryView.jsx');
const adminSource = readSource('./src/components/pages/AdminView.jsx');

checks.push(
  {
    description: 'profile view has a desktop two-column layout',
    passed: profileSource.includes('xl:grid-cols-[320px_minmax(0,1fr)]'),
  },
  {
    description: 'wallet view has a desktop records-plus-summary split',
    passed: walletSource.includes('xl:grid-cols-[minmax(0,1fr)_320px]'),
  },
  {
    description: 'history view has a desktop list-plus-summary split',
    passed: historySource.includes('xl:grid-cols-[minmax(0,1fr)_320px]'),
  },
  {
    description: 'admin view uses a wider internal split grid',
    passed: adminSource.includes('2xl:grid-cols-[360px_minmax(0,1fr)]'),
  },
  {
    description: 'auth screen uses a larger-screen split card',
    passed: authSource.includes('lg:grid-cols-[1.05fr_0.95fr]') && authSource.includes('max-w-[1280px]'),
  },
);
```

- [ ] **Step 2: Run the regression script to verify it fails**

Run: `node scripts/verify-layout-shell.mjs`  
Expected: FAIL because these screens still use stacked mobile layouts or narrower grids.

- [ ] **Step 3: Implement the account/admin/auth responsive layouts**

```jsx
// ProfileView.jsx
return (
  <div className="space-y-4 p-5 xl:grid xl:grid-cols-[320px_minmax(0,1fr)] xl:gap-6 xl:space-y-0">
    <div className="space-y-4">
      <div className="rounded-3xl bg-slate-900 p-6 text-white shadow-lg">
        <p className="text-sm text-cyan-200">个人中心</p>
        <h2 className="mt-2 text-2xl font-bold">{currentUser.name || '未命名用户'}</h2>
        <p className="mt-2 text-sm text-slate-300">{currentUser.studentId || '暂无用户名'} | {currentUser.email || '暂无邮箱'}</p>
      </div>
      <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <button type="button" onClick={onOpenWallet} className="flex w-full items-center justify-between rounded-2xl bg-slate-50 px-4 py-4 text-left">钱包</button>
        <button type="button" onClick={onOpenHistory} className="flex w-full items-center justify-between rounded-2xl bg-slate-50 px-4 py-4 text-left">历史记录</button>
        {showAdminEntry ? <button type="button" onClick={onOpenAdmin} className="flex w-full items-center justify-between rounded-2xl bg-amber-50 px-4 py-4 text-left">管理后台</button> : null}
      </div>
      <button type="button" onClick={handleLogout} className="w-full rounded-2xl border border-rose-200 bg-rose-50 py-3 font-semibold text-rose-600 transition hover:bg-rose-100">
        退出登录
      </button>
    </div>
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      {isEditingProfile ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block"><span className="mb-2 block text-sm font-medium text-slate-700">昵称</span><input type="text" value={profileForm.name} onChange={(event) => onNameChange(event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100" /></label>
          <label className="block"><span className="mb-2 block text-sm font-medium text-slate-700">邮箱</span><input type="email" value={profileForm.email} onChange={(event) => onEmailChange(event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100" /></label>
          <label className="block"><span className="mb-2 block text-sm font-medium text-slate-700">手机号</span><input type="text" value={profileForm.phone} onChange={(event) => onPhoneChange(event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100" /></label>
          <label className="block"><span className="mb-2 block text-sm font-medium text-slate-700">校区</span><input type="text" value={profileForm.campus} onChange={(event) => onCampusChange(event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100" /></label>
          <label className="block sm:col-span-2"><span className="mb-2 block text-sm font-medium text-slate-700">个人简介</span><textarea rows="4" value={profileForm.bio} onChange={(event) => onBioChange(event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100" /></label>
        </div>
      ) : (
        <div className="mt-4 space-y-3 text-sm">
          <div className="flex justify-between rounded-2xl bg-slate-50 px-4 py-3"><span className="text-slate-500">昵称</span><span className="font-semibold text-slate-900">{currentUser.name || '-'}</span></div>
          <div className="flex justify-between rounded-2xl bg-slate-50 px-4 py-3"><span className="text-slate-500">账号</span><span className="font-semibold text-slate-900">{currentUser.studentId || '-'}</span></div>
          <div className="flex justify-between rounded-2xl bg-slate-50 px-4 py-3"><span className="text-slate-500">邮箱</span><span className="font-semibold text-slate-900">{currentUser.email || '-'}</span></div>
        </div>
      )}
    </div>
  </div>
);
```

```jsx
// WalletView.jsx
return (
  <div className="space-y-4 p-5 xl:grid xl:grid-cols-[minmax(0,1fr)_320px] xl:gap-6 xl:space-y-0">
    <div className="space-y-4">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-bold text-slate-900">余额明细</h3>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">{walletRecords.length}</span>
        </div>
        <div className="mt-4 space-y-3">{walletRecords.map((record) => <article key={record.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-700">{record.title || '余额变动'}</article>)}</div>
      </section>
    </div>
    <div className="space-y-4">
      <section className="rounded-3xl bg-slate-900 p-5 text-white shadow-lg">
        <p className="text-sm text-cyan-200">我的钱包</p>
        <h2 className="mt-2 text-3xl font-black">{formatRmb(currentUser.balance)}</h2>
      </section>
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-base font-bold text-slate-900">说明</h3>
        <p className="mt-2 text-sm text-slate-500">余额调整由管理员统一处理，公开充值入口保持关闭。</p>
      </section>
    </div>
  </div>
);
```

```jsx
// HistoryView.jsx
return (
  <div className="space-y-4 p-5 xl:grid xl:grid-cols-[minmax(0,1fr)_320px] xl:gap-6 xl:space-y-0">
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="space-y-3">
        {completedHistoryTasks.map((task) => (
          <article key={task.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-700">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-base font-bold text-slate-900">{task.title || '未命名任务'}</h3>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">{formatRmb(task.reward)}</span>
            </div>
            <p className="mt-3 text-xs text-slate-500">{formatDateTime(task.completedAt)}</p>
          </article>
        ))}
      </div>
    </section>
    <div className="space-y-4">
      <section className="rounded-3xl bg-slate-900 p-5 text-white shadow-lg">
        <p className="text-sm text-cyan-200">历史记录</p>
        <h2 className="mt-2 text-2xl font-bold">已完成任务</h2>
      </section>
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-slate-50 px-4 py-3"><p className="text-xs text-slate-500">完成数量</p><p className="mt-1 text-xl font-bold text-slate-900">{completedHistoryTasks.length}</p></div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3"><p className="text-xs text-slate-500">累计收入</p><p className="mt-1 text-xl font-bold text-slate-900">{formatRmb(completedIncomeTotal)}</p></div>
        </div>
      </section>
    </div>
  </div>
);
```

```jsx
// AdminView.jsx
<div className="space-y-4 p-5 lg:p-6">
  <section className="rounded-3xl bg-slate-900 p-5 text-white shadow-lg">
    <p className="text-sm text-cyan-200">管理后台</p>
    <h2 className="mt-2 text-2xl font-bold">用户管理</h2>
  </section>
  <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="mt-4 grid gap-4 2xl:grid-cols-[360px_minmax(0,1fr)]">
      <div className="space-y-3 2xl:max-h-[calc(100vh-18rem)] 2xl:overflow-y-auto 2xl:pr-2">{adminUsers.map((user) => <button key={user.id} type="button" onClick={() => onSelectAdminUser(user.id)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left">{user.name || user.username}</button>)}</div>
      <div className="min-w-0 space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
        {adminSelectedUser ? <div className="rounded-2xl bg-white p-4 shadow-sm">{adminSelectedUser.name || adminSelectedUser.username}</div> : <div className="rounded-2xl bg-white px-4 py-10 text-center text-sm text-slate-500 shadow-sm">请选择一个用户查看详情。</div>}
      </div>
    </div>
  </section>
</div>
```

```jsx
// AuthScreen.jsx
<div className="auth-shell min-h-screen px-4 py-6 text-slate-900 md:px-6 md:py-8">
  <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-[1280px] items-center">
    <div className="grid w-full overflow-hidden rounded-[32px] border border-white/60 bg-white/80 shadow-2xl backdrop-blur lg:grid-cols-[1.05fr_0.95fr]">
      <section className="auth-brand relative overflow-hidden px-6 py-8 text-white md:px-10 md:py-12 xl:px-12">
        <div className="auth-brand__badge">校园众包平台</div>
        <h1 className="mt-6 max-w-md text-4xl font-black leading-tight md:text-5xl">安全的校园任务协作与接单平台</h1>
      </section>
      <section className="px-6 py-8 md:px-10 md:py-12 xl:px-12">
        <div className="mx-auto w-full max-w-md xl:max-w-lg">
          <div className="rounded-full bg-slate-100 p-1">
            <div className="grid grid-cols-2 gap-1">
              <button type="button" onClick={() => setAuthMode('login')} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${authMode === 'login' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>登录</button>
              <button type="button" onClick={() => setAuthMode('register')} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${authMode === 'register' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>注册</button>
            </div>
          </div>
          <form onSubmit={handleAuthSubmit} className="mt-8 space-y-4">
            <label className="block"><span className="mb-2 block text-sm font-medium text-slate-700">用户名</span><input type="text" value={authForm.studentId} onChange={(event) => updateAuthForm(authMode, 'studentId', event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100" /></label>
            <label className="block"><span className="mb-2 block text-sm font-medium text-slate-700">密码</span><input type="password" value={authForm.password} onChange={(event) => updateAuthForm(authMode, 'password', event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100" /></label>
            <button type="submit" disabled={authLoading} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400">
              {authMode === 'login' ? '登录' : '注册'}
            </button>
          </form>
        </div>
      </section>
    </div>
  </div>
</div>
```

- [ ] **Step 4: Run the regression script to verify the account/admin layouts pass**

Run: `node scripts/verify-layout-shell.mjs`  
Expected: PASS with the account/admin/auth checks.

- [ ] **Step 5: Run a production build after the page-layout sweep**

Run: `npm run build`  
Expected: PASS.

- [ ] **Step 6: Commit the account/admin/auth layout work**

```bash
git add campus-frontend/src/components/AuthScreen.jsx campus-frontend/src/components/pages/ProfileView.jsx campus-frontend/src/components/pages/WalletView.jsx campus-frontend/src/components/pages/HistoryView.jsx campus-frontend/src/components/pages/AdminView.jsx campus-frontend/scripts/verify-layout-shell.mjs
git commit -m "feat: add responsive account and admin layouts"
```

### Task 5: Run full verification and fix the last responsive regressions

**Files:**
- Modify: `campus-frontend/src/App.jsx`
- Modify: `campus-frontend/src/components/layout/SidebarNav.jsx`
- Modify: `campus-frontend/src/components/layout/AppHeader.jsx`
- Modify: `campus-frontend/src/components/layout/BottomNav.jsx`
- Modify: `campus-frontend/src/components/chat/ChatPanel.jsx`
- Modify: `campus-frontend/src/components/overlays/ChatOverlay.jsx`
- Modify: `campus-frontend/src/components/pages/HomeView.jsx`
- Modify: `campus-frontend/src/components/pages/OrdersView.jsx`
- Modify: `campus-frontend/src/components/pages/PostTaskView.jsx`
- Modify: `campus-frontend/src/components/pages/MessagesView.jsx`
- Modify: `campus-frontend/src/components/pages/ProfileView.jsx`
- Modify: `campus-frontend/src/components/pages/WalletView.jsx`
- Modify: `campus-frontend/src/components/pages/HistoryView.jsx`
- Modify: `campus-frontend/src/components/pages/AdminView.jsx`
- Modify: `campus-frontend/src/components/AuthScreen.jsx`
- Modify: `campus-frontend/scripts/verify-layout-shell.mjs`

- [ ] **Step 1: Run the regression script one final time**

Run: `node scripts/verify-layout-shell.mjs`  
Expected: PASS.

- [ ] **Step 2: Run ESLint across the frontend**

Run: `npm run lint`  
Expected: PASS with no errors.

- [ ] **Step 3: Run a production build**

Run: `npm run build`  
Expected: PASS and emit the Vite production bundle.

- [ ] **Step 4: Perform the manual responsive acceptance sweep**

```text
Viewport 375:
- auth stacks vertically
- authenticated app shows bottom nav and no sidebar
- home detail still uses the mobile flow
- messages still opens overlay chat

Viewport 768:
- sidebar replaces bottom nav
- content shell no longer looks like a narrow phone frame
- post task and profile spacing feels balanced

Viewport 1024:
- home shows list and detail together
- messages shows conversation list and conversation panel
- wallet and history show split layouts

Viewport 1440:
- sidebar is fully expanded
- admin uses the wider shared shell
- chat overlay opens as a wide centered panel
- no obvious horizontal overflow in cards, badges, metadata rows, or button groups
```

- [ ] **Step 5: Commit any final regression fixes if the working tree is not clean**

```bash
git status --short
# Expected: no output. If there are responsive polish fixes:
git add campus-frontend/src/App.jsx campus-frontend/src/components/layout/SidebarNav.jsx campus-frontend/src/components/layout/AppHeader.jsx campus-frontend/src/components/layout/BottomNav.jsx campus-frontend/src/components/chat/ChatPanel.jsx campus-frontend/src/components/overlays/ChatOverlay.jsx campus-frontend/src/components/pages/HomeView.jsx campus-frontend/src/components/pages/OrdersView.jsx campus-frontend/src/components/pages/PostTaskView.jsx campus-frontend/src/components/pages/MessagesView.jsx campus-frontend/src/components/pages/ProfileView.jsx campus-frontend/src/components/pages/WalletView.jsx campus-frontend/src/components/pages/HistoryView.jsx campus-frontend/src/components/pages/AdminView.jsx campus-frontend/src/components/AuthScreen.jsx campus-frontend/scripts/verify-layout-shell.mjs
git commit -m "fix: polish responsive layout regressions"
```

## Self-Review

- Spec coverage:
  - Shared shell and sidebar are covered by Task 1.
  - Desktop message workspace and wider overlay chat are covered by Task 2.
  - Home, orders, and post-task layouts are covered by Task 3.
  - Profile, wallet, history, admin, and auth layouts are covered by Task 4.
  - Automated and manual verification are covered by Task 5.
- Placeholder scan:
  - No red-flag placeholder markers remain.
  - Every task lists exact files, concrete commands, and concrete code snippets.
- Type and naming consistency:
  - Sidebar component is consistently named `SidebarNav`.
  - Shared conversation surface is consistently named `ChatPanel`.
  - The regression script remains `scripts/verify-layout-shell.mjs` throughout.
