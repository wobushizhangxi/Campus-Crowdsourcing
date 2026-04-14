const MAX_SAVED_ACCOUNTS = 6;

export const storageKeys = {
  savedAccounts: 'campus.savedAccounts',
  lastAccountUsername: 'campus.lastAccountUsername',
};

export const readStorageValue = (key) => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

export const writeStorageValue = (key, value) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    if (value === null || value === undefined || value === '') {
      window.localStorage.removeItem(key);
      return;
    }

    window.localStorage.setItem(key, value);
  } catch {
    // Ignore storage failures in private mode or restricted contexts.
  }
};

export const readSavedAccounts = () => {
  try {
    const rawValue = readStorageValue(storageKeys.savedAccounts);
    if (!rawValue) {
      return [];
    }

    const parsedValue = JSON.parse(rawValue);
    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue
      .filter((account) => typeof account?.username === 'string' && account.username.trim())
      .map((account) => ({
        username: account.username.trim(),
        name: typeof account?.name === 'string' ? account.name.trim() : '',
        autoLogin: Boolean(account?.autoLogin),
        lastUsedAt: typeof account?.lastUsedAt === 'string' ? account.lastUsedAt : '',
      }))
      .slice(0, MAX_SAVED_ACCOUNTS);
  } catch {
    return [];
  }
};

export const getLastSavedAccount = (accounts) => {
  const normalizedAccounts = Array.isArray(accounts) ? accounts : [];
  const lastAccountUsername = readStorageValue(storageKeys.lastAccountUsername);
  const matchedAccount = normalizedAccounts.find((account) => account.username === lastAccountUsername);
  return matchedAccount || normalizedAccounts[0] || null;
};

export const rememberLoginAccount = (savedAccounts, account) => {
  const normalizedUsername = account.username.trim();
  if (!normalizedUsername) {
    return savedAccounts;
  }

  const nextAccount = {
    username: normalizedUsername,
    name: account.name?.trim() || normalizedUsername,
    autoLogin: Boolean(account.autoLogin),
    lastUsedAt: account.lastUsedAt || new Date().toISOString(),
  };

  return [
    nextAccount,
    ...savedAccounts
      .filter((savedAccount) => savedAccount.username !== normalizedUsername)
      .map((savedAccount) => ({
        ...savedAccount,
        autoLogin: nextAccount.autoLogin ? false : savedAccount.autoLogin,
      })),
  ].slice(0, MAX_SAVED_ACCOUNTS);
};
