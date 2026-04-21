import { ArrowLeft, CheckCircle, ClipboardList, MapPin, ShieldCheck } from 'lucide-react';

const getTaskStatusLabel = (status) => {
  if (status === 'open') {
    return '待接单';
  }
  if (status === 'accepted') {
    return '进行中';
  }
  if (status === 'completed') {
    return '已完成';
  }
  return status || '未知';
};

export default function HomeView({
  currentUser,
  formatRmb,
  handleAcceptTask,
  selectedTask,
  setSelectedTask,
  taskError,
  tasks,
}) {
  const openTasks = tasks.filter((task) => task.status === 'open');
  const taskStatusLabel = getTaskStatusLabel(selectedTask?.status);
  const desktopSelectedTask = selectedTask || null;

  return (
    <>
      <div className="space-y-4 p-5 xl:hidden">
        {selectedTask ? (
          <>
            <section className="rounded-3xl bg-slate-900 p-5 text-white shadow-lg">
              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-white/15"
              >
                <ArrowLeft size={16} />
                返回大厅
              </button>
              <div className="mt-4 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-cyan-200">任务详情</p>
                  <h2 className="mt-2 text-2xl font-bold">{selectedTask.title}</h2>
                  <p className="mt-2 text-sm text-slate-300">
                    发布者：{selectedTask.author || '匿名用户'} | 状态：{taskStatusLabel}
                  </p>
                </div>
                <div className="rounded-2xl bg-white/10 px-4 py-3 text-right">
                  <p className="text-xs text-slate-300">赏金</p>
                  <p className="text-2xl font-bold">{formatRmb(selectedTask.reward)}</p>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900">任务说明</h3>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600">
                {selectedTask.description || '暂无补充说明。'}
              </p>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900">任务信息</h3>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <span className="text-slate-500">任务编号</span>
                  <span className="font-semibold text-slate-900">{selectedTask.id}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <span className="text-slate-500">发布者</span>
                  <span className="font-semibold text-slate-900">{selectedTask.author || '匿名用户'}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <span className="text-slate-500">地点</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-slate-900">
                    <MapPin size={14} />
                    校园内
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <span className="text-slate-500">当前状态</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                    <CheckCircle size={14} />
                    {taskStatusLabel}
                  </span>
                </div>
              </div>
            </section>

            {selectedTask.status === 'open' ? (
              <button
                type="button"
                onClick={() => handleAcceptTask(selectedTask.id)}
                className="w-full rounded-2xl bg-slate-900 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                接取任务
              </button>
            ) : null}
          </>
        ) : (
          <>
            <section className="rounded-3xl bg-slate-900 p-5 text-white shadow-lg">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-cyan-200">欢迎回来</p>
                  <h2 className="mt-1 text-2xl font-bold">{currentUser.name}</h2>
                  <p className="mt-2 text-sm text-slate-300">
                    用户名：{currentUser.studentId} | 已完成：{currentUser.completedCount}
                  </p>
                </div>
                <div className="rounded-2xl bg-white/10 px-4 py-3 text-right">
                  <p className="text-xs text-slate-300">余额</p>
                  <p className="text-2xl font-bold">{formatRmb(currentUser.balance)}</p>
                </div>
              </div>
            </section>

            <section className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <ClipboardList size={16} />
                  待接任务
                </div>
                <p className="mt-3 text-2xl font-bold text-slate-900">{openTasks.length}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <ShieldCheck size={16} />
                  账户状态
                </div>
                <p className="mt-3 text-2xl font-bold text-emerald-600">安全</p>
              </div>
            </section>

            <section className="flex items-center justify-between pt-2">
              <h3 className="text-xl font-bold text-slate-900">任务大厅</h3>
              <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold text-cyan-700">实时</span>
            </section>

            {taskError ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                {taskError}
              </div>
            ) : null}

            {openTasks.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
                <p className="text-lg font-semibold text-slate-800">当前暂无待接任务。</p>
                <p className="mt-2 text-sm text-slate-500">你可以先发布一个新任务。</p>
              </div>
            ) : (
              openTasks.map((task) => (
                <article
                  key={task.id}
                  onClick={() => setSelectedTask(task)}
                  className="cursor-pointer rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-cyan-200 hover:bg-slate-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{task.title}</h3>
                      <p className="mt-2 text-sm text-slate-500">{task.description || '暂无描述。'}</p>
                    </div>
                    <span className="rounded-full bg-cyan-100 px-3 py-1 text-sm font-bold text-cyan-700">
                      {formatRmb(task.reward)}
                    </span>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                    <span>发布者：{task.author || '匿名用户'}</span>
                    <span>任务 #{task.id}</span>
                  </div>
                </article>
              ))
            )}
          </>
        )}
      </div>

      <div className="hidden gap-6 p-5 xl:grid xl:grid-cols-[minmax(0,1.15fr)_380px]">
        <div className="space-y-4">
          <section className="rounded-3xl bg-slate-900 p-5 text-white shadow-lg">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-cyan-200">欢迎回来</p>
                <h2 className="mt-1 text-2xl font-bold">{currentUser.name}</h2>
                <p className="mt-2 text-sm text-slate-300">
                  用户名：{currentUser.studentId} | 已完成：{currentUser.completedCount}
                </p>
              </div>
              <div className="rounded-2xl bg-white/10 px-4 py-3 text-right">
                <p className="text-xs text-slate-300">余额</p>
                <p className="text-2xl font-bold">{formatRmb(currentUser.balance)}</p>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <ClipboardList size={16} />
                待接任务
              </div>
              <p className="mt-3 text-2xl font-bold text-slate-900">{openTasks.length}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <ShieldCheck size={16} />
                账户状态
              </div>
              <p className="mt-3 text-2xl font-bold text-emerald-600">安全</p>
            </div>
          </section>

          <section className="flex items-center justify-between pt-2">
            <h3 className="text-xl font-bold text-slate-900">任务大厅</h3>
            <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold text-cyan-700">实时</span>
          </section>

          {taskError ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              {taskError}
            </div>
          ) : null}

          {openTasks.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
              <p className="text-lg font-semibold text-slate-800">当前暂无待接任务。</p>
              <p className="mt-2 text-sm text-slate-500">你可以先发布一个新任务。</p>
            </div>
          ) : (
            <div className="space-y-4">
              {openTasks.map((task) => {
                const isSelected = desktopSelectedTask?.id === task.id;

                return (
                  <button
                    key={task.id}
                    type="button"
                    aria-pressed={desktopSelectedTask?.id === task.id}
                    onClick={() => setSelectedTask(task)}
                    className={`w-full rounded-3xl border bg-white p-5 text-left shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 ${
                      isSelected ? 'border-cyan-300 ring-1 ring-cyan-100' : 'border-slate-200 hover:border-cyan-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">{task.title}</h3>
                        <p className="mt-2 text-sm text-slate-500">{task.description || '暂无描述。'}</p>
                      </div>
                      <span className="rounded-full bg-cyan-100 px-3 py-1 text-sm font-bold text-cyan-700">
                        {formatRmb(task.reward)}
                      </span>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                      <span>发布者：{task.author || '匿名用户'}</span>
                      <span>任务 #{task.id}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <aside className="space-y-4 self-start xl:sticky xl:top-5">
          {desktopSelectedTask ? (
            <>
              <section className="rounded-3xl bg-slate-900 p-5 text-white shadow-lg">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-cyan-200">选中任务</p>
                    <h2 className="mt-2 text-2xl font-bold">{desktopSelectedTask.title}</h2>
                    <p className="mt-2 text-sm text-slate-300">
                      发布者：{desktopSelectedTask.author || '匿名用户'} | 状态：{taskStatusLabel}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/10 px-4 py-3 text-right">
                    <p className="text-xs text-slate-300">赏金</p>
                    <p className="text-2xl font-bold">{formatRmb(desktopSelectedTask.reward)}</p>
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900">任务说明</h3>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600">
                  {desktopSelectedTask.description || '暂无补充说明。'}
                </p>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900">任务信息</h3>
                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <span className="text-slate-500">任务编号</span>
                    <span className="font-semibold text-slate-900">{desktopSelectedTask.id}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <span className="text-slate-500">发布者</span>
                    <span className="font-semibold text-slate-900">{desktopSelectedTask.author || '匿名用户'}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <span className="text-slate-500">地点</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-slate-900">
                      <MapPin size={14} />
                      校园内
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <span className="text-slate-500">当前状态</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                      <CheckCircle size={14} />
                      {taskStatusLabel}
                    </span>
                  </div>
                </div>
              </section>

              {desktopSelectedTask.status === 'open' ? (
                <button
                  type="button"
                  onClick={() => handleAcceptTask(desktopSelectedTask.id)}
                  className="w-full rounded-2xl bg-slate-900 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  接取任务
                </button>
              ) : null}
            </>
          ) : (
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-cyan-700">任务详情</p>
              <h3 className="mt-2 text-xl font-bold text-slate-900">从左侧选择一个任务</h3>
              <p className="mt-3 text-sm leading-7 text-slate-500">
                这里会显示任务说明、发布者信息和接取操作。保持左侧列表浏览，右侧用于查看选中任务的完整信息。
              </p>
            </section>
          )}
        </aside>
      </div>
    </>
  );
}
