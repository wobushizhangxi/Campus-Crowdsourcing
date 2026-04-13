export const adminPermissionOptions = [
  {
    code: 'ADMIN_ACCESS',
    label: '后台访问',
    description: '允许进入管理后台。',
  },
  {
    code: 'USER_VIEW',
    label: '查看用户',
    description: '允许查看用户列表、详情和余额记录。',
  },
  {
    code: 'BALANCE_ADJUST',
    label: '调整余额',
    description: '允许为用户增加或扣减余额。',
  },
  {
    code: 'PERMISSION_GRANT',
    label: '授予权限',
    description: '允许为其他账号配置后台权限。',
  },
];

const adminPermissionLabelMap = Object.fromEntries(
  adminPermissionOptions.map((permission) => [permission.code, permission.label]),
);

export const formatAdminPermissionLabel = (permissionCode) =>
  adminPermissionLabelMap[permissionCode] || permissionCode;

export const hasAdminPermission = (user, permissionCode) =>
  user?.role === 'ADMIN' || Boolean(user?.permissions?.includes(permissionCode));
