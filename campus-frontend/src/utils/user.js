import { getLastSavedAccount, readSavedAccounts } from './accountStorage';

export const emptyAuthForms = {
  login: { studentId: '', password: '' },
  register: { name: '', studentId: '', email: '', password: '', confirmPassword: '' },
};

export const emptyUser = {
  id: null,
  name: '',
  balance: 0,
  completedCount: 0,
  studentId: '',
  email: '',
  phone: '',
  campus: '主校区',
  address: '',
  bio: '这个人很低调，还没有填写个人简介。',
  role: 'USER',
  permissions: [],
};

export const createInitialAuthForms = () => {
  const lastSavedAccount = getLastSavedAccount(readSavedAccounts());

  return {
    login: {
      studentId: lastSavedAccount?.username || '',
      password: '',
    },
    register: { ...emptyAuthForms.register },
  };
};

export const mapUserDataToCurrentUser = (userData, fallbackUser = emptyUser) => ({
  ...fallbackUser,
  id: userData?.id ?? fallbackUser.id ?? null,
  name: userData?.name || fallbackUser.name || '',
  balance: Number(userData?.balance ?? fallbackUser.balance ?? 0),
  completedCount: Number(userData?.completedCount ?? fallbackUser.completedCount ?? 0),
  studentId: userData?.username || fallbackUser.studentId || '',
  email: userData?.email || '',
  phone: userData?.phone || '',
  campus: userData?.campus || fallbackUser.campus || '主校区',
  address: userData?.address || '',
  bio: userData?.bio || fallbackUser.bio || '这个人很低调，还没有填写个人简介。',
  role: userData?.role || fallbackUser.role || 'USER',
  permissions: Array.isArray(userData?.permissions)
    ? [...new Set(userData.permissions)]
    : Array.isArray(fallbackUser.permissions)
      ? [...new Set(fallbackUser.permissions)]
      : [],
});
