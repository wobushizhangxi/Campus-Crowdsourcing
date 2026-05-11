import axios from 'axios';
import { readAuthToken } from '../utils/authSession';
import { readSavedApiBaseUrl, resolveApiBaseUrlCandidates } from '../config/apiBaseUrl';
import { buildApiRequestHeaders } from './apiHeaders';

const bundledApiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '';
const getApiBaseUrlCandidates = () =>
  resolveApiBaseUrlCandidates({
    configuredApiBaseUrl: bundledApiBaseUrl,
    savedApiBaseUrl: readSavedApiBaseUrl(),
  });

const shouldRetryApiRequest = (error) => {
  const statusCode = error.response?.status;
  return (
    error.code === 'ERR_NETWORK' ||
    error.message === 'Network Error' ||
    statusCode === 502 ||
    statusCode === 503 ||
    statusCode === 504
  );
};

const requestApi = async (method, path, data, config = {}) => {
  let lastError;
  const apiBaseUrlCandidates = getApiBaseUrlCandidates();

  for (let index = 0; index < apiBaseUrlCandidates.length; index += 1) {
    const baseUrl = apiBaseUrlCandidates[index];

    try {
      const token = readAuthToken();
      const headers = buildApiRequestHeaders({
        path,
        token,
        headers: config.headers || {},
      });

      return await axios({
        method,
        url: `${baseUrl}${path}`,
        data,
        ...config,
        headers,
      });
    } catch (error) {
      lastError = error;
      const isLastCandidate = index === apiBaseUrlCandidates.length - 1;

      if (isLastCandidate || !shouldRetryApiRequest(error)) {
        throw error;
      }
    }
  }

  throw lastError;
};

export const apiGet = (path, config) => requestApi('get', path, undefined, config);
export const apiPost = (path, data, config) => requestApi('post', path, data, config);
export const apiPut = (path, data, config) => requestApi('put', path, data, config);
export const apiDelete = (path, config) => requestApi('delete', path, undefined, config);

export const isUnauthorizedError = (error) => error?.response?.status === 401;

export const getRequestErrorMessage = (error, fallbackMessage) => {
  const responseMessage = error.response?.data?.message;
  if (responseMessage) {
    return responseMessage;
  }

  const statusCode = error.response?.status;
  const isNetworkError =
    error.code === 'ERR_NETWORK' ||
    error.message === 'Network Error' ||
    statusCode === 502 ||
    statusCode === 503 ||
    statusCode === 504;

  if (statusCode === 401) {
    return '登录状态已过期，请重新登录。';
  }

  if (statusCode === 403) {
    return '你没有权限执行此操作。';
  }

  if (isNetworkError) {
    return import.meta.env.DEV
      ? '后端服务无法连接，请先启动 campus-backend。'
      : '服务暂时不可用，请稍后再试。';
  }

  return error.message || fallbackMessage;
};
