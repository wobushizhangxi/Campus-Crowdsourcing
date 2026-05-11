import { useEffect, useRef, useState } from 'react';
import AuthScreen from './components/AuthScreen';
import AppHeader from './components/layout/AppHeader';
import BottomNav from './components/layout/BottomNav';
import ChatOverlay from './components/overlays/ChatOverlay';
import SidebarNav from './components/layout/SidebarNav';
import AdminView from './components/pages/AdminView';
import HistoryView from './components/pages/HistoryView';
import HomeView from './components/pages/HomeView';
import MessagesView from './components/pages/MessagesView';
import OrdersView from './components/pages/OrdersView';
import PostTaskView from './components/pages/PostTaskView';
import ProfileView from './components/pages/ProfileView';
import WalletView from './components/pages/WalletView';
import { normalizeApiBaseUrl, readSavedApiBaseUrl, writeSavedApiBaseUrl } from './config/apiBaseUrl';
import useAccountMemory from './hooks/useAccountMemory';
import useAdminPanel from './hooks/useAdminPanel';
import useChat from './hooks/useChat';
import useTaskActions from './hooks/useTaskActions';
import useWorkspaceData from './hooks/useWorkspaceData';
import { apiDelete, apiGet, apiPost, apiPut, getRequestErrorMessage, isUnauthorizedError } from './services/api';
import { clearAuthSession, persistAuthSession, readAuthToken } from './utils/authSession';
import { formatDateTime, formatRmb, formatSignedRmb, getBalanceRecordMeta } from './utils/formatters';
import { readFavoriteTaskIds } from './utils/taskFavorites';
import { createInitialAuthForms, emptyUser, mapUserDataToCurrentUser } from './utils/user';

const authBrandImageUrl =
  'https://images.unsplash.com/photo-1741637335289-c99652d3155f?auto=format&fit=crop&fm=jpg&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&q=80&w=1600';
const bundledApiBaseUrl = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL ?? '');
const defaultTaskCategories = ['快递代取', '跑腿代办', '学习资料', '技术帮助', '其他'];

export default function App() {
  const emptyPostForm = {
    title: '', desc: '', reward: '', category: '快递代取', campus: '主校区', location: '', deadlineAt: '',
  };

  // ── Auth ──────────────────────────────────────────────
  const [authMode, setAuthMode] = useState('login');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authForms, setAuthForms] = useState(() => createInitialAuthForms());
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [apiBaseUrlDraft, setApiBaseUrlDraft] = useState(() => readSavedApiBaseUrl() || bundledApiBaseUrl);
  const [apiBaseUrlMessage, setApiBaseUrlMessage] = useState('');

  const {
    autoLoginEnabled,
    handleSavedAccountSelect,
    hydrateLoginFormFromAccount,
    lastSavedAccount,
    persistLoginAccount,
    rememberAccount,
    savedAccounts,
    setAutoLoginEnabled,
    setRememberAccount,
  } = useAccountMemory({ setAuthError, setAuthForms, setAuthMode });

  // ── Navigation ─────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('home');
  const [profileSection, setProfileSection] = useState('overview');
  const [orderTab, setOrderTab] = useState('posted');

  // ── Profile -------------------------------------------------
  const [currentUser, setCurrentUser] = useState(emptyUser);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileDraft, setProfileDraft] = useState(emptyUser);
  const [profileMessage, setProfileMessage] = useState('');

  const sessionExpiredRef = useRef(null);

  // ── Workspace data ─────────────────────────────────────
  const {
    isRefreshingProfile,
    isWalletLoading,
    lastSyncAt,
    refreshWalletData,
    refreshWorkspaceState,
    setLastSyncAt,
    setTasks,
    taskError,
    taskCategories,
    tasks,
    walletError,
    walletRecords,
  } = useWorkspaceData({
    currentUser,
    isAuthenticated,
    profileSection,
    setCurrentUser,
    onUnauthorized: () => sessionExpiredRef.current?.(),
  });

  // ── Session helpers ────────────────────────────────────
  const handleSessionExpired = () => {
    clearAuthSession();
    setIsAuthenticated(false);
    setCurrentUser(emptyUser);
    setSelectedTask(null);
    resetChatState();
    setIsEditingProfile(false);
    setProfileDraft(emptyUser);
    setProfileMessage('');
    setProfileSection('overview');
    setPostFormData(emptyPostForm);
    setFavoriteTaskIds([]);
    setAuthMode('login');
    setAuthForms((prev) => ({ ...prev, login: { ...prev.login, password: '' } }));
    setAuthError('登录状态已过期，请重新登录。');
    setActiveTab('home');
    resetAdminState();
  };
  sessionExpiredRef.current = handleSessionExpired;

  const withAuthHandling = (error, fallbackMessage) => {
    if (isUnauthorizedError(error)) {
      handleSessionExpired();
      return '登录状态已过期，请重新登录。';
    }
    return getRequestErrorMessage(error, fallbackMessage);
  };

  // ── Task actions ───────────────────────────────────────
  const {
    favoriteTaskIds,
    handleAcceptTask,
    handleAdminDeleteTask,
    handleCancelTask,
    handleCompleteTask,
    handleDisputeTask,
    handleRejectTask,
    handleReportTask,
    handleReviewTask,
    handleSubmitTaskCompletion,
    handleToggleFavoriteTask,
    isPostingTask,
    isTaskOwnedByCurrentUser,
    postFormData,
    selectedTask,
    setFavoriteTaskIds,
    setPostFormData,
    setSelectedTask,
    submitTask,
  } = useTaskActions({ currentUser, refreshWorkspaceState, withAuthHandling });

  // ── Admin panel ────────────────────────────────────────
  const disputedTasks = tasks.filter((task) => task.status === 'disputed');

  const {
    adminAdjustAmount,
    adminAdjustReason,
    adminError,
    adminKeyword,
    adminMessage,
    adminPermissionDraft,
    adminReports,
    adminSelectedUser,
    adminUsers,
    adminVerifications,
    availablePermissions,
    canAccessAdminPanel,
    canAdjustBalance,
    canGrantPermissions,
    canViewUsers,
    handleAdminRefresh,
    isAdminLoading,
    isAdminPermissionSubmitting,
    isAdminSubmitting,
    onAdminAdjustAmountChange,
    onAdminAdjustReasonChange,
    onAdminKeywordChange,
    onAdminSearch,
    onApproveVerification,
    onDeleteAdminUser,
    onRejectVerification,
    onResolveDispute,
    onResolveReport,
    onSelectAdminUser,
    onSubmitAdminAdjustment,
    onSubmitAdminPermissions,
    onToggleAdminBan,
    onToggleAdminPermission,
    openAdminView,
    resetAdminState,
  } = useAdminPanel({ currentUser, refreshWorkspaceState, withAuthHandling });

  // ── Chat ───────────────────────────────────────────────
  const {
    activeChatTask,
    chatInput,
    chatMessages,
    chatPendingNewMessageCount,
    chatScrollContainerRef,
    closeChat,
    getConversationTitle,
    getLatestServerMessage,
    getTaskStatusMeta,
    handleSendMessage,
    hasUnreadMessages,
    isConversationUnread,
    isSendingMessage,
    openChat,
    resetChatState,
    scrollChatToBottom,
    setChatInput,
    sortedChatableTasks,
    syncChatPinnedState,
  } = useChat({
    currentUser,
    isAuthenticated,
    isTaskOwnedByCurrentUser,
    tasks,
    onUnauthorized: handleSessionExpired,
  });

  // ── Responsive workspace ───────────────────────────────
  const [isDesktopMessagesWorkspace, setIsDesktopMessagesWorkspace] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(min-width: 1280px)').matches,
  );

  // ── Effects ────────────────────────────────────────────
  useEffect(() => { setProfileDraft(currentUser); }, [currentUser]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1280px)');
    const update = (e) => setIsDesktopMessagesWorkspace(e.matches);
    setIsDesktopMessagesWorkspace(mediaQuery.matches);
    mediaQuery.addEventListener('change', update);
    return () => mediaQuery.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (profileSection === 'admin' && !canAccessAdminPanel) {
      setProfileSection('overview');
    }
  }, [canAccessAdminPanel, profileSection]);

  // Session restore
  useEffect(() => {
    const token = readAuthToken();
    if (!token) return;
    let cancelled = false;
    (async () => {
      setAuthLoading(true);
      setAuthError('');
      try {
        const response = await apiGet('/api/auth/me');
        const userData = response.data?.data?.user;
        if (!cancelled && userData) {
          const nextUser = mapUserDataToCurrentUser(userData, emptyUser);
          setCurrentUser(nextUser);
          setFavoriteTaskIds(readFavoriteTaskIds(nextUser.studentId));
          setIsAuthenticated(true);
          setActiveTab('home');
          setProfileSection('overview');
          setLastSyncAt(new Date());
        }
      } catch {
        if (!cancelled) {
          clearAuthSession();
          setAuthError('本地登录状态已失效，请重新登录。');
        }
      } finally {
        if (!cancelled) setAuthLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [setLastSyncAt]);

  // ── Auth handlers ──────────────────────────────────────
  const completeLogin = (payload, username, options = {}) => {
    const nextUser = mapUserDataToCurrentUser(payload.user, emptyUser);
    persistAuthSession(payload.token, Boolean(options.autoLogin));
    persistLoginAccount({
      username,
      name: nextUser.name || username.trim(),
      remember: Boolean(options.rememberAccount || options.autoLogin),
      autoLogin: Boolean(options.autoLogin),
    });
    setCurrentUser(nextUser);
    setIsAuthenticated(true);
    setActiveTab('home');
    setProfileSection('overview');
    setIsEditingProfile(false);
    setProfileMessage('');
    setPostFormData(emptyPostForm);
    setAuthError('');
    setFavoriteTaskIds(readFavoriteTaskIds(nextUser.studentId));
    setLastSyncAt(new Date());
  };

  const loginWithCredentials = async (username, password, options = {}) => {
    const response = await apiPost('/api/auth/login', {
      username: username.trim(),
      password: password.trim(),
    });
    if (response.data.code !== 200 || !response.data.data?.token) {
      throw new Error(response.data.message || '登录失败。');
    }
    completeLogin(response.data.data, username, options);
    return response.data.data;
  };

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
      if (authMode === 'login') {
        const { studentId, password } = authForms.login;
        if (!studentId.trim() || !password.trim()) throw new Error('用户名和密码不能为空。');
        await loginWithCredentials(studentId.trim(), password.trim(), {
          rememberAccount,
          autoLogin: autoLoginEnabled,
        });
      } else {
        const { name, studentId, email, password, confirmPassword } = authForms.register;
        if (!name.trim() || !studentId.trim() || !email.trim() || !password.trim()) {
          throw new Error('请填写所有必填注册信息。');
        }
        if (password !== confirmPassword) throw new Error('两次输入的密码不一致。');
        const response = await apiPost('/api/auth/register', {
          username: studentId.trim(),
          password: password.trim(),
          name: name.trim(),
          email: email.trim(),
          campus: '主校区',
          bio: '这个人很低调，还没有填写个人简介。',
        });
        if (response.data.code !== 201 || !response.data.data?.token) {
          throw new Error(response.data.message || '注册失败。');
        }
        completeLogin(response.data.data, studentId.trim(), {
          rememberAccount: true,
          autoLogin: autoLoginEnabled,
        });
      }
    } catch (error) {
      setAuthError(getRequestErrorMessage(error, '请求失败。'));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    clearAuthSession();
    setIsAuthenticated(false);
    setActiveTab('home');
    setSelectedTask(null);
    setIsEditingProfile(false);
    setProfileSection('overview');
    setProfileMessage('');
    setAuthMode('login');
    setAuthError('');
    setCurrentUser(emptyUser);
    setTasks([]);
    resetChatState();
    setPostFormData(emptyPostForm);
    setLastSyncAt(null);
    setFavoriteTaskIds([]);
    resetAdminState();
    hydrateLoginFormFromAccount(lastSavedAccount);
  };

  const handleDeleteOwnAccount = async () => {
    const typed = window.prompt(`注销账号会删除当前账号，并将历史记录显示为已注销用户。请输入用户名 ${currentUser.studentId} 确认：`) || '';
    if (typed !== currentUser.studentId) {
      setProfileMessage('用户名确认不一致，已取消注销。');
      return;
    }
    try {
      await apiDelete('/api/users/me');
      window.alert('账号已注销。');
      handleLogout();
    } catch (error) {
      setProfileMessage(withAuthHandling(error, '注销账号失败。'));
    }
  };

  // ── Profile & wallet ───────────────────────────────────
  const handleEditProfile = () => {
    setProfileDraft(currentUser);
    setProfileMessage('');
    setIsEditingProfile(true);
  };

  const handleSaveProfile = async (event) => {
    event?.preventDefault();
    setProfileMessage('');
    if (!profileDraft.name.trim()) { setProfileMessage('昵称不能为空。'); return; }
    if (profileDraft.email && !/^\S+@\S+\.\S+$/.test(profileDraft.email)) {
      setProfileMessage('请输入有效的邮箱地址。'); return;
    }
    try {
      const response = await apiPut('/api/users/profile', {
        name: profileDraft.name.trim(),
        email: profileDraft.email.trim(),
        phone: profileDraft.phone.trim(),
        campus: profileDraft.campus.trim(),
        address: profileDraft.address.trim(),
        bio: profileDraft.bio.trim(),
      });
      if (response.data.code !== 200) throw new Error(response.data.message || '保存资料失败。');
      const userData = response.data.data;
      setCurrentUser((prev) => mapUserDataToCurrentUser(userData, prev));
      setLastSyncAt(new Date());
      setProfileMessage('资料保存成功。');
      setIsEditingProfile(false);
    } catch (error) {
      setProfileMessage(withAuthHandling(error, '保存资料失败。'));
    }
  };

  const handleSaveAvatar = async (file) => {
    try {
      setProfileMessage('');
      const formData = new FormData();
      formData.append('file', file);
      const token = readAuthToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await fetch(`${savedApiBaseUrl || bundledApiBaseUrl || ''}/api/users/avatar/upload`, {
        method: 'POST',
        headers,
        body: formData,
      });
      const result = await response.json();
      if (result.code !== 200) throw new Error(result.message || '头像上传失败。');
      setCurrentUser((prev) => mapUserDataToCurrentUser(result.data, prev));
      setProfileDraft((prev) => mapUserDataToCurrentUser(result.data, prev));
      setLastSyncAt(new Date());
      setProfileMessage('头像已更新。');
    } catch (error) {
      const message = withAuthHandling(error, '头像上传失败。');
      setProfileMessage(message);
      throw new Error(message);
    }
  };

  const handleManualRefresh = async () => {
    await refreshWorkspaceState({ includeWallet: profileSection === 'wallet', setProfileMessage });
  };

  const handleSubmitVerification = async ({ campus, studentId, note }) => {
    if (!campus.trim() || !studentId.trim()) { setProfileMessage('校区和学号不能为空。'); return; }
    try {
      const response = await apiPost('/api/users/verification/me', {
        campus: campus.trim(), studentId: studentId.trim(), note: note.trim(),
      });
      if (response.data.code !== 200) throw new Error(response.data.message || '提交认证失败。');
      setCurrentUser((prev) => mapUserDataToCurrentUser(response.data.data, prev));
      setProfileMessage('认证申请已提交成功。');
      setLastSyncAt(new Date());
    } catch (error) {
      setProfileMessage(withAuthHandling(error, '提交认证失败。'));
    }
  };

  const openWalletView = async () => {
    closeChat();
    setSelectedTask(null);
    setActiveTab('profile');
    setProfileSection('wallet');
    await refreshWalletData();
  };

  // ── API base URL ───────────────────────────────────────
  const savedApiBaseUrl = readSavedApiBaseUrl();
  const handleSaveApiBaseUrl = () => {
    const next = normalizeApiBaseUrl(apiBaseUrlDraft);
    if (next && !/^https?:\/\//i.test(next)) { setApiBaseUrlMessage('服务器地址需要以 http:// 或 https:// 开头。'); return; }
    writeSavedApiBaseUrl(next);
    clearAuthSession();
    setApiBaseUrlDraft(next || bundledApiBaseUrl);
    setApiBaseUrlMessage(next ? '服务器地址已保存，请重新登录。' : '已恢复默认服务器地址，请重新登录。');
    setAuthError('');
  };

  const handleResetApiBaseUrl = () => {
    writeSavedApiBaseUrl('');
    clearAuthSession();
    setApiBaseUrlDraft(bundledApiBaseUrl);
    setApiBaseUrlMessage('已恢复默认服务器地址，请重新登录。');
    setAuthError('');
  };

  // ── Derived data ───────────────────────────────────────
  const handleOpenAdminView = () => {
    setSelectedTask(null);
    setActiveTab('profile');
    setProfileSection('admin');
    openAdminView(closeChat);
  };

  const completedHistoryTasks = [...tasks]
    .filter((t) => t.status === 'completed' && (isTaskOwnedByCurrentUser(t) || t.assignee === currentUser.studentId))
    .sort((a, b) => {
      const aTime = a.completedAt ? new Date(a.completedAt).getTime() : 0;
      const bTime = b.completedAt ? new Date(b.completedAt).getTime() : 0;
      return bTime - aTime || (b.id || 0) - (a.id || 0);
    });

  const completedIncomeTotal = completedHistoryTasks.reduce((total, t) => {
    if (t.assignee !== currentUser.studentId) return total;
    const reward = Number(t.reward ?? 0);
    return total + (Number.isFinite(reward) ? reward : 0);
  }, 0);

  const effectiveTaskCategories = taskCategories.length > 0 ? taskCategories : defaultTaskCategories;
  const profileMessageTone = profileMessage.includes('成功') ? 'success' : 'error';

  // ── Tab routing ────────────────────────────────────────
  const handleSelectTab = (tabId) => {
    if (activeTab === 'messages' && isDesktopMessagesWorkspace && tabId !== 'messages') closeChat();
    setActiveTab(tabId);
    setSelectedTask(null);
    setProfileSection('overview');
  };

  const getCurrentPageMeta = () => {
    const map = {
      home:    { eyebrow: '校园', title: '任务大厅',   subtitle: '浏览校园内的实时任务需求。' },
      tasks:   { eyebrow: '订单', title: '我的订单',   subtitle: '跟踪你发布和接取的任务。' },
      post:    { eyebrow: '发布', title: '发布任务',   subtitle: '创建任务并预留对应赏金。' },
      messages:{ eyebrow: '消息', title: '消息中心',   subtitle: '按任务与发布者或接单人沟通。' },
    };
    if (map[activeTab]) return map[activeTab];
    if (profileSection === 'history') return { eyebrow: '历史记录', title: '任务历史', subtitle: '查看已完成任务和结算结果。' };
    if (profileSection === 'wallet')  return { eyebrow: '钱包',     title: '我的钱包', subtitle: '查看余额和最近的余额记录。' };
    if (profileSection === 'admin')   return { eyebrow: '管理',     title: '管理后台', subtitle: '管理用户权限与余额。' };
    return { eyebrow: '我的', title: '个人中心', subtitle: '管理账号、钱包和历史记录。' };
  };

  // ── Auth guard ─────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <AuthScreen
        authBrandImageUrl={authBrandImageUrl}
        authError={authError}
        authForms={authForms}
        authLoading={authLoading}
        authMode={authMode}
        apiBaseUrlDraft={apiBaseUrlDraft}
        apiBaseUrlLabel={savedApiBaseUrl || bundledApiBaseUrl || '当前站点'}
        apiBaseUrlMessage={apiBaseUrlMessage}
        autoLoginEnabled={autoLoginEnabled}
        handleAuthSubmit={handleAuthSubmit}
        handleSavedAccountSelect={handleSavedAccountSelect}
        hydrateLoginFormFromAccount={hydrateLoginFormFromAccount}
        lastSavedAccount={lastSavedAccount}
        rememberAccount={rememberAccount}
        savedAccounts={savedAccounts}
        setAuthError={setAuthError}
        setAuthMode={setAuthMode}
        setAutoLoginEnabled={setAutoLoginEnabled}
        setApiBaseUrlDraft={setApiBaseUrlDraft}
        setRememberAccount={setRememberAccount}
        onResetApiBaseUrl={handleResetApiBaseUrl}
        onSaveApiBaseUrl={handleSaveApiBaseUrl}
        updateAuthForm={(mode, field, value) => {
          setAuthForms((prev) => ({ ...prev, [mode]: { ...prev[mode], [field]: value } }));
        }}
      />
    );
  }

  // ── Content routing ────────────────────────────────────
  const renderAppContent = () => {
    if (activeTab === 'home') {
      return (
        <HomeView
          currentUser={currentUser}
          favoriteTaskIds={favoriteTaskIds}
          formatRmb={formatRmb}
          handleAcceptTask={handleAcceptTask}
          handleToggleFavoriteTask={handleToggleFavoriteTask}
          onAdminDeleteTask={handleAdminDeleteTask}
          onReportTask={handleReportTask}
          selectedTask={selectedTask}
          setSelectedTask={setSelectedTask}
          taskError={taskError}
          taskCategoriesConfig={effectiveTaskCategories}
          tasks={tasks}
        />
      );
    }

    if (activeTab === 'post') {
      return (
        <PostTaskView
          currentUser={currentUser}
          formatRmb={formatRmb}
          isPostingTask={isPostingTask}
          postFormData={postFormData}
          refreshWorkspaceState={refreshWorkspaceState}
          setActiveTab={setActiveTab}
          setPostFormData={setPostFormData}
          setProfileSection={setProfileSection}
          submitTask={submitTask}
          taskCategories={effectiveTaskCategories}
        />
      );
    }

    if (activeTab === 'tasks') {
      return (
        <OrdersView
          currentUser={currentUser}
          favoriteTaskIds={favoriteTaskIds}
          formatRmb={formatRmb}
          handleAcceptTask={handleAcceptTask}
          handleCancelTask={handleCancelTask}
          handleCompleteTask={handleCompleteTask}
          handleDisputeTask={handleDisputeTask}
          handleRejectTask={handleRejectTask}
          handleReviewTask={handleReviewTask}
          handleSubmitTaskCompletion={handleSubmitTaskCompletion}
          handleToggleFavoriteTask={handleToggleFavoriteTask}
          isTaskOwnedByCurrentUser={isTaskOwnedByCurrentUser}
          openChat={openChat}
          orderTab={orderTab}
          setOrderTab={setOrderTab}
          tasks={tasks}
        />
      );
    }

    if (activeTab === 'messages') {
      return (
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
          openChat={openChat}
          onChatInputChange={setChatInput}
          onClose={closeChat}
          onScroll={syncChatPinnedState}
          scrollChatToBottom={scrollChatToBottom}
          sortedChatableTasks={sortedChatableTasks}
        />
      );
    }

    if (profileSection === 'history') {
      return (
        <HistoryView
          closeHistoryView={() => setProfileSection('overview')}
          completedHistoryTasks={completedHistoryTasks}
          completedIncomeTotal={completedIncomeTotal}
          formatDateTime={formatDateTime}
          formatRmb={formatRmb}
          handleManualRefresh={handleManualRefresh}
          isRefreshingProfile={isRefreshingProfile}
          isTaskOwnedByCurrentUser={isTaskOwnedByCurrentUser}
          lastSyncAt={lastSyncAt}
        />
      );
    }

    if (profileSection === 'wallet') {
      return (
        <WalletView
          closeWalletView={() => setProfileSection('overview')}
          currentUser={currentUser}
          formatDateTime={formatDateTime}
          formatRmb={formatRmb}
          formatSignedRmb={formatSignedRmb}
          getBalanceRecordMeta={getBalanceRecordMeta}
          handleManualRefresh={handleManualRefresh}
          isRefreshingProfile={isRefreshingProfile}
          isWalletLoading={isWalletLoading}
          lastSyncAt={lastSyncAt}
          walletError={walletError}
          walletRecords={walletRecords}
        />
      );
    }

    if (profileSection === 'admin') {
      return (
        <AdminView
          adminAdjustAmount={adminAdjustAmount}
          adminAdjustReason={adminAdjustReason}
          adminError={adminError}
          adminKeyword={adminKeyword}
          adminMessage={adminMessage}
          adminPermissionDraft={adminPermissionDraft}
          adminSelectedUser={adminSelectedUser}
          adminUsers={adminUsers}
          adminVerifications={adminVerifications}
          availablePermissions={availablePermissions}
          canAdjustBalance={canAdjustBalance}
          canGrantPermissions={canGrantPermissions}
          canViewUsers={canViewUsers}
          formatDateTime={formatDateTime}
          formatRmb={formatRmb}
          formatSignedRmb={formatSignedRmb}
          getBalanceRecordMeta={getBalanceRecordMeta}
          handleAdminRefresh={handleAdminRefresh}
          isAdminLoading={isAdminLoading}
          isAdminPermissionSubmitting={isAdminPermissionSubmitting}
          isAdminSubmitting={isAdminSubmitting}
          disputedTasks={disputedTasks}
          adminReports={adminReports}
          onAdminAdjustAmountChange={onAdminAdjustAmountChange}
          onAdminAdjustReasonChange={onAdminAdjustReasonChange}
          onAdminKeywordChange={onAdminKeywordChange}
          onAdminSearch={onAdminSearch}
          onApproveVerification={onApproveVerification}
          onBack={() => { setActiveTab('profile'); setProfileSection('overview'); setSelectedTask(null); }}
          onRejectVerification={onRejectVerification}
          onResolveDispute={onResolveDispute}
          onResolveReport={onResolveReport}
          onSelectAdminUser={onSelectAdminUser}
          onDeleteAdminUser={onDeleteAdminUser}
          onSubmitAdminAdjustment={onSubmitAdminAdjustment}
          onSubmitAdminPermissions={onSubmitAdminPermissions}
          onToggleAdminBan={onToggleAdminBan}
          onToggleAdminPermission={onToggleAdminPermission}
        />
      );
    }

    return (
      <ProfileView
        currentUser={currentUser}
        formatDateTime={formatDateTime}
        formatRmb={formatRmb}
        handleEditProfile={handleEditProfile}
        handleLogout={handleLogout}
        handleManualRefresh={handleManualRefresh}
        isEditingProfile={isEditingProfile}
        isRefreshingProfile={isRefreshingProfile}
        lastSyncAt={lastSyncAt}
        onAddressChange={(v) => setProfileDraft((p) => ({ ...p, address: v }))}
        onBioChange={(v) => setProfileDraft((p) => ({ ...p, bio: v }))}
        onCampusChange={(v) => setProfileDraft((p) => ({ ...p, campus: v }))}
        onEmailChange={(v) => setProfileDraft((p) => ({ ...p, email: v }))}
        onNameChange={(v) => setProfileDraft((p) => ({ ...p, name: v }))}
        onOpenAdmin={handleOpenAdminView}
        onOpenHistory={() => setProfileSection('history')}
        onOpenWallet={openWalletView}
        onDeleteAccount={handleDeleteOwnAccount}
        onPhoneChange={(v) => setProfileDraft((p) => ({ ...p, phone: v }))}
        onSaveAvatar={handleSaveAvatar}
        onSaveProfile={handleSaveProfile}
        onSubmitVerification={handleSubmitVerification}
        profileMessage={profileMessage}
        profileMessageTone={profileMessageTone}
        profileForm={profileDraft}
        showAdminEntry={canAccessAdminPanel}
      />
    );
  };

  // ── Layout ─────────────────────────────────────────────
  const isWideContentPage = profileSection === 'admin' || activeTab === 'messages';
  const contentMaxWidthClass = isWideContentPage ? 'max-w-[1480px]' : 'max-w-[1180px]';
  const pageMeta = getCurrentPageMeta();

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 md:px-4 md:py-4">
      <div className="mx-auto grid min-h-screen w-full max-w-[1600px] grid-cols-1 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.16),_transparent_38%),linear-gradient(180deg,_#f8fbff_0%,_#ffffff_24%,_#f8fafc_100%)] shadow-2xl md:min-h-[calc(100vh-2rem)] md:overflow-hidden md:rounded-[32px] md:grid-cols-[88px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)]">
        <SidebarNav activeTab={activeTab} currentUser={currentUser} hasUnreadMessages={hasUnreadMessages} onSelectTab={handleSelectTab} />
        <div className="flex min-h-0 min-w-0 flex-col">
          <div className={`mx-auto flex min-h-0 w-full min-w-0 flex-1 flex-col ${contentMaxWidthClass}`}>
            <AppHeader pageMeta={pageMeta} currentUser={currentUser} onOpenProfile={() => handleSelectTab('profile')} />
            <main className="min-h-0 flex-1 overflow-y-auto pb-24">{renderAppContent()}</main>
          </div>
          <BottomNav activeTab={activeTab} hasUnreadMessages={hasUnreadMessages} onSelectTab={handleSelectTab} />
        </div>
      </div>
      {activeChatTask && !(activeTab === 'messages' && isDesktopMessagesWorkspace) ? (
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
      ) : null}
    </div>
  );
}
