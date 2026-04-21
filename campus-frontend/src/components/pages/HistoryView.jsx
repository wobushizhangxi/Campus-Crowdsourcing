import { ArrowLeft, LoaderCircle } from 'lucide-react';

export default function HistoryView({
  closeHistoryView,
  completedHistoryTasks,
  completedIncomeTotal,
  formatDateTime,
  formatRmb,
  handleManualRefresh,
  isRefreshingProfile,
  isTaskOwnedByCurrentUser,
  lastSyncAt,
}) {
  return (
    <div className="space-y-4 p-5 xl:grid xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start xl:gap-4 xl:space-y-0">
      <aside className="space-y-4 xl:sticky xl:top-5 xl:order-2">
        <section className="rounded-3xl bg-slate-900 p-5 text-white shadow-lg">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={closeHistoryView}
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
              {isRefreshingProfile ? <LoaderCircle size={15} className="animate-spin" /> : null}
              刷新
            </button>
          </div>

          <div className="mt-4">
            <p className="text-sm text-cyan-200">历史记录</p>
            <h2 className="mt-2 text-2xl font-bold">已完成任务</h2>
            <p className="mt-2 text-sm text-slate-300">
              查看你发布或完成过的任务，以及对应收入情况。
            </p>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/10 px-4 py-3">
              <p className="text-xs text-slate-300">完成数量</p>
              <p className="mt-1 text-xl font-bold">{completedHistoryTasks.length}</p>
            </div>
            <div className="rounded-2xl bg-white/10 px-4 py-3">
              <p className="text-xs text-slate-300">累计收入</p>
              <p className="mt-1 text-xl font-bold">{formatRmb(completedIncomeTotal)}</p>
            </div>
          </div>

          <p className="mt-4 text-xs text-slate-300">
            最近同步：{lastSyncAt ? formatDateTime(lastSyncAt) : '尚未同步'}
          </p>
        </section>
      </aside>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm xl:order-1">
        {completedHistoryTasks.length === 0 ? (
          <div className="rounded-2xl bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
            还没有已完成任务。
          </div>
        ) : (
          <div className="space-y-3">
            {completedHistoryTasks.map((task) => {
              const isAuthor = isTaskOwnedByCurrentUser(task);
              const counterpartLabel = isAuthor ? '接单人' : '发布者';
              const counterpartValue = isAuthor ? task.assignee || '未知' : task.author || '未知';

              return (
                <article
                  key={task.id}
                  className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-700"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="line-clamp-2 text-base font-bold text-slate-900">
                          {task.title || '未命名任务'}
                        </h3>
                        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-slate-500">
                          #{task.id}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-slate-500">{isAuthor ? '我发布的任务' : '我接取的任务'}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                      {formatRmb(task.reward)}
                    </span>
                  </div>

                  <div className="mt-3 space-y-2 rounded-2xl bg-white px-4 py-3 text-xs text-slate-500">
                    <p>
                      {counterpartLabel}: {counterpartValue}
                    </p>
                    <p>完成时间：{formatDateTime(task.completedAt)}</p>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
