import { useEffect, useRef, useState } from 'react';
import { apiGet, getRequestErrorMessage, isUnauthorizedError } from '../services/api';
import { mapUserDataToCurrentUser } from '../utils/user';

export default function useWorkspaceData({
  currentUser,
  isAuthenticated,
  profileSection,
  setCurrentUser,
  onUnauthorized,
}) {
  const [tasks, setTasks] = useState([]);
  const [taskError, setTaskError] = useState('');
  const [isRefreshingProfile, setIsRefreshingProfile] = useState(false);
  const [walletRecords, setWalletRecords] = useState([]);
  const [walletError, setWalletError] = useState('');
  const [isWalletLoading, setIsWalletLoading] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState(null);

  const refreshCurrentUserSummaryRef = useRef(null);
  const refreshWalletDataRef = useRef(null);

  const handleUnauthorized = (error) => {
    if (isUnauthorizedError(error)) {
      onUnauthorized?.();
      return true;
    }

    return false;
  };

  const refreshCurrentUserSummary = async () => {
    try {
      const response = await apiGet('/api/auth/me');
      const userData = response.data?.data?.user;
      if (response.data.code === 200 && userData) {
        setCurrentUser((prev) => mapUserDataToCurrentUser(userData, prev));
        return true;
      }

      return false;
    } catch (error) {
      if (handleUnauthorized(error)) {
        return false;
      }
      console.warn('刷新当前用户信息失败。', error);
      return false;
    }
  };

  const refreshWalletData = async ({ silent = false } = {}) => {
    if (!silent) {
      setIsWalletLoading(true);
      setWalletError('');
    }

    try {
      const response = await apiGet('/api/users/balance/me');
      if (response.data.code === 200 && response.data.data) {
        const userData = response.data.data;
        setCurrentUser((prev) => mapUserDataToCurrentUser(userData, prev));
        setWalletRecords(Array.isArray(userData.records) ? userData.records : []);
        if (!silent) {
          setLastSyncAt(new Date());
        }
        return true;
      }

      return false;
    } catch (error) {
      if (handleUnauthorized(error)) {
        return false;
      }
      if (!silent) {
        setWalletError(getRequestErrorMessage(error, '加载钱包详情失败。'));
      }
      return false;
    } finally {
      if (!silent) {
        setIsWalletLoading(false);
      }
    }
  };

  const fetchTasks = async () => {
    try {
      setTaskError('');
      const response = await apiGet('/api/tasks');
      setTasks(Array.isArray(response.data) ? response.data : []);
      return true;
    } catch (error) {
      if (handleUnauthorized(error)) {
        return false;
      }
      setTaskError(getRequestErrorMessage(error, '加载任务列表失败。'));
      setTasks([]);
      return false;
    }
  };

  const refreshWorkspaceState = async ({
    includeWallet = profileSection === 'wallet',
    silent = false,
    successMessage = '内容已刷新。',
    setProfileMessage,
  } = {}) => {
    if (!isAuthenticated) {
      return false;
    }

    if (!silent) {
      setIsRefreshingProfile(true);
      setProfileMessage?.('');
    }

    const refreshers = [
      fetchTasks(),
      refreshCurrentUserSummary(),
    ];

    if (includeWallet) {
      refreshers.push(refreshWalletData({ silent: true }));
    }

    const refreshResults = await Promise.all(refreshers);
    const hasAnySuccess = refreshResults.some(Boolean);

    if (hasAnySuccess) {
      setLastSyncAt(new Date());
    }

    if (!silent) {
      setProfileMessage?.(hasAnySuccess ? successMessage : '刷新失败，请稍后重试。');
      setIsRefreshingProfile(false);
    }

    return hasAnySuccess;
  };

  refreshCurrentUserSummaryRef.current = refreshCurrentUserSummary;
  refreshWalletDataRef.current = refreshWalletData;

  useEffect(() => {
    if (!isAuthenticated || !currentUser.studentId) {
      return undefined;
    }

    let isCancelled = false;
    let intervalId;

    const syncWorkspaceSilently = async () => {
      const refreshers = [
        fetchTasks(),
        refreshCurrentUserSummaryRef.current?.(),
      ];

      if (profileSection === 'wallet') {
        refreshers.push(refreshWalletDataRef.current?.({ silent: true }));
      }

      const refreshResults = await Promise.all(refreshers);

      if (!isCancelled && refreshResults.some(Boolean)) {
        setLastSyncAt(new Date());
      }
    };

    syncWorkspaceSilently();
    intervalId = setInterval(syncWorkspaceSilently, 5000);

    return () => {
      isCancelled = true;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [currentUser.studentId, isAuthenticated, profileSection]);

  return {
    fetchTasks,
    isRefreshingProfile,
    isWalletLoading,
    lastSyncAt,
    refreshCurrentUserSummary,
    refreshWalletData,
    refreshWorkspaceState,
    setIsRefreshingProfile,
    setLastSyncAt,
    setTaskError,
    setTasks,
    setWalletError,
    setWalletRecords,
    taskError,
    tasks,
    walletError,
    walletRecords,
  };
}
