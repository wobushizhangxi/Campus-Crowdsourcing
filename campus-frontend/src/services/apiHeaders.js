const authEntrypointPaths = new Set(['/api/auth/login', '/api/auth/register']);

export const buildApiRequestHeaders = ({ path, token, headers = {} }) => {
  const nextHeaders = { ...headers };

  if (token && !nextHeaders.Authorization && !authEntrypointPaths.has(path)) {
    nextHeaders.Authorization = `Bearer ${token}`;
  }

  return nextHeaders;
};
