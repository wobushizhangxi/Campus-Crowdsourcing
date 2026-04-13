import { ArrowLeft, LoaderCircle, RefreshCw, ShieldCheck, Wallet } from 'lucide-react';

export default function WalletView({
  closeWalletView,
  currentUser,
  formatDateTime,
  formatRmb,
  formatSignedRmb,
  getBalanceRecordMeta,
  handleManualRefresh,
  isRefreshingProfile,
  isWalletLoading,
  lastSyncAt,
  walletError,
  walletRecords,
}) {
  return (
    <div className="space-y-4 p-5">
      <section className="rounded-3xl bg-slate-900 p-5 text-white shadow-lg">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={closeWalletView}
            className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-white/15"
          >
            <ArrowLeft size={16} />
            返回
          </button>
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isRefreshingProfile}
            className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:bg-white/5"
          >
            {isRefreshingProfile ? <LoaderCircle size={15} className="animate-spin" /> : <RefreshCw size={15} />}
            刷新
          </button>
        </div>

        <div className="mt-4">
          <p className="text-sm text-cyan-200">我的钱包</p>
          <h2 className="mt-2 text-3xl font-black">{formatRmb(currentUser.balance)}</h2>
          <p className="mt-2 text-sm text-slate-300">任务发布时会先预扣赏金，任务完成后再结算给接单人。</p>
        </div>

        <p className="mt-5 text-xs text-slate-300">
          最近同步：{lastSyncAt ? formatDateTime(lastSyncAt) : '尚未同步'}
        </p>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-amber-100 p-3 text-amber-700">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">余额变动由管理员统一管理</h3>
            <p className="mt-1 text-sm text-slate-500">公开充值已关闭，如需调整余额请联系管理员。</p>
          </div>
        </div>

        {walletError ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
            {walletError}
          </div>
        ) : null}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900">余额明细</h3>
            <p className="mt-1 text-sm text-slate-500">查看你账户最近的余额变动记录。</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
            {walletRecords.length}
          </span>
        </div>

        <div className="mt-4 space-y-3">
          {isWalletLoading ? (
            <div className="rounded-2xl bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
              正在加载钱包记录...
            </div>
          ) : walletRecords.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
              暂无余额记录。
            </div>
          ) : (
            walletRecords.map((record) => {
              const recordMeta = getBalanceRecordMeta(record.type);

              return (
                <article
                  key={record.id}
                  className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-700"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900">{record.title || '余额变动'}</h3>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${recordMeta.className}`}>
                          {recordMeta.label}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-slate-500">{record.description || '暂无说明。'}</p>
                    </div>
                    <span className={`shrink-0 text-sm font-bold ${Number(record.amount) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {formatSignedRmb(record.amount)}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-xs text-slate-500">
                    <span>变动后余额：{formatRmb(record.balanceAfter)}</span>
                    <span>{formatDateTime(record.createdAt)}</span>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
