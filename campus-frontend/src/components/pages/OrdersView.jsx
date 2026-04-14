import { MessageSquare } from 'lucide-react';

export default function OrdersView({
  currentUser,
  formatRmb,
  handleCompleteTask,
  isTaskOwnedByCurrentUser,
  openChat,
  orderTab,
  setOrderTab,
  tasks,
}) {
  const myPostedTasks = tasks.filter((task) => isTaskOwnedByCurrentUser(task));
  const myAcceptedTasks = tasks.filter((task) => task.assignee === currentUser.studentId);
  const displayTasks = orderTab === 'posted' ? myPostedTasks : myAcceptedTasks;

  return (
    <div className="space-y-4 p-5">
      <div className="space-y-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-slate-900">订单总览</h3>
              <p className="mt-1 text-sm text-slate-500">在这里查看你发布的任务和已接取的任务。</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
              {displayTasks.length}
            </span>
          </div>
        </div>

        <div className="mt-4 flex rounded-2xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setOrderTab('posted')}
            className={`flex-1 rounded-xl py-2 text-sm font-semibold transition ${
              orderTab === 'posted' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            我发布的
          </button>
          <button
            type="button"
            onClick={() => setOrderTab('accepted')}
            className={`flex-1 rounded-xl py-2 text-sm font-semibold transition ${
              orderTab === 'accepted' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            我接取的
          </button>
        </div>

        <div className="mt-6 space-y-4">
          {displayTasks.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white px-5 py-8 text-center text-sm text-slate-500 shadow-sm">
              当前列表里还没有任务。
            </div>
          ) : (
            displayTasks.map((task) => (
              <div
                key={task.id}
                className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-5 text-sm text-slate-700 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="block font-bold text-slate-900">{task.title}</span>
                    <span className="mt-1 block text-xs text-slate-500">
                      状态：{task.status === 'open' ? '待接单' : task.status === 'accepted' ? '进行中' : task.status === 'completed' ? '已完成' : task.status} | 赏金：{formatRmb(task.reward)}
                    </span>
                  </div>
                </div>

                <div className="mt-1 flex justify-end gap-2 border-t border-slate-200 pt-3">
                  {orderTab === 'posted' && task.status === 'accepted' ? (
                    <button
                      type="button"
                      onClick={(event) => handleCompleteTask(task.id, event)}
                      className="rounded-full bg-emerald-100 px-4 py-1.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-200"
                    >
                      标记完成
                    </button>
                  ) : null}
                  {task.status !== 'completed' ? (
                    <button
                      type="button"
                      onClick={() => openChat(task)}
                      className="flex items-center gap-1.5 rounded-full bg-cyan-100 px-4 py-1.5 text-xs font-bold text-cyan-700 transition hover:bg-cyan-200"
                    >
                      <MessageSquare size={14} />
                      打开聊天
                    </button>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
