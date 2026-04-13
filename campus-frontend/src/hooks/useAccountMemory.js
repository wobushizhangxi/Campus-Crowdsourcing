import { useCallback, useState } from 'react';
import {
  getLastSavedAccount,
  readSavedAccounts,
  rememberLoginAccount,
  storageKeys,
  writeStorageValue,
} from '../utils/accountStorage';
import { emptyAuthForms } from '../utils/user';

export default function useAccountMemory({
  setAuthError,
  setAuthForms,
  setAuthMode,
}) {
  const [savedAccounts, setSavedAccounts] = useState(() => readSavedAccounts());
  const [rememberAccount, setRememberAccount] = useState(() => Boolean(getLastSavedAccount(readSavedAccounts())));
  const [autoLoginEnabled, setAutoLoginEnabled] = useState(() => Boolean(getLastSavedAccount(readSavedAccounts())?.autoLogin));

  const lastSavedAccount = getLastSavedAccount(savedAccounts);

  const persistSavedAccounts = useCallback((nextAccounts) => {
    setSavedAccounts(nextAccounts);
    writeStorageValue(storageKeys.savedAccounts, JSON.stringify(nextAccounts));
  }, []);

  const persistLoginAccount = useCallback(({ username, name, remember, autoLogin }) => {
    const normalizedUsername = username.trim();
    if (!normalizedUsername) {
      return;
    }

    if (!remember && !autoLogin) {
      const nextAccounts = savedAccounts.filter((account) => account.username !== normalizedUsername);
      persistSavedAccounts(nextAccounts);
      writeStorageValue(storageKeys.lastAccountUsername, normalizedUsername);
      return;
    }

    const nextAccounts = rememberLoginAccount(savedAccounts, {
      username: normalizedUsername,
      name: name || normalizedUsername,
      autoLogin: Boolean(autoLogin),
      lastUsedAt: new Date().toISOString(),
    });

    persistSavedAccounts(nextAccounts);
    writeStorageValue(storageKeys.lastAccountUsername, normalizedUsername);
  }, [persistSavedAccounts, savedAccounts]);

  const syncSavedAccountIdentity = useCallback((previousUsername, nextUsername, nextName) => {
    const normalizedPreviousUsername = previousUsername?.trim();
    const normalizedNextUsername = nextUsername?.trim();

    if (!normalizedPreviousUsername || !normalizedNextUsername) {
      return;
    }

    const matchedAccount = savedAccounts.find((account) => account.username === normalizedPreviousUsername);
    if (!matchedAccount) {
      return;
    }

    const nextAccounts = rememberLoginAccount(
      savedAccounts.filter((account) => account.username !== normalizedPreviousUsername),
      {
        ...matchedAccount,
        username: normalizedNextUsername,
        name: nextName || matchedAccount.name || normalizedNextUsername,
        lastUsedAt: new Date().toISOString(),
      }
    );

    persistSavedAccounts(nextAccounts);
    writeStorageValue(storageKeys.lastAccountUsername, normalizedNextUsername);
  }, [persistSavedAccounts, savedAccounts]);

  const hydrateLoginFormFromAccount = useCallback((account = lastSavedAccount) => {
    setAuthForms({
      login: {
        studentId: account?.username || '',
        password: '',
      },
      register: emptyAuthForms.register,
    });
    setRememberAccount(Boolean(account));
    setAutoLoginEnabled(Boolean(account?.autoLogin));
  }, [lastSavedAccount, setAuthForms]);

  const handleSavedAccountSelect = useCallback((account) => {
    setAuthMode('login');
    setAuthError('');
    setAuthForms((prev) => ({
      ...prev,
      login: {
        studentId: account.username,
        password: '',
      },
    }));
    setRememberAccount(true);
    setAutoLoginEnabled(Boolean(account.autoLogin));
  }, [setAuthError, setAuthForms, setAuthMode]);

  return {
    autoLoginEnabled,
    handleSavedAccountSelect,
    hydrateLoginFormFromAccount,
    lastSavedAccount,
    persistLoginAccount,
    persistSavedAccounts,
    rememberAccount,
    savedAccounts,
    setAutoLoginEnabled,
    setRememberAccount,
    syncSavedAccountIdentity,
  };
}
