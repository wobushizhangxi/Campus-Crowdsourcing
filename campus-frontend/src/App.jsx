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
import useAccountMemory from './hooks/useAccountMemory';
import useChat from './hooks/useChat';
import useWorkspaceData from './hooks/useWorkspaceData';
import { apiDelete, apiGet, apiPost, apiPut, getRequestErrorMessage, isUnauthorizedError } from './services/api';
import { adminPermissionOptions, hasAdminPermission } from './utils/adminPermissions';
import { clearAuthSession, persistAuthSession, readAuthToken } from './utils/authSession';
import { formatDateTime, formatRmb, formatSignedRmb, getBalanceRecordMeta } from './utils/formatters';
import { readFavoriteTaskIds, toggleFavoriteTaskId, writeFavoriteTaskIds } from './utils/taskFavorites';
import { createInitialAuthForms, emptyUser, mapUserDataToCurrentUser } from './utils/user';

const authBrandImageUrl =
  'https://images.unsplash.com/photo-1741637335289-c99652d3155f?auto=format&fit=crop&fm=jpg&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&q=80&w=1600';

const emptyPostForm = {
  title: '',
  desc: '',
  reward: '',
  category: '快递代取',
  campus: '主校区',
  location: '',
  deadlineAt: '',
};

const defaultTaskCategories = ['快递代取', '跑腿代办', '学习资料', '技术帮助', '其他'];

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [authMode, setAuthMode] = useState('login');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authForms, setAuthForms] = useState(() => createInitialAuthForms());
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(emptyUser);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileDraft, setProfileDraft] = useState(emptyUser);
  const [profileMessage, setProfileMessage] = useState('');
  const [profileSection, setProfileSection] = useState('overview');
  const [orderTab, setOrderTab] = useState('posted');
  const [postFormData, setPostFormData] = useState(emptyPostForm);
  const [isPostingTask, setIsPostingTask] = useState(false);
  const [favoriteTaskIds, setFavoriteTaskIds] = useState([]);

  const [adminKeyword, setAdminKeyword] = useState('');
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminVerifications, setAdminVerifications] = useState([]);
  const [adminSelectedUser, setAdminSelectedUser] = useState(null);
  const [adminAdjustAmount, setAdminAdjustAmount] = useState('');
  const [adminAdjustReason, setAdminAdjustReason] = useState('');
  const [adminError, setAdminError] = useState('');
  const [adminMessage, setAdminMessage] = useState('');
  const [isAdminLoading, setIsAdminLoading] = useState(false);
  const [isAdminSubmitting, setIsAdminSubmitting] = useState(false);
  const [adminPermissionDraft, setAdminPermissionDraft] = useState([]);
  const [isAdminPermissionSubmitting, setIsAdminPermissionSubmitting] = useState(false);
  const [isDesktopMessagesWorkspace, setIsDesktopMessagesWorkspace] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(min-width: 1280px)').matches,
  );

  const hasAttemptedSessionRestoreRef = useRef(false);
  const canAccessAdminPanel = hasAdminPermission(currentUser, 'ADMIN_ACCESS');
  const canViewAdminUsers = hasAdminPermission(currentUser, 'USER_VIEW');
  const canAdjustAdminBalance = hasAdminPermission(currentUser, 'BALANCE_ADJUST');
  const canGrantAdminPermissions = hasAdminPermission(currentUser, 'PERMISSION_GRANT');

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
    setAuthForms((prev) => ({
      ...prev,
      login: {
        ...prev.login,
        password: '',
      },
    }));
    setAuthError('登录状态已过期，请重新登录。');
    setActiveTab('home');
    setAdminUsers([]);
    setAdminVerifications([]);
    setAdminSelectedUser(null);
    setAdminAdjustAmount('');
    setAdminAdjustReason('');
    setAdminError('');
    setAdminMessage('');
    setAdminPermissionDraft([]);
  };

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
  } = useAccountMemory({
    setAuthError,
    setAuthForms,
    setAuthMode,
  });

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
    onUnauthorized: handleSessionExpired,
  });

  const isTaskOwnedByCurrentUser = (task) =>
    task?.authorUsername === currentUser.studentId || task?.author === currentUser.name;
  const effectiveTaskCategories = taskCategories.length > 0 ? taskCategories : defaultTaskCategories;

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

  useEffect(() => {
    setProfileDraft(currentUser);
  }, [currentUser]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1280px)');

    const updateWorkspaceMode = (event) => {
      setIsDesktopMessagesWorkspace(event.matches);
    };

    setIsDesktopMessagesWorkspace(mediaQuery.matches);
    mediaQuery.addEventListener('change', updateWorkspaceMode);

    return () => {
      mediaQuery.removeEventListener('change', updateWorkspaceMode);
    };
  }, []);

  useEffect(() => {
    if (profileSection === 'admin' && !canAccessAdminPanel) {
      setProfileSection('overview');
      setAdminError('当前账号没有管理后台权限。');
    }
  }, [canAccessAdminPanel, profileSection]);

  useEffect(() => {
    if (hasAttemptedSessionRestoreRef.current) {
      return;
    }

    hasAttemptedSessionRestoreRef.current = true;
    const token = readAuthToken();
    if (!token) {
      return;
    }

    let cancelled = false;

    const restoreSession = async () => {
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
        if (!cancelled) {
          setAuthLoading(false);
        }
      }
    };

    restoreSession();

    return () => {
      cancelled = true;
    };
  }, [setLastSyncAt]);

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
        if (!studentId.trim() || !password.trim()) {
          throw new Error('用户名和密码不能为空。');
        }

        await loginWithCredentials(studentId.trim(), password.trim(), {
          rememberAccount,
          autoLogin: autoLoginEnabled,
        });
      } else {
        const { name, studentId, email, password, confirmPassword } = authForms.register;
        if (!name.trim() || !studentId.trim() || !email.trim() || !password.trim()) {
          throw new Error('请填写所有必填注册信息。');
        }
        if (password !== confirmPassword) {
          throw new Error('两次输入的密码不一致。');
        }

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
    setAdminUsers([]);
    setAdminVerifications([]);
    setAdminSelectedUser(null);
    setAdminAdjustAmount('');
    setAdminAdjustReason('');
    setAdminError('');
    setAdminMessage('');
    setAdminPermissionDraft([]);
    hydrateLoginFormFromAccount(lastSavedAccount);
  };

  const handleDeleteOwnAccount = async () => {
    const typedUsername = window.prompt(`注销账号会删除当前账号，并将历史记录显示为已注销用户。请输入用户名 ${currentUser.studentId} 确认：`) || '';
    if (typedUsername !== currentUser.studentId) {
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

  const withAuthHandling = (error, fallbackMessage) => {
    if (isUnauthorizedError(error)) {
      handleSessionExpired();
      return '登录状态已过期，请重新登录。';
    }

    return getRequestErrorMessage(error, fallbackMessage);
  };

  const handleAcceptTask = async (taskId, event) => {
    event?.stopPropagation();
    if (!window.confirm('确认接取该任务吗？')) {
      return;
    }

    try {
      const response = await apiPost(`/api/tasks/${taskId}/accept`);
      if (response.data.code !== 200) {
        throw new Error(response.data.message || '接单失败。');
      }
      window.alert('接单成功。');
      await refreshWorkspaceState({ setProfileMessage, successMessage: '任务列表已更新。' });
    } catch (error) {
      window.alert(withAuthHandling(error, '接单失败。'));
    }
  };

  const handleToggleFavoriteTask = (taskId, event) => {
    event?.stopPropagation();
    if (!currentUser.studentId) {
      return;
    }

    setFavoriteTaskIds((prev) =>
      writeFavoriteTaskIds(currentUser.studentId, toggleFavoriteTaskId(prev, taskId)),
    );
  };

  const handleCompleteTask = async (taskId, event) => {
    event?.stopPropagation();
    if (!window.confirm('确认验收通过并结算该任务吗？')) {
      return;
    }

    try {
      const response = await apiPost(`/api/tasks/${taskId}/approve`);
      if (response.data.code !== 200) {
        throw new Error(response.data.message || '完成任务失败。');
      }
      window.alert('任务已验收完成。');
      await refreshWorkspaceState({ includeWallet: true, setProfileMessage, successMessage: '任务状态已更新。' });
    } catch (error) {
      window.alert(withAuthHandling(error, '完成任务失败。'));
    }
  };

  const handleSubmitTaskCompletion = async (taskId, event) => {
    event?.stopPropagation();
    const note = window.prompt('请输入完成说明：') || '';
    if (!note.trim()) {
      return;
    }

    try {
      const response = await apiPost(`/api/tasks/${taskId}/submit`, { note: note.trim() });
      if (response.data.code !== 200) {
        throw new Error(response.data.message || '提交完成失败。');
      }
      window.alert('任务已提交，等待发布者验收。');
      await refreshWorkspaceState({ setProfileMessage, successMessage: '任务状态已更新。' });
    } catch (error) {
      window.alert(withAuthHandling(error, '提交完成失败。'));
    }
  };

  const handleRejectTask = async (taskId, event) => {
    event?.stopPropagation();
    const reason = window.prompt('请输入驳回原因：') || '';
    if (!reason.trim()) {
      return;
    }

    try {
      const response = await apiPost(`/api/tasks/${taskId}/reject`, { reason: reason.trim() });
      if (response.data.code !== 200) {
        throw new Error(response.data.message || '驳回任务失败。');
      }
      window.alert('任务已驳回，接单人可重新处理。');
      await refreshWorkspaceState({ setProfileMessage, successMessage: '任务状态已更新。' });
    } catch (error) {
      window.alert(withAuthHandling(error, '驳回任务失败。'));
    }
  };

  const handleCancelTask = async (taskId, event) => {
    event?.stopPropagation();
    const reason = window.prompt('请输入取消原因：') || '';
    if (!reason.trim()) {
      return;
    }

    try {
      const response = await apiPost(`/api/tasks/${taskId}/cancel`, { reason: reason.trim() });
      if (response.data.code !== 200) {
        throw new Error(response.data.message || '取消任务失败。');
      }
      window.alert('任务已取消，赏金已退回。');
      await refreshWorkspaceState({ includeWallet: true, setProfileMessage, successMessage: '任务状态已更新。' });
    } catch (error) {
      window.alert(withAuthHandling(error, '取消任务失败。'));
    }
  };

  const handleDisputeTask = async (taskId, event) => {
    event?.stopPropagation();
    const reason = window.prompt('请输入纠纷原因：') || '';
    if (!reason.trim()) {
      return;
    }

    try {
      const response = await apiPost(`/api/tasks/${taskId}/dispute`, { reason: reason.trim() });
      if (response.data.code !== 200) {
        throw new Error(response.data.message || '发起纠纷失败。');
      }
      window.alert('任务已进入纠纷，等待管理员处理。');
      await refreshWorkspaceState({ setProfileMessage, successMessage: '任务状态已更新。' });
    } catch (error) {
      window.alert(withAuthHandling(error, '发起纠纷失败。'));
    }
  };

  const handleReviewTask = async (taskId, event) => {
    event?.stopPropagation();
    const ratingInput = window.prompt('请输入评分（1-5）：') || '';
    const rating = Number(ratingInput);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      window.alert('评分必须是 1 到 5 的整数。');
      return;
    }
    const content = window.prompt('请输入评价内容：') || '';

    try {
      const response = await apiPost(`/api/tasks/${taskId}/reviews`, { rating, content: content.trim() });
      if (response.data.code !== 201) {
        throw new Error(response.data.message || '提交评价失败。');
      }
      window.alert('评价已提交。');
      await refreshWorkspaceState({ setProfileMessage, successMessage: '评价已提交。' });
    } catch (error) {
      window.alert(withAuthHandling(error, '提交评价失败。'));
    }
  };

  const submitTask = async (newTask) => {
    try {
      setIsPostingTask(true);
      const response = await apiPost('/api/tasks', newTask);
      if (response.data.code !== 201) {
        throw new Error(response.data.message || '发布任务失败。');
      }
      return true;
    } catch (error) {
      window.alert(withAuthHandling(error, '发布任务失败。'));
      return false;
    } finally {
      setIsPostingTask(false);
    }
  };

  const handleManualRefresh = async () => {
    await refreshWorkspaceState({ includeWallet: profileSection === 'wallet', setProfileMessage });
  };

  const handleEditProfile = () => {
    setProfileDraft(currentUser);
    setProfileMessage('');
    setIsEditingProfile(true);
  };

  const handleSaveProfile = async (event) => {
    event?.preventDefault();
    setProfileMessage('');

    if (!profileDraft.name.trim()) {
      setProfileMessage('昵称不能为空。');
      return;
    }

    if (profileDraft.email && !/^\S+@\S+\.\S+$/.test(profileDraft.email)) {
      setProfileMessage('请输入有效的邮箱地址。');
      return;
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

      if (response.data.code !== 200) {
        throw new Error(response.data.message || '保存资料失败。');
      }

      const userData = response.data.data;
      setCurrentUser((prev) => mapUserDataToCurrentUser(userData, prev));
      setLastSyncAt(new Date());
      setProfileMessage('资料保存成功。');
      setIsEditingProfile(false);
    } catch (error) {
      setProfileMessage(withAuthHandling(error, '保存资料失败。'));
    }
  };

  const handleSaveAvatar = async (avatarDataUrl) => {
    try {
      setProfileMessage('');
      const response = await apiPut('/api/users/avatar', { avatarDataUrl });
      if (response.data.code !== 200) {
        throw new Error(response.data.message || '保存头像失败。');
      }

      setCurrentUser((prev) => mapUserDataToCurrentUser(response.data.data, prev));
      setProfileDraft((prev) => mapUserDataToCurrentUser(response.data.data, prev));
      setLastSyncAt(new Date());
      setProfileMessage('头像保存成功。');
    } catch (error) {
      const message = withAuthHandling(error, '保存头像失败。');
      setProfileMessage(message);
      throw new Error(message);
    }
  };

  const closeHistoryView = () => {
    setProfileSection('overview');
  };

  const openWalletView = async () => {
    closeChat();
    setSelectedTask(null);
    setActiveTab('profile');
    setProfileSection('wallet');
    await refreshWalletData();
  };

  const closeWalletView = () => {
    setProfileSection('overview');
  };

  const loadAdminUsers = async (keyword = adminKeyword) => {
    if (!canViewAdminUsers) {
      setAdminUsers([]);
      setAdminSelectedUser(null);
      setAdminError('当前账号没有查看用户权限。');
      return;
    }

    try {
      setIsAdminLoading(true);
      setAdminError('');
      const response = await apiGet('/api/admin/users', {
        params: keyword.trim() ? { keyword: keyword.trim() } : {},
      });
      const users = Array.isArray(response.data?.data) ? response.data.data : [];
      setAdminUsers(users);
      if (adminSelectedUser) {
        const stillExists = users.find((user) => user.id === adminSelectedUser.id);
        if (!stillExists) {
          setAdminSelectedUser(null);
          setAdminPermissionDraft([]);
        }
      }
    } catch (error) {
      setAdminError(withAuthHandling(error, '加载用户列表失败。'));
    } finally {
      setIsAdminLoading(false);
    }
  };

  const loadAdminVerifications = async () => {
    if (!canAccessAdminPanel) {
      setAdminVerifications([]);
      return;
    }

    try {
      const response = await apiGet('/api/admin/verifications');
      setAdminVerifications(Array.isArray(response.data?.data) ? response.data.data : []);
    } catch (error) {
      setAdminError(withAuthHandling(error, '加载认证申请失败。'));
    }
  };

  const loadAdminUser = async (userId) => {
    if (!canViewAdminUsers) {
      setAdminSelectedUser(null);
      setAdminPermissionDraft([]);
      setAdminError('当前账号没有查看用户权限。');
      return;
    }

    try {
      setIsAdminLoading(true);
      setAdminError('');
      const response = await apiGet(`/api/admin/users/${userId}`);
      const nextUser = response.data?.data || null;
      setAdminSelectedUser(nextUser);
      setAdminPermissionDraft(Array.isArray(nextUser?.permissions) ? nextUser.permissions : []);
      setAdminMessage('');
      setAdminAdjustAmount('');
      setAdminAdjustReason('');
    } catch (error) {
      setAdminError(withAuthHandling(error, '加载用户详情失败。'));
    } finally {
      setIsAdminLoading(false);
    }
  };

  const openAdminView = async () => {
    if (!canAccessAdminPanel) {
      setAdminError('当前账号没有管理后台权限。');
      return;
    }

    closeChat();
    setSelectedTask(null);
    setActiveTab('profile');
    setProfileSection('admin');
    setAdminMessage('');
    setAdminError('');
    if (canViewAdminUsers) {
      await loadAdminUsers();
    }
    await loadAdminVerifications();
  };

  const handleAdminSearch = async (event) => {
    event?.preventDefault();
    await loadAdminUsers(adminKeyword);
  };

  const handleAdminRefresh = async () => {
    await loadAdminUsers(adminKeyword);
    await loadAdminVerifications();
    if (adminSelectedUser?.id) {
      await loadAdminUser(adminSelectedUser.id);
    }
  };

  const handleSubmitAdminAdjustment = async (event) => {
    event?.preventDefault();
    if (!adminSelectedUser?.id) {
      return;
    }
    if (!canAdjustAdminBalance) {
      setAdminError('当前账号没有调整余额权限。');
      return;
    }

    if (!adminAdjustAmount.trim()) {
      setAdminError('调整金额不能为空。');
      return;
    }
    if (!adminAdjustReason.trim()) {
      setAdminError('调整原因不能为空。');
      return;
    }

    try {
      setIsAdminSubmitting(true);
      setAdminError('');
      const response = await apiPost(`/api/admin/users/${adminSelectedUser.id}/balance-adjustments`, {
        amount: adminAdjustAmount.trim(),
        reason: adminAdjustReason.trim(),
      });
      setAdminSelectedUser(response.data?.data || null);
      setAdminMessage('余额调整成功。');
      setAdminAdjustAmount('');
      setAdminAdjustReason('');
      await loadAdminUsers(adminKeyword);
      await refreshWorkspaceState({ includeWallet: profileSection === 'wallet', silent: true });
    } catch (error) {
      setAdminError(withAuthHandling(error, '调整余额失败。'));
    } finally {
      setIsAdminSubmitting(false);
    }
  };

  const handleToggleAdminPermission = (permissionCode) => {
    setAdminPermissionDraft((prev) =>
      prev.includes(permissionCode)
        ? prev.filter((permission) => permission !== permissionCode)
        : [...prev, permissionCode],
    );
  };

  const handleSubmitAdminPermissions = async (event) => {
    event?.preventDefault();
    if (!adminSelectedUser?.id) {
      return;
    }
    if (!canGrantAdminPermissions) {
      setAdminError('当前账号没有分配权限的权限。');
      return;
    }

    try {
      setIsAdminPermissionSubmitting(true);
      setAdminError('');
      const response = await apiPut(`/api/admin/users/${adminSelectedUser.id}/permissions`, {
        permissions: adminPermissionDraft,
      });
      const nextUser = response.data?.data || null;
      setAdminSelectedUser(nextUser);
      setAdminPermissionDraft(Array.isArray(nextUser?.permissions) ? nextUser.permissions : []);
      setAdminMessage('权限已更新。');
      await loadAdminUsers(adminKeyword);
      await refreshWorkspaceState({ includeWallet: false, silent: true });
    } catch (error) {
      setAdminError(withAuthHandling(error, '更新权限失败。'));
    } finally {
      setIsAdminPermissionSubmitting(false);
    }
  };

  const handleToggleAdminBan = async () => {
    if (!adminSelectedUser?.id) {
      return;
    }
    if (!window.confirm(`确定${adminSelectedUser.banned ? '解封' : '封禁'}该账号吗？`)) {
      return;
    }

    try {
      setIsAdminSubmitting(true);
      setAdminError('');
      const endpoint = adminSelectedUser.banned
        ? `/api/admin/users/${adminSelectedUser.id}/unban`
        : `/api/admin/users/${adminSelectedUser.id}/ban`;
      const response = await apiPost(endpoint);
      const nextUser = response.data?.data || null;
      setAdminSelectedUser(nextUser);
      setAdminMessage(adminSelectedUser.banned ? '账号已解封。' : '账号已封禁。');
      await loadAdminUsers(adminKeyword);
    } catch (error) {
      setAdminError(withAuthHandling(error, '更新封禁状态失败。'));
    } finally {
      setIsAdminSubmitting(false);
    }
  };

  const handleDeleteAdminUser = async () => {
    if (!adminSelectedUser?.id) {
      return;
    }

    const typedUsername = window.prompt(`请输入用户名 ${adminSelectedUser.username} 以确认永久删除：`) || '';
    if (typedUsername !== adminSelectedUser.username) {
      setAdminError('用户名确认不一致，已取消删除。');
      return;
    }

    try {
      setIsAdminSubmitting(true);
      setAdminError('');
      await apiDelete(`/api/admin/users/${adminSelectedUser.id}`);
      setAdminSelectedUser(null);
      setAdminPermissionDraft([]);
      setAdminMessage('账号已永久删除。');
      await loadAdminUsers(adminKeyword);
      await refreshWorkspaceState({ includeWallet: false, silent: true });
    } catch (error) {
      setAdminError(withAuthHandling(error, '删除用户失败。'));
    } finally {
      setIsAdminSubmitting(false);
    }
  };

  const handleAdminApproveVerification = async (userId) => {
    const note = window.prompt('请输入通过说明：') || '';
    try {
      setIsAdminSubmitting(true);
      setAdminError('');
      await apiPost(`/api/admin/verifications/${userId}/approve`, { note: note.trim() });
      setAdminMessage('认证申请已通过。');
      await loadAdminVerifications();
      await loadAdminUsers(adminKeyword);
      await refreshWorkspaceState({ silent: true });
    } catch (error) {
      setAdminError(withAuthHandling(error, '通过认证失败。'));
    } finally {
      setIsAdminSubmitting(false);
    }
  };

  const handleAdminRejectVerification = async (userId) => {
    const note = window.prompt('请输入驳回原因：') || '';
    if (!note.trim()) {
      return;
    }
    try {
      setIsAdminSubmitting(true);
      setAdminError('');
      await apiPost(`/api/admin/verifications/${userId}/reject`, { note: note.trim() });
      setAdminMessage('认证申请已驳回。');
      await loadAdminVerifications();
      await loadAdminUsers(adminKeyword);
    } catch (error) {
      setAdminError(withAuthHandling(error, '驳回认证失败。'));
    } finally {
      setIsAdminSubmitting(false);
    }
  };

  const handleAdminResolveDispute = async (taskId, resolution) => {
    const note = window.prompt(resolution === 'refund' ? '请输入退款处理说明：' : '请输入结算处理说明：') || '';
    if (!note.trim()) {
      return;
    }
    try {
      setIsAdminSubmitting(true);
      setAdminError('');
      await apiPost(`/api/admin/tasks/${taskId}/resolve`, { resolution, note: note.trim() });
      setAdminMessage('纠纷任务已处理。');
      await refreshWorkspaceState({ includeWallet: false, silent: true });
    } catch (error) {
      setAdminError(withAuthHandling(error, '处理纠纷失败。'));
    } finally {
      setIsAdminSubmitting(false);
    }
  };

  const handleSubmitVerification = async ({ campus, studentId, note }) => {
    if (!campus.trim() || !studentId.trim()) {
      setProfileMessage('校区和学号不能为空。');
      return;
    }
    try {
      const response = await apiPost('/api/users/verification/me', {
        campus: campus.trim(),
        studentId: studentId.trim(),
        note: note.trim(),
      });
      if (response.data.code !== 200) {
        throw new Error(response.data.message || '提交认证失败。');
      }
      setCurrentUser((prev) => mapUserDataToCurrentUser(response.data.data, prev));
      setProfileMessage('认证申请已提交成功。');
      setLastSyncAt(new Date());
    } catch (error) {
      setProfileMessage(withAuthHandling(error, '提交认证失败。'));
    }
  };

  const completedHistoryTasks = [...tasks]
    .filter((task) => task.status === 'completed' && (isTaskOwnedByCurrentUser(task) || task.assignee === currentUser.studentId))
    .sort((firstTask, secondTask) => {
      const firstCompletedAt = firstTask.completedAt ? new Date(firstTask.completedAt).getTime() : 0;
      const secondCompletedAt = secondTask.completedAt ? new Date(secondTask.completedAt).getTime() : 0;

      if (firstCompletedAt !== secondCompletedAt) {
        return secondCompletedAt - firstCompletedAt;
      }

      return (secondTask.id || 0) - (firstTask.id || 0);
    });

  const completedIncomeTotal = completedHistoryTasks.reduce((total, task) => {
    if (task.assignee !== currentUser.studentId) {
      return total;
    }
    const reward = Number(task.reward ?? 0);
    return total + (Number.isFinite(reward) ? reward : 0);
  }, 0);

  const disputedTasks = tasks.filter((task) => task.status === 'disputed');

  const handleWorkspaceTabChange = (tabId) => {
    if (activeTab === 'messages' && isDesktopMessagesWorkspace && tabId !== 'messages') {
      closeChat();
    }

    setActiveTab(tabId);
    setSelectedTask(null);
    setProfileSection('overview');
  };

  const getCurrentPageMeta = () => {
    if (profileSection === 'history') {
      return {
        eyebrow: '历史记录',
        title: '任务历史',
        subtitle: '查看已完成任务和结算结果。',
      };
    }

    if (profileSection === 'wallet') {
      return {
        eyebrow: '钱包',
        title: '我的钱包',
        subtitle: '查看余额和最近的余额记录。',
      };
    }

    if (profileSection === 'admin') {
      return {
        eyebrow: '管理',
        title: '管理后台',
        subtitle: '管理用户权限与余额。',
      };
    }

    if (activeTab === 'home') {
      return {
        eyebrow: '校园',
        title: '任务大厅',
        subtitle: '浏览校园内的实时任务需求。',
      };
    }

    if (activeTab === 'tasks') {
      return {
        eyebrow: '订单',
        title: '我的订单',
        subtitle: '跟踪你发布和接取的任务。',
      };
    }

    if (activeTab === 'post') {
      return {
        eyebrow: '发布',
        title: '发布任务',
        subtitle: '创建任务并预留对应赏金。',
      };
    }

    if (activeTab === 'messages') {
      return {
        eyebrow: '消息',
        title: '消息中心',
        subtitle: '按任务与发布者或接单人沟通。',
      };
    }

    return {
      eyebrow: '我的',
      title: '个人中心',
      subtitle: '管理账号、钱包和历史记录。',
    };
  };

  const handleSelectTab = handleWorkspaceTabChange;

  const renderAppContent = () => {
    if (activeTab === 'home') {
      return (
        <HomeView
          currentUser={currentUser}
          favoriteTaskIds={favoriteTaskIds}
          formatRmb={formatRmb}
          handleAcceptTask={handleAcceptTask}
          handleToggleFavoriteTask={handleToggleFavoriteTask}
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
          closeHistoryView={closeHistoryView}
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
          closeWalletView={closeWalletView}
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
          availablePermissions={adminPermissionOptions}
          canAdjustBalance={canAdjustAdminBalance}
          canGrantPermissions={canGrantAdminPermissions}
          canViewUsers={canViewAdminUsers}
          formatDateTime={formatDateTime}
          formatRmb={formatRmb}
          formatSignedRmb={formatSignedRmb}
          getBalanceRecordMeta={getBalanceRecordMeta}
          handleAdminRefresh={handleAdminRefresh}
          isAdminLoading={isAdminLoading}
          isAdminPermissionSubmitting={isAdminPermissionSubmitting}
          isAdminSubmitting={isAdminSubmitting}
          disputedTasks={disputedTasks}
          onAdminAdjustAmountChange={setAdminAdjustAmount}
          onAdminAdjustReasonChange={setAdminAdjustReason}
          onAdminKeywordChange={setAdminKeyword}
          onAdminSearch={handleAdminSearch}
          onApproveVerification={handleAdminApproveVerification}
          onBack={() => {
            setActiveTab('profile');
            setProfileSection('overview');
            setSelectedTask(null);
          }}
          onRejectVerification={handleAdminRejectVerification}
          onResolveDispute={handleAdminResolveDispute}
          onSelectAdminUser={loadAdminUser}
          onDeleteAdminUser={handleDeleteAdminUser}
          onSubmitAdminAdjustment={handleSubmitAdminAdjustment}
          onSubmitAdminPermissions={handleSubmitAdminPermissions}
          onToggleAdminBan={handleToggleAdminBan}
          onToggleAdminPermission={handleToggleAdminPermission}
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
        onAddressChange={(value) => setProfileDraft({ ...profileDraft, address: value })}
        onBioChange={(value) => setProfileDraft({ ...profileDraft, bio: value })}
        onCampusChange={(value) => setProfileDraft({ ...profileDraft, campus: value })}
        onEmailChange={(value) => setProfileDraft({ ...profileDraft, email: value })}
        onNameChange={(value) => setProfileDraft({ ...profileDraft, name: value })}
        onOpenAdmin={openAdminView}
        onOpenHistory={() => setProfileSection('history')}
        onOpenWallet={openWalletView}
        onDeleteAccount={handleDeleteOwnAccount}
        onPhoneChange={(value) => setProfileDraft({ ...profileDraft, phone: value })}
        onSaveAvatar={handleSaveAvatar}
        onSaveProfile={handleSaveProfile}
        onSubmitVerification={handleSubmitVerification}
        profileMessage={profileMessage}
        profileMessageTone={profileMessage.includes('成功') ? 'success' : 'error'}
        profileForm={profileDraft}
        showAdminEntry={canAccessAdminPanel}
      />
    );
  };

  if (!isAuthenticated) {
    return (
      <AuthScreen
        authBrandImageUrl={authBrandImageUrl}
        authError={authError}
        authForms={authForms}
        authLoading={authLoading}
        authMode={authMode}
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
        setRememberAccount={setRememberAccount}
        updateAuthForm={(mode, field, value) => {
          setAuthForms((prev) => ({
            ...prev,
            [mode]: {
              ...prev[mode],
              [field]: value,
            },
          }));
        }}
      />
    );
  }

  const isWideContentPage = profileSection === 'admin' || activeTab === 'messages';
  const contentMaxWidthClass = isWideContentPage ? 'max-w-[1480px]' : 'max-w-[1180px]';
  const pageMeta = getCurrentPageMeta();

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 md:px-4 md:py-4">
      <div className="mx-auto grid min-h-screen w-full max-w-[1600px] grid-cols-1 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.16),_transparent_38%),linear-gradient(180deg,_#f8fbff_0%,_#ffffff_24%,_#f8fafc_100%)] shadow-2xl md:min-h-[calc(100vh-2rem)] md:overflow-hidden md:rounded-[32px] md:grid-cols-[88px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)]">
        <SidebarNav
          activeTab={activeTab}
          currentUser={currentUser}
          hasUnreadMessages={hasUnreadMessages}
          onSelectTab={handleSelectTab}
        />

        <div className="flex min-h-0 min-w-0 flex-col">
          <div className={`mx-auto flex min-h-0 w-full min-w-0 flex-1 flex-col ${contentMaxWidthClass}`}>
            <AppHeader
              pageMeta={pageMeta}
              currentUser={currentUser}
              onOpenProfile={() => handleWorkspaceTabChange('profile')}
            />

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
