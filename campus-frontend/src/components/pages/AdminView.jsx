import { ArrowLeft, LoaderCircle, RefreshCw, Search, ShieldCheck } from 'lucide-react';
import { formatAdminPermissionLabel } from '../../utils/adminPermissions';
import { getTaskStatusMeta, getVerificationMeta } from '../../utils/formatters';

export default function AdminView({
  adminAdjustAmount,
  adminAdjustReason,
  adminError,
  adminKeyword,
  adminMessage,
  adminPermissionDraft,
  adminSelectedUser,
  adminUsers,
  adminVerifications = [],
  availablePermissions,
  canAdjustBalance,
  canGrantPermissions,
  canViewUsers,
  disputedTasks = [],
  formatDateTime,
  formatRmb,
  formatSignedRmb,
  getBalanceRecordMeta,
  handleAdminRefresh,
  isAdminLoading,
  isAdminPermissionSubmitting,
  isAdminSubmitting,
  onAdminAdjustAmountChange,
  onAdminAdjustReasonChange,
  onAdminKeywordChange,
  onAdminSearch,
  onApproveVerification,
  onBack,
  onDeleteAdminUser,
  onRejectVerification,
  onResolveDispute,
  onSelectAdminUser,
  onSubmitAdminAdjustment,
  onSubmitAdminPermissions,
  onToggleAdminBan,
  onToggleAdminPermission,
}) {
  const formatRole = (role) => (role === 'ADMIN' ? '管理员' : role === 'USER' ? '普通用户' : role);

  return (
    <div className="space-y-4 p-5 lg:space-y-5 lg:p-6">
      <section className="rounded-3xl bg-slate-900 p-5 text-white shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-white/15"
          >
            <ArrowLeft size={16} />
            返回
          </button>
          <button
            type="button"
            onClick={handleAdminRefresh}
            disabled={isAdminLoading}
            className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:bg-white/5"
          >
            {isAdminLoading ? <LoaderCircle size={15} className="animate-spin" /> : <RefreshCw size={15} />}
            刷新
          </button>
        </div>

        <div className="mt-4">
          <p className="text-sm text-cyan-200">管理后台</p>
          <h2 className="mt-2 text-2xl font-bold">用户管理</h2>
          <p className="mt-2 text-sm text-slate-300">搜索用户，调整权限与余额，并执行封禁/删除操作。</p>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <form onSubmit={onAdminSearch} className="flex flex-col gap-3 sm:flex-row">
          <label className="flex flex-1 items-center rounded-2xl border border-slate-200 px-4 py-3 focus-within:border-cyan-500 focus-within:ring-4 focus-within:ring-cyan-100">
            <Search size={16} className="text-slate-400" />
            <input
              type="text"
              value={adminKeyword}
              onChange={(event) => onAdminKeywordChange(event.target.value)}
              className="ml-3 w-full border-none bg-transparent outline-none"
              disabled={!canViewUsers}
              placeholder="按用户名或昵称搜索"
            />
          </label>
          <button
            type="submit"
            disabled={!canViewUsers}
            className="rounded-2xl bg-cyan-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-cyan-300"
          >
            搜索
          </button>
        </form>

        {adminError ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
            {adminError}
          </div>
        ) : null}

        {adminMessage ? (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {adminMessage}
          </div>
        ) : null}

        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">校园认证审核</h3>
                <p className="mt-1 text-xs text-slate-500">处理用户提交的校区与学号认证申请。</p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600">
                {adminVerifications.length}
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {adminVerifications.length === 0 ? (
                <div className="rounded-2xl bg-white px-4 py-6 text-center text-sm text-slate-500">暂无待审核认证。</div>
              ) : (
                adminVerifications.map((user) => {
                  const verificationMeta = getVerificationMeta(user.verificationStatus);
                  return (
                    <article key={user.id} className="rounded-2xl bg-white p-4 text-sm shadow-sm">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-bold text-slate-900">{user.name || user.username}</h4>
                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${verificationMeta.className}`}>
                              {verificationMeta.label}
                            </span>
                          </div>
                          <p className="mt-2 text-xs text-slate-500">
                            {user.username} | {user.verificationCampus || user.campus || '未填写校区'} | {user.verificationStudentId || '未填写学号'}
                          </p>
                          {user.verificationNote ? (
                            <p className="mt-2 rounded-2xl bg-slate-50 px-3 py-2 text-xs leading-6 text-slate-600">{user.verificationNote}</p>
                          ) : null}
                          <p className="mt-2 text-xs text-slate-400">{formatDateTime(user.verificationSubmittedAt)}</p>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <button
                            type="button"
                            onClick={() => onApproveVerification(user.id)}
                            disabled={isAdminSubmitting}
                            className="rounded-2xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
                          >
                            通过
                          </button>
                          <button
                            type="button"
                            onClick={() => onRejectVerification(user.id)}
                            disabled={isAdminSubmitting}
                            className="rounded-2xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-rose-300"
                          >
                            驳回
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">纠纷任务处理</h3>
                <p className="mt-1 text-xs text-slate-500">在退款与结算之间做最终裁定。</p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600">
                {disputedTasks.length}
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {disputedTasks.length === 0 ? (
                <div className="rounded-2xl bg-white px-4 py-6 text-center text-sm text-slate-500">暂无纠纷任务。</div>
              ) : (
                disputedTasks.map((task) => {
                  const taskStatusMeta = getTaskStatusMeta(task.status);
                  return (
                    <article key={task.id} className="rounded-2xl bg-white p-4 text-sm shadow-sm">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-bold text-slate-900">{task.title}</h4>
                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${taskStatusMeta.className}`}>
                              {taskStatusMeta.label}
                            </span>
                          </div>
                          <p className="mt-2 text-xs text-slate-500">
                            发布者：{task.authorUsername || task.author || '-'} | 接单人：{task.assignee || '-'} | 赏金：{formatRmb(task.reward)}
                          </p>
                          {task.disputeReason ? (
                            <p className="mt-2 rounded-2xl bg-rose-50 px-3 py-2 text-xs leading-6 text-rose-700">{task.disputeReason}</p>
                          ) : null}
                          <p className="mt-2 text-xs text-slate-400">提交时间：{formatDateTime(task.submittedAt || task.updatedAt || task.createdAt)}</p>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => onResolveDispute(task.id, 'refund')}
                            disabled={isAdminSubmitting}
                            className="rounded-2xl bg-sky-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-sky-300"
                          >
                            退款
                          </button>
                          <button
                            type="button"
                            onClick={() => onResolveDispute(task.id, 'complete')}
                            disabled={isAdminSubmitting}
                            className="rounded-2xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
                          >
                            结算
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-4 2xl:grid-cols-[360px_minmax(0,1fr)]">
          <div className="space-y-3 2xl:max-h-[calc(100vh-20rem)] 2xl:overflow-y-auto 2xl:pr-1">
            {!canViewUsers ? (
              <div className="rounded-2xl bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">当前账号没有查看用户权限。</div>
            ) : adminUsers.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">没有匹配的用户。</div>
            ) : (
              adminUsers.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => onSelectAdminUser(user.id)}
                  className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                    adminSelectedUser?.id === user.id
                      ? 'border-cyan-200 bg-cyan-50'
                      : 'border-slate-200 bg-white hover:border-cyan-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">{user.name || user.username}</p>
                      <p className="mt-1 text-xs text-slate-500">{user.username} | {formatRole(user.role)}</p>
                      {user.banned ? <p className="mt-1 text-[11px] font-semibold text-rose-600">已封禁</p> : null}
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600">
                      {formatRmb(user.balance)}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="min-w-0 space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
            {adminSelectedUser ? (
              <>
                <div className="rounded-2xl bg-white p-4 shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm text-slate-500">当前选中用户</p>
                      <h3 className="mt-1 text-lg font-bold text-slate-900">{adminSelectedUser.name || adminSelectedUser.username}</h3>
                      <p className="mt-1 text-sm text-slate-500">{adminSelectedUser.username} | {formatRole(adminSelectedUser.role)}</p>
                      <div className="mt-2">
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${adminSelectedUser.banned ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {adminSelectedUser.banned ? '已封禁' : '正常'}
                        </span>
                      </div>
                    </div>
                    <div className="rounded-2xl bg-amber-50 px-4 py-3 text-right text-amber-700 sm:min-w-[180px]">
                      <ShieldCheck size={18} className="ml-auto" />
                      <p className="mt-1 text-xs font-semibold">余额</p>
                      <p className="text-lg font-bold text-slate-900">{formatRmb(adminSelectedUser.balance)}</p>
                    </div>
                  </div>

                  {adminSelectedUser.role !== 'ADMIN' ? (
                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={onToggleAdminBan}
                        disabled={isAdminSubmitting}
                        className={`rounded-2xl px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-70 ${
                          adminSelectedUser.banned ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-500 hover:bg-amber-600'
                        }`}
                      >
                        {adminSelectedUser.banned ? '解封账号' : '封禁账号'}
                      </button>
                      <button
                        type="button"
                        onClick={onDeleteAdminUser}
                        disabled={isAdminSubmitting}
                        className="rounded-2xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        永久删除
                      </button>
                    </div>
                  ) : null}
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  <form onSubmit={onSubmitAdminPermissions} className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h4 className="text-base font-bold text-slate-900">权限配置</h4>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
                        {adminSelectedUser.role === 'ADMIN' ? '管理员' : `${adminPermissionDraft.length} 项`}
                      </span>
                    </div>

                    {adminSelectedUser.role === 'ADMIN' ? (
                      <div className="rounded-2xl bg-amber-50 px-4 py-4 text-sm text-amber-700">
                        管理员角色默认拥有全部后台权限。
                      </div>
                    ) : canGrantPermissions ? (
                      <>
                        <div className="space-y-3">
                          {availablePermissions.map((permission) => (
                            <label
                              key={permission.code}
                              className="flex items-start gap-3 rounded-2xl border border-slate-200 px-4 py-3 transition hover:border-cyan-200 hover:bg-slate-50"
                            >
                              <input
                                type="checkbox"
                                checked={adminPermissionDraft.includes(permission.code)}
                                onChange={() => onToggleAdminPermission(permission.code)}
                                className="mt-1 h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                              />
                              <span className="block min-w-0">
                                <span className="block text-sm font-semibold text-slate-900">{permission.label}</span>
                                <span className="mt-1 block text-xs text-slate-500">{permission.description}</span>
                                <span className="mt-1 block text-[11px] text-slate-400">{formatAdminPermissionLabel(permission.code)}</span>
                              </span>
                            </label>
                          ))}
                        </div>
                        <button
                          type="submit"
                          disabled={isAdminPermissionSubmitting}
                          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                        >
                          {isAdminPermissionSubmitting ? <LoaderCircle size={16} className="animate-spin" /> : null}
                          保存权限
                        </button>
                      </>
                    ) : (
                      <div className="rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-500">当前账号没有分配权限的权限。</div>
                    )}
                  </form>

                  {canAdjustBalance ? (
                    <form onSubmit={onSubmitAdminAdjustment} className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
                      <h4 className="text-base font-bold text-slate-900">手动调整余额</h4>
                      <label className="block">
                        <span className="mb-2 block text-sm font-medium text-slate-700">调整金额</span>
                        <input
                          type="number"
                          step="0.01"
                          value={adminAdjustAmount}
                          onChange={(event) => onAdminAdjustAmountChange(event.target.value)}
                          className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                          placeholder="输入负数可扣减余额"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-2 block text-sm font-medium text-slate-700">调整原因</span>
                        <textarea
                          rows="3"
                          value={adminAdjustReason}
                          onChange={(event) => onAdminAdjustReasonChange(event.target.value)}
                          className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                          placeholder="请输入调整原因"
                        />
                      </label>
                      <button
                        type="submit"
                        disabled={isAdminSubmitting}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-500 py-3 font-semibold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-amber-300"
                      >
                        {isAdminSubmitting ? <LoaderCircle size={16} className="animate-spin" /> : null}
                        提交调整
                      </button>
                    </form>
                  ) : (
                    <div className="rounded-2xl bg-white px-4 py-4 text-sm text-slate-500 shadow-sm">当前账号没有调整余额权限。</div>
                  )}
                </div>

                <div className="rounded-2xl bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h4 className="text-base font-bold text-slate-900">最近余额记录</h4>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
                      {adminSelectedUser.records?.length || 0}
                    </span>
                  </div>

                  <div className="mt-4 space-y-3">
                    {(adminSelectedUser.records || []).length === 0 ? (
                      <div className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">暂无余额记录。</div>
                    ) : (
                      adminSelectedUser.records.map((record) => {
                        const meta = getBalanceRecordMeta(record.type);
                        return (
                          <article key={record.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-700">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h5 className="font-bold text-slate-900">{record.title || '余额变动'}</h5>
                                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${meta.className}`}>
                                    {meta.label}
                                  </span>
                                </div>
                                <p className="mt-2 text-xs text-slate-500">{record.description || '暂无说明。'}</p>
                              </div>
                              <span className={`text-sm font-bold ${Number(record.amount) >= 0 ? 'text-emerald-600' : 'text-rose-600'} sm:text-right`}>
                                {formatSignedRmb(record.amount)}
                              </span>
                            </div>
                            <div className="mt-3 flex flex-col gap-2 rounded-2xl bg-white px-4 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                              <span>变动后余额：{formatRmb(record.balanceAfter)}</span>
                              <span>{formatDateTime(record.createdAt)}</span>
                            </div>
                          </article>
                        );
                      })
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-2xl bg-white px-4 py-10 text-center text-sm text-slate-500 shadow-sm">
                请选择一个用户查看详情。
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
