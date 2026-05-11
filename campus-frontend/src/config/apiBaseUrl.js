export const normalizeApiBaseUrl = (value = '') => value.trim().replace(/\/$/, '');
export const apiBaseUrlStorageKey = 'campus.apiBaseUrl';

const getLocalStorage = () => (typeof window === 'undefined' ? null : window.localStorage);

export const readSavedApiBaseUrl = (storage = getLocalStorage()) => {
  if (!storage) {
    return '';
  }

  try {
    return normalizeApiBaseUrl(storage.getItem(apiBaseUrlStorageKey) || '');
  } catch {
    return '';
  }
};

export const writeSavedApiBaseUrl = (value, storage = getLocalStorage()) => {
  const normalizedValue = normalizeApiBaseUrl(value ?? '');

  if (!storage) {
    return normalizedValue;
  }

  try {
    if (normalizedValue) {
      storage.setItem(apiBaseUrlStorageKey, normalizedValue);
    } else {
      storage.removeItem(apiBaseUrlStorageKey);
    }
  } catch {
    // Ignore storage failures in restricted WebView/browser contexts.
  }

  return normalizedValue;
};

export const requireConfiguredApiBaseUrl = (value) => {
  const normalizedValue = normalizeApiBaseUrl(value ?? '');

  if (!normalizedValue) {
    throw new Error('VITE_API_BASE_URL is required for Android builds.');
  }

  return normalizedValue;
};

export const resolveApiBaseUrlCandidates = ({
  configuredApiBaseUrl = '',
  savedApiBaseUrl = '',
} = {}) => {
  const normalizedSavedValue = normalizeApiBaseUrl(savedApiBaseUrl);

  if (normalizedSavedValue) {
    return [normalizedSavedValue];
  }

  const normalizedConfiguredValue = normalizeApiBaseUrl(configuredApiBaseUrl);

  if (normalizedConfiguredValue) {
    return [normalizedConfiguredValue];
  }

  return [''];
};
