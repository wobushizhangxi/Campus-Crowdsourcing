export const normalizeApiBaseUrl = (value = '') => value.trim().replace(/\/$/, '');

export const requireConfiguredApiBaseUrl = (value) => {
  const normalizedValue = normalizeApiBaseUrl(value ?? '');

  if (!normalizedValue) {
    throw new Error('VITE_API_BASE_URL is required for Android builds.');
  }

  return normalizedValue;
};

export const resolveApiBaseUrlCandidates = ({
  configuredApiBaseUrl = '',
} = {}) => {
  const normalizedConfiguredValue = normalizeApiBaseUrl(configuredApiBaseUrl);

  if (normalizedConfiguredValue) {
    return [normalizedConfiguredValue];
  }

  return [''];
};
