import { ChevronRight, LoaderCircle, RefreshCw, ShieldCheck, Wallet } from 'lucide-react';

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
  onPhoneChange,
  onSaveProfile,
  profileMessage,
  profileMessageTone,
  profileForm,
  showAdminEntry,
}) {
  const roleLabel = currentUser.role === 'ADMIN' ? '管理员' : '普通用户';

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
      </section>
    </div>
  );
}
