import { ArrowLeft, LoaderCircle, RefreshCw, ShieldCheck } from 'lucide-react';

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
              杩斿洖
            </button>
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isRefreshingProfile}
              className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:bg-white/5"
            >
              {isRefreshingProfile ? <LoaderCircle size={15} className="animate-spin" /> : <RefreshCw size={15} />}
              鍒锋柊
            </button>
          </div>

          <div className="mt-4">
            <p className="text-sm text-cyan-200">鎴戠殑閽卞寘</p>
            <h2 className="mt-2 text-3xl font-black">{formatRmb(currentUser.balance)}</h2>
            <p className="mt-2 text-sm text-slate-300">
              浠诲姟鍙戝竷鏃朵細鍏堥鎵ｈ祻閲戯紝浠诲姟瀹屾垚鍚庡啀缁撶畻缁欐帴鍗曚汉銆?
            </p>
          </div>

          <p className="mt-5 text-xs text-slate-300">
            鏈€杩戝悓姝ワ細{lastSyncAt ? formatDateTime(lastSyncAt) : '灏氭湭鍚屾'}
          </p>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-amber-100 p-3 text-amber-700">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">浣欓鍙樺姩鐢辩鐞嗗憳缁熶竴绠＄悊</h3>
              <p className="mt-1 text-sm text-slate-500">鍏紑鍏呭€煎凡鍏抽棴锛屽闇€璋冩暣浣欓璇疯仈绯荤鐞嗗憳銆?</p>
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
            <h3 className="text-lg font-bold text-slate-900">浣欓鏄庣粏</h3>
            <p className="mt-1 text-sm text-slate-500">鏌ョ湅璐︽埛鏈€杩戠殑浣欓鍙樺姩璁板綍銆?</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
            {walletRecords.length}
          </span>
        </div>

        <div className="mt-4 space-y-3">
          {isWalletLoading ? (
            <div className="rounded-2xl bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
              姝ｅ湪鍔犺浇閽卞寘璁板綍...
            </div>
          ) : walletRecords.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
              鏆傛棤浣欓璁板綍銆?
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
                        <h3 className="text-base font-bold text-slate-900">{record.title || '浣欓鍙樺姩'}</h3>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${recordMeta.className}`}>
                          {recordMeta.label}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-slate-500">{record.description || '鏆傛棤璇存槑銆?'}</p>
                    </div>
                    <span
                      className={`shrink-0 text-sm font-bold ${Number(record.amount) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}
                    >
                      {formatSignedRmb(record.amount)}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-xs text-slate-500">
                    <span>鍙樺姩鍚庝綑棰濓細{formatRmb(record.balanceAfter)}</span>
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
