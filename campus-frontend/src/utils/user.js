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
  avatarUrl: '',
  role: 'USER',
  permissions: [],
  averageRating: 0,
  reviewCount: 0,
  completedAsPublisherCount: 0,
  completedAsAssigneeCount: 0,
  verificationStatus: 'UNVERIFIED',
  verificationCampus: '',
  verificationStudentId: '',
  verificationNote: '',
  verificationSubmittedAt: null,
  verificationReviewedAt: null,
  verificationReviewer: '',
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
  avatarUrl: userData?.avatarUrl || fallbackUser.avatarUrl || '',
  role: userData?.role || fallbackUser.role || 'USER',
  averageRating: Number(userData?.averageRating ?? fallbackUser.averageRating ?? 0),
  reviewCount: Number(userData?.reviewCount ?? fallbackUser.reviewCount ?? 0),
  completedAsPublisherCount: Number(userData?.completedAsPublisherCount ?? fallbackUser.completedAsPublisherCount ?? 0),
  completedAsAssigneeCount: Number(userData?.completedAsAssigneeCount ?? fallbackUser.completedAsAssigneeCount ?? 0),
  verificationStatus: userData?.verificationStatus || fallbackUser.verificationStatus || 'UNVERIFIED',
  verificationCampus: userData?.verificationCampus || fallbackUser.verificationCampus || '',
  verificationStudentId: userData?.verificationStudentId || fallbackUser.verificationStudentId || '',
  verificationNote: userData?.verificationNote || fallbackUser.verificationNote || '',
  verificationSubmittedAt: userData?.verificationSubmittedAt || fallbackUser.verificationSubmittedAt || null,
  verificationReviewedAt: userData?.verificationReviewedAt || fallbackUser.verificationReviewedAt || null,
  verificationReviewer: userData?.verificationReviewer || fallbackUser.verificationReviewer || '',
  permissions: Array.isArray(userData?.permissions)
    ? [...new Set(userData.permissions)]
    : Array.isArray(fallbackUser.permissions)
      ? [...new Set(fallbackUser.permissions)]
      : [],
});
