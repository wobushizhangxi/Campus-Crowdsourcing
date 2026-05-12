let onAdminForbidden = null;

export const setAdminForbiddenHandler = (handler) => {
  onAdminForbidden = handler;
};

export const notifyAdminForbidden = (url) => {
  if (onAdminForbidden && url && url.includes('/api/admin')) {
    onAdminForbidden(url);
  }
};
