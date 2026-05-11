import { useState } from 'react';
import { apiDelete, apiGet, apiPost, apiPut } from '../services/api';
import { adminPermissionOptions, hasAdminPermission } from '../utils/adminPermissions';

export default function useAdminPanel({
  currentUser,
  refreshWorkspaceState,
  withAuthHandling,
}) {
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
  const [adminReports, setAdminReports] = useState([]);
  const [isAdminPermissionSubmitting, setIsAdminPermissionSubmitting] = useState(false);

  const canAccessAdminPanel = hasAdminPermission(currentUser, 'ADMIN_ACCESS');
  const canViewAdminUsers = hasAdminPermission(currentUser, 'USER_VIEW');
  const canAdjustAdminBalance = hasAdminPermission(currentUser, 'BALANCE_ADJUST');
  const canGrantAdminPermissions = hasAdminPermission(currentUser, 'PERMISSION_GRANT');

  const resetAdminState = () => {
    setAdminUsers([]);
    setAdminVerifications([]);
    setAdminSelectedUser(null);
    setAdminAdjustAmount('');
    setAdminAdjustReason('');
    setAdminError('');
    setAdminMessage('');
    setAdminPermissionDraft([]);
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

  const loadAdminReports = async () => {
    try {
      const response = await apiGet('/api/admin/reports');
      setAdminReports(Array.isArray(response.data?.data) ? response.data.data : []);
    } catch (error) {
      setAdminError(withAuthHandling(error, '加载举报列表失败。'));
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

  const openAdminView = async (closeChat) => {
    if (!canAccessAdminPanel) {
      setAdminError('当前账号没有管理后台权限。');
      return;
    }

    closeChat();
    setAdminMessage('');
    setAdminError('');
    if (canViewAdminUsers) {
      await loadAdminUsers();
    }
    await loadAdminVerifications();
    await loadAdminReports();
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
    if (!adminSelectedUser?.id) return;
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
      await refreshWorkspaceState({ includeWallet: false, silent: true });
    } catch (error) {
      setAdminError(withAuthHandling(error, '调整余额失败。'));
    } finally {
      setIsAdminSubmitting(false);
    }
  };

  const handleToggleAdminPermission = (permissionCode) => {
    setAdminPermissionDraft((prev) =>
      prev.includes(permissionCode)
        ? prev.filter((p) => p !== permissionCode)
        : [...prev, permissionCode],
    );
  };

  const handleSubmitAdminPermissions = async (event) => {
    event?.preventDefault();
    if (!adminSelectedUser?.id) return;
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
    if (!adminSelectedUser?.id) return;
    if (!window.confirm(`确定${adminSelectedUser.banned ? '解封' : '封禁'}该账号吗？`)) return;

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
    if (!adminSelectedUser?.id) return;

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
    if (!note.trim()) return;
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
    if (!note.trim()) return;
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

  const handleAdminResolveReport = async (reportId, action) => {
    const note = window.prompt(action === 'remove' ? '请输入下架处理说明：' : '请输入忽略处理说明：') || '';
    if (!note.trim()) return;
    try {
      setIsAdminSubmitting(true);
      setAdminError('');
      await apiPost(`/api/admin/reports/${reportId}/resolve`, { action, note: note.trim() });
      setAdminMessage(action === 'remove' ? '帖子已下架。' : '举报已标记为忽略。');
      await loadAdminReports();
      await refreshWorkspaceState({ includeWallet: false, silent: true });
    } catch (error) {
      setAdminError(withAuthHandling(error, '处理举报失败。'));
    } finally {
      setIsAdminSubmitting(false);
    }
  };

  return {
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
    availablePermissions: adminPermissionOptions,
    canAccessAdminPanel,
    canAdjustBalance: canAdjustAdminBalance,
    canGrantPermissions: canGrantAdminPermissions,
    canViewUsers: canViewAdminUsers,
    handleAdminRefresh,
    isAdminLoading,
    isAdminPermissionSubmitting,
    isAdminSubmitting,
    loadAdminUser,
    loadAdminUsers,
    loadAdminVerifications,
    onAdminAdjustAmountChange: setAdminAdjustAmount,
    onAdminAdjustReasonChange: setAdminAdjustReason,
    onAdminKeywordChange: setAdminKeyword,
    onAdminSearch: handleAdminSearch,
    onApproveVerification: handleAdminApproveVerification,
    onDeleteAdminUser: handleDeleteAdminUser,
    onRejectVerification: handleAdminRejectVerification,
    onResolveDispute: handleAdminResolveDispute,
    onResolveReport: handleAdminResolveReport,
    onSelectAdminUser: loadAdminUser,
    onSubmitAdminAdjustment: handleSubmitAdminAdjustment,
    onSubmitAdminPermissions: handleSubmitAdminPermissions,
    onToggleAdminBan: handleToggleAdminBan,
    onToggleAdminPermission: handleToggleAdminPermission,
    openAdminView,
    resetAdminState,
  };
}
