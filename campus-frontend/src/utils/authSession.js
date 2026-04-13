const storageKeys = {
  localToken: 'campus.authToken',
  sessionToken: 'campus.sessionToken',
};

const getLocalStorage = () => (typeof window === 'undefined' ? null : window.localStorage);
const getSessionStorage = () => (typeof window === 'undefined' ? null : window.sessionStorage);

const readStorage = (storage, key) => {
  if (typeof window === 'undefined' || !storage) {
    return '';
  }

  try {
    return storage.getItem(key) || '';
  } catch {
    return '';
  }
};

const writeStorage = (storage, key, value) => {
  if (typeof window === 'undefined' || !storage) {
    return;
  }

  try {
    if (!value) {
      storage.removeItem(key);
      return;
    }

    storage.setItem(key, value);
  } catch {
    // Ignore storage failures in restricted contexts.
  }
};

export const readAuthToken = () =>
  readStorage(getLocalStorage(), storageKeys.localToken) ||
  readStorage(getSessionStorage(), storageKeys.sessionToken);

export const persistAuthSession = (token, persist) => {
  writeStorage(getLocalStorage(), storageKeys.localToken, persist ? token : '');
  writeStorage(getSessionStorage(), storageKeys.sessionToken, persist ? '' : token);
};

export const clearAuthSession = () => {
  writeStorage(getLocalStorage(), storageKeys.localToken, '');
  writeStorage(getSessionStorage(), storageKeys.sessionToken, '');
};
