import { ArrowLeft, LoaderCircle, RefreshCw, ShieldCheck } from 'lucide-react';

const walletCopy = {
  back: '\u8fd4\u56de',
  refresh: '\u5237\u65b0',
  title: '\u6211\u7684\u94b1\u5305',
  heroBody: '\u4efb\u52a1\u53d1\u5e03\u65f6\u4f1a\u5148\u9884\u6263\u8d4f\u91d1\uff0c\u4efb\u52a1\u5b8c\u6210\u540e\u518d\u7ed3\u7b97\u7ed9\u63a5\u5355\u4eba\u3002',
  summaryTitle: '\u4f59\u989d\u53d8\u52a8\u7531\u7ba1\u7406\u5458\u7edf\u4e00\u7ba1\u7406',
  summaryBody: '\u516c\u5f00\u5145\u503c\u5df2\u5173\u95ed\uff0c\u5982\u9700\u8c03\u6574\u4f59\u989d\u8bf7\u8054\u7cfb\u7ba1\u7406\u5458\u3002',
  detailTitle: '\u4f59\u989d\u660e\u7ec6',
  detailBody: '\u67e5\u770b\u8d26\u6237\u6700\u8fd1\u7684\u4f59\u989d\u53d8\u52a8\u8bb0\u5f55\u3002',
  loading: '\u6b63\u5728\u52a0\u8f7d\u94b1\u5305\u8bb0\u5f55...',
  empty: '\u6682\u65e0\u4f59\u989d\u8bb0\u5f55\u3002',
  changeTitle: '\u4f59\u989d\u53d8\u52a8',
  changeDescription: '\u6682\u65e0\u8bf4\u660e\u3002',
  afterBalance: '\u53d8\u52a8\u540e\u4f59\u989d\uff1a',
  recentSync: '\u6700\u8fd1\u540c\u6b65\uff1a',
  notSynced: '\u5c1a\u672a\u540c\u6b65',
};

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
    <div className="space-y-4 p-5 xl:grid xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start xl:gap-4 xl:space-y-0">
      <aside className="space-y-4 xl:sticky xl:top-5 xl:order-2">
        <section className="rounded-3xl bg-slate-900 p-5 text-white shadow-lg">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={closeWalletView}
              className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-white/15"
            >
              <ArrowLeft size={16} />
              {walletCopy.back}
            </button>
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isRefreshingProfile}
              className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:bg-white/5"
            >
              {isRefreshingProfile ? <LoaderCircle size={15} className="animate-spin" /> : <RefreshCw size={15} />}
              {walletCopy.refresh}
            </button>
          </div>

          <div className="mt-4">
            <p className="text-sm text-cyan-200">{walletCopy.title}</p>
            <h2 className="mt-2 text-3xl font-black">{formatRmb(currentUser.balance)}</h2>
            <p className="mt-2 text-sm text-slate-300">{walletCopy.heroBody}</p>
          </div>

          <p className="mt-5 text-xs text-slate-300">
            {walletCopy.recentSync}{lastSyncAt ? formatDateTime(lastSyncAt) : walletCopy.notSynced}
          </p>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-amber-100 p-3 text-amber-700">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">{walletCopy.summaryTitle}</h3>
              <p className="mt-1 text-sm text-slate-500">{walletCopy.summaryBody}</p>
            </div>
          </div>

          {walletError ? (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
              {walletError}
            </div>
          ) : null}
        </section>
      </aside>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm xl:order-1">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900">{walletCopy.detailTitle}</h3>
            <p className="mt-1 text-sm text-slate-500">{walletCopy.detailBody}</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
            {walletRecords.length}
          </span>
        </div>

        <div className="mt-4 space-y-3">
          {isWalletLoading ? (
            <div className="rounded-2xl bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
              {walletCopy.loading}
            </div>
          ) : walletRecords.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
              {walletCopy.empty}
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
                        <h3 className="text-base font-bold text-slate-900">{record.title || walletCopy.changeTitle}</h3>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${recordMeta.className}`}>
                          {recordMeta.label}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-slate-500">{record.description || walletCopy.changeDescription}</p>
                    </div>
                    <span
                      className={`shrink-0 text-sm font-bold ${Number(record.amount) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}
                    >
                      {formatSignedRmb(record.amount)}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-xs text-slate-500">
                    <span>
                      {walletCopy.afterBalance}
                      {formatRmb(record.balanceAfter)}
                    </span>
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
