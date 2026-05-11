import { useState } from 'react';
import { Camera, ChevronRight, LoaderCircle, RefreshCw, ShieldCheck, Trash2, Upload, Wallet, X } from 'lucide-react';
import { isSupportedAvatarFile } from '../../utils/avatarUtils';
import { formatRating, getVerificationMeta } from '../../utils/formatters';

export default function ProfileView({
  currentUser,
  formatDateTime,
  formatRmb,
  handleEditProfile,
  handleLogout,
  handleManualRefresh,
  isEditingProfile,
  isRefreshingProfile,
  lastSyncAt,
  onAddressChange,
  onBioChange,
  onCampusChange,
  onEmailChange,
  onNameChange,
  onOpenAdmin,
  onOpenHistory,
  onOpenWallet,
  onDeleteAccount,
  onPhoneChange,
  onSaveAvatar,
  onSaveProfile,
  onSubmitVerification,
  profileMessage,
  profileMessageTone,
  profileForm,
  showAdminEntry,
}) {
  const roleLabel = currentUser.role === 'ADMIN' ? '管理员' : '普通用户';
  const verificationMeta = getVerificationMeta(currentUser.verificationStatus);
  const [verificationForm, setVerificationForm] = useState({
    campus: currentUser.verificationCampus || currentUser.campus || '主校区',
    studentId: currentUser.verificationStudentId || '',
    note: currentUser.verificationNote || '',
  });

  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState('');

  const handleAvatarFileChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!isSupportedAvatarFile(file)) {
      setAvatarError('请选择 PNG、JPG 或 WebP 图片（不超过 5MB）。');
      return;
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setAvatarError('');
  };

  const handleSaveAvatar = async () => {
    if (!avatarFile || !onSaveAvatar) return;
    try {
      setIsAvatarUploading(true);
      setAvatarError('');
      await onSaveAvatar(avatarFile);
      URL.revokeObjectURL(avatarPreview);
      setAvatarFile(null);
      setAvatarPreview('');
    } catch (error) {
      setAvatarError(error.message || '头像上传失败。');
    } finally {
      setIsAvatarUploading(false);
    }
  };

  return (
    <div className="space-y-4 p-5 xl:grid xl:grid-cols-[320px_minmax(0,1fr)] xl:items-start xl:gap-4 xl:space-y-0">
      <div className="space-y-4 xl:sticky xl:top-5">
        <section className="rounded-3xl bg-slate-900 p-6 text-white shadow-lg">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-cyan-200">个人中心</p>
              <h2 className="mt-2 text-2xl font-bold">{currentUser.name || '未命名用户'}</h2>
              <p className="mt-2 text-sm text-slate-300">
                {currentUser.studentId || '暂无用户名'} | {currentUser.email || '暂无邮箱'}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <button
                type="button"
                onClick={handleManualRefresh}
                disabled={isRefreshingProfile}
                className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:bg-white/5"
              >
                {isRefreshingProfile ? <LoaderCircle size={16} className="animate-spin" /> : null}
                刷新
              </button>
              <button
                type="button"
                onClick={handleEditProfile}
                className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                编辑资料
              </button>
            </div>
          </div>

          <div className="mt-5 rounded-2xl bg-white/10 p-4">
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/15">
                {avatarPreview || currentUser.avatarUrl ? (
                  <img
                    src={avatarPreview || currentUser.avatarUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Camera size={28} className="text-cyan-100" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white">头像</p>
                <p className="mt-1 text-xs text-slate-300">上传后自动压缩为 256×256 JPEG。</p>
                {avatarError ? <p className="mt-2 text-xs text-rose-200">{avatarError}</p> : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/15">
                    <Upload size={14} />
                    选择图片
                    <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleAvatarFileChange} />
                  </label>
                  {avatarFile ? (
                    <>
                      <button
                        type="button"
                        onClick={handleSaveAvatar}
                        disabled={isAvatarUploading}
                        className="inline-flex items-center gap-2 rounded-full bg-cyan-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-cyan-500/60"
                      >
                        {isAvatarUploading ? <LoaderCircle size={14} className="animate-spin" /> : <Upload size={14} />}
                        保存头像
                      </button>
                      <button
                        type="button"
                        onClick={() => { setAvatarFile(null); setAvatarPreview(''); }}
                        className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/15"
                      >
                        <X size={14} />
                        取消
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onOpenWallet}
              className="rounded-2xl bg-white/10 px-4 py-3 text-left transition hover:bg-white/15"
            >
              <p className="text-xs text-slate-300">余额</p>
              <p className="mt-1 text-xl font-bold">{formatRmb(currentUser.balance)}</p>
              <p className="mt-2 text-[11px] text-cyan-100">查看钱包明细</p>
            </button>
            <div className="rounded-2xl bg-white/10 px-4 py-3">
              <p className="text-xs text-slate-300">已完成任务</p>
              <p className="mt-1 text-xl font-bold">{currentUser.completedCount}</p>
              <p className="mt-2 text-[11px] text-cyan-100">根据已结束任务统计</p>
            </div>
            <div className="rounded-2xl bg-white/10 px-4 py-3">
              <p className="text-xs text-slate-300">信用评分</p>
              <p className="mt-1 text-xl font-bold">{formatRating(currentUser.averageRating)}</p>
              <p className="mt-2 text-[11px] text-cyan-100">{currentUser.reviewCount || 0} 条评价</p>
            </div>
            <div className="rounded-2xl bg-white/10 px-4 py-3">
              <p className="text-xs text-slate-300">校园认证</p>
              <p className="mt-1 text-xl font-bold">{verificationMeta.label}</p>
              <p className="mt-2 text-[11px] text-cyan-100">{currentUser.verificationCampus || '未提交校区'}</p>
            </div>
          </div>

          <p className="mt-4 text-xs text-slate-300">
            最近同步：{lastSyncAt ? formatDateTime(lastSyncAt) : '尚未同步'}
          </p>
        </section>

        <section className="space-y-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <button
            type="button"
            onClick={onOpenHistory}
            className="flex w-full items-center justify-between rounded-2xl bg-slate-50 px-4 py-4 text-left transition hover:bg-slate-100"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-cyan-100 p-3 text-cyan-700">
                <Wallet size={18} />
              </div>
              <div>
                <p className="font-semibold text-slate-900">历史记录</p>
                <p className="mt-1 text-sm text-slate-500">查看已完成任务和结算历史。</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-slate-400" />
          </button>

          {showAdminEntry ? (
            <button
              type="button"
              onClick={onOpenAdmin}
              className="flex w-full items-center justify-between rounded-2xl bg-amber-50 px-4 py-4 text-left transition hover:bg-amber-100"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-amber-100 p-3 text-amber-700">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">管理后台</p>
                  <p className="mt-1 text-sm text-slate-500">管理用户并调整账户余额。</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-slate-400" />
            </button>
          ) : null}

          <button
            type="button"
            onClick={onDeleteAccount}
            className="flex w-full items-center justify-between rounded-2xl bg-rose-50 px-4 py-4 text-left transition hover:bg-rose-100"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-rose-100 p-3 text-rose-700">
                <Trash2 size={18} />
              </div>
              <div>
                <p className="font-semibold text-rose-700">注销账号</p>
                <p className="mt-1 text-sm text-rose-500">删除账号并匿名保留历史记录。</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-rose-300" />
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full rounded-2xl border border-rose-200 bg-rose-50 py-3 font-semibold text-rose-600 transition hover:bg-rose-100"
          >
            退出登录
          </button>
        </section>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">个人资料</h3>
            <p className="mt-1 text-sm text-slate-500">及时更新联系方式，方便任务沟通与协作。</p>
          </div>
          {isEditingProfile ? (
            <button
              type="button"
              onClick={onSaveProfile}
              className="inline-flex items-center gap-2 rounded-full bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-700"
            >
              <RefreshCw size={15} />
              保存
            </button>
          ) : null}
        </div>

        {profileMessage ? (
          <div
            className={`mt-4 rounded-2xl px-4 py-3 text-sm ${
              profileMessageTone === 'success'
                ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border border-rose-200 bg-rose-50 text-rose-600'
            }`}
          >
            {profileMessage}
          </div>
        ) : null}

        {isEditingProfile ? (
          <div className="mt-4 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">昵称</span>
              <input
                type="text"
                value={profileForm.name}
                onChange={(event) => onNameChange(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">邮箱</span>
              <input
                type="email"
                value={profileForm.email}
                onChange={(event) => onEmailChange(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">手机号</span>
              <input
                type="text"
                value={profileForm.phone}
                onChange={(event) => onPhoneChange(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">校区</span>
              <input
                type="text"
                value={profileForm.campus}
                onChange={(event) => onCampusChange(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">地址</span>
              <input
                type="text"
                value={profileForm.address}
                onChange={(event) => onAddressChange(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">个人简介</span>
              <textarea
                rows="4"
                value={profileForm.bio}
                onChange={(event) => onBioChange(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
              />
            </label>
          </div>
        ) : (
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between rounded-2xl bg-slate-50 px-4 py-3">
              <span className="text-slate-500">昵称</span>
              <span className="font-semibold text-slate-900">{currentUser.name || '-'}</span>
            </div>
            <div className="flex justify-between rounded-2xl bg-slate-50 px-4 py-3">
              <span className="text-slate-500">用户名</span>
              <span className="font-semibold text-slate-900">{currentUser.studentId || '-'}</span>
            </div>
            <div className="flex justify-between rounded-2xl bg-slate-50 px-4 py-3">
              <span className="text-slate-500">手机号</span>
              <span className="font-semibold text-slate-900">{currentUser.phone || '-'}</span>
            </div>
            <div className="flex justify-between rounded-2xl bg-slate-50 px-4 py-3">
              <span className="text-slate-500">校区</span>
              <span className="max-w-[60%] text-right font-semibold text-slate-900">{currentUser.campus || '-'}</span>
            </div>
            <div className="flex justify-between rounded-2xl bg-slate-50 px-4 py-3">
              <span className="text-slate-500">邮箱</span>
              <span className="font-semibold text-slate-900">{currentUser.email || '-'}</span>
            </div>
            <div className="flex justify-between rounded-2xl bg-slate-50 px-4 py-3">
              <span className="text-slate-500">角色</span>
              <span className="font-semibold text-slate-900">{roleLabel}</span>
            </div>
          </div>
        )}

        {!isEditingProfile ? (
          <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-4">
            <p className="text-sm font-medium text-slate-500">个人简介</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700">
              {currentUser.bio || '这个人很低调，还没有填写个人简介。'}
            </p>
          </div>
        ) : null}

        {!isEditingProfile ? (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-slate-900">校园认证</p>
                <p className="mt-1 text-xs text-slate-500">认证状态会展示在任务和订单信任信息中。</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${verificationMeta.className}`}>
                {verificationMeta.label}
              </span>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <input
                type="text"
                value={verificationForm.campus}
                onChange={(event) => setVerificationForm({ ...verificationForm, campus: event.target.value })}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                placeholder="校区"
              />
              <input
                type="text"
                value={verificationForm.studentId}
                onChange={(event) => setVerificationForm({ ...verificationForm, studentId: event.target.value })}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                placeholder="学号"
              />
            </div>
            <textarea
              rows="3"
              value={verificationForm.note}
              onChange={(event) => setVerificationForm({ ...verificationForm, note: event.target.value })}
              className="mt-3 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
              placeholder="补充说明"
            />
            <button
              type="button"
              onClick={() => onSubmitVerification(verificationForm)}
              className="mt-3 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              提交认证申请
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
