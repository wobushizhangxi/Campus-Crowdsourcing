import { ArrowLeft, LoaderCircle } from 'lucide-react';

const historyCopy = {
  back: '\u8fd4\u56de',
  refresh: '\u5237\u65b0',
  title: '\u5386\u53f2\u8bb0\u5f55',
  headline: '\u5df2\u5b8c\u6210\u4efb\u52a1',
  body: '\u67e5\u770b\u4f60\u53d1\u5e03\u6216\u5b8c\u6210\u8fc7\u7684\u4efb\u52a1\uff0c\u4ee5\u53ca\u5bf9\u5e94\u6536\u5165\u60c5\u51b5\u3002',
  completedCount: '\u5b8c\u6210\u6570\u91cf',
  incomeTotal: '\u7d2f\u8ba1\u6536\u5165',
  recentSync: '\u6700\u8fd1\u540c\u6b65\uff1a',
  notSynced: '\u5c1a\u672a\u540c\u6b65',
  empty: '\u8fd8\u6ca1\u6709\u5df2\u5b8c\u6210\u4efb\u52a1\u3002',
  taskTitle: '\u672a\u547d\u540d\u4efb\u52a1',
  ownerTask: '\u6211\u53d1\u5e03\u7684\u4efb\u52a1',
  assigneeTask: '\u6211\u63a5\u53d6\u7684\u4efb\u52a1',
  counterpartAssignee: '\u63a5\u5355\u4eba',
  counterpartAuthor: '\u53d1\u5e03\u8005',
  unknown: '\u672a\u77e5',
  completedAt: '\u5b8c\u6210\u65f6\u95f4\uff1a',
};

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
              {historyCopy.back}
            </button>
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isRefreshingProfile}
              className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:bg-white/5"
            >
              {isRefreshingProfile ? <LoaderCircle size={15} className="animate-spin" /> : null}
              {historyCopy.refresh}
            </button>
          </div>

          <div className="mt-4">
            <p className="text-sm text-cyan-200">{historyCopy.title}</p>
            <h2 className="mt-2 text-2xl font-bold">{historyCopy.headline}</h2>
            <p className="mt-2 text-sm text-slate-300">{historyCopy.body}</p>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/10 px-4 py-3">
              <p className="text-xs text-slate-300">{historyCopy.completedCount}</p>
              <p className="mt-1 text-xl font-bold">{completedHistoryTasks.length}</p>
            </div>
            <div className="rounded-2xl bg-white/10 px-4 py-3">
              <p className="text-xs text-slate-300">{historyCopy.incomeTotal}</p>
              <p className="mt-1 text-xl font-bold">{formatRmb(completedIncomeTotal)}</p>
            </div>
          </div>

          <p className="mt-4 text-xs text-slate-300">
            {historyCopy.recentSync}
            {lastSyncAt ? formatDateTime(lastSyncAt) : historyCopy.notSynced}
          </p>
        </section>
      </aside>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm xl:order-1">
        {completedHistoryTasks.length === 0 ? (
          <div className="rounded-2xl bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
            {historyCopy.empty}
          </div>
        ) : (
          <div className="space-y-3">
            {completedHistoryTasks.map((task) => {
              const isAuthor = isTaskOwnedByCurrentUser(task);
              const counterpartLabel = isAuthor ? historyCopy.counterpartAssignee : historyCopy.counterpartAuthor;
              const counterpartValue = isAuthor ? task.assignee || historyCopy.unknown : task.author || historyCopy.unknown;

              return (
                <article
                  key={task.id}
                  className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-700"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="line-clamp-2 text-base font-bold text-slate-900">
                          {task.title || historyCopy.taskTitle}
                        </h3>
                        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-slate-500">
                          #{task.id}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-slate-500">
                        {isAuthor ? historyCopy.ownerTask : historyCopy.assigneeTask}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                      {formatRmb(task.reward)}
                    </span>
                  </div>

                  <div className="mt-3 space-y-2 rounded-2xl bg-white px-4 py-3 text-xs text-slate-500">
                    <p>
                      {counterpartLabel}: {counterpartValue}
                    </p>
                    <p>
                      {historyCopy.completedAt}
                      {formatDateTime(task.completedAt)}
                    </p>
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
