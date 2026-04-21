import { useEffect, useState } from 'react';
import { MessageSquare } from 'lucide-react';

const getOrderStatusLabel = (status) => {
  if (status === 'open') {
    return '寰呮帴鍗?';
  }
  if (status === 'accepted') {
    return '杩涜涓?';
  }
  if (status === 'completed') {
    return '宸插畬鎴?';
  }
  return status || '鏈煡';
};

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
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  useEffect(() => {
    if (displayTasks.length === 0) {
      if (selectedOrderId !== null) {
        setSelectedOrderId(null);
      }
      return;
    }

    const hasSelection = displayTasks.some((task) => task.id === selectedOrderId);
    if (!hasSelection) {
      setSelectedOrderId(displayTasks[0].id);
    }
  }, [displayTasks, selectedOrderId]);

  const selectedOrder = displayTasks.find((task) => task.id === selectedOrderId) || displayTasks[0] || null;

  return (
    <>
      <div className="space-y-4 p-5 xl:hidden">
        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">璁㈠崟鎬昏</h3>
                <p className="mt-1 text-sm text-slate-500">鍦ㄨ繖閲屾煡鐪嬩綘鍙戝竷鐨勪换鍔″拰宸叉帴鍙栫殑浠诲姟銆?</p>
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
              鎴戝彂甯冪殑
            </button>
            <button
              type="button"
              onClick={() => setOrderTab('accepted')}
              className={`flex-1 rounded-xl py-2 text-sm font-semibold transition ${
                orderTab === 'accepted' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              鎴戞帴鍙栫殑
            </button>
          </div>

          <div className="mt-6 space-y-4">
            {displayTasks.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-white px-5 py-8 text-center text-sm text-slate-500 shadow-sm">
                褰撳墠鍒楄〃閲岃繕娌℃湁浠诲姟銆?
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
                        状态：{getOrderStatusLabel(task.status)} | 赏金：{formatRmb(task.reward)}
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
                        鏍囪瀹屾垚
                      </button>
                    ) : null}
                    {task.status !== 'completed' ? (
                      <button
                        type="button"
                        onClick={() => openChat(task)}
                        className="flex items-center gap-1.5 rounded-full bg-cyan-100 px-4 py-1.5 text-xs font-bold text-cyan-700 transition hover:bg-cyan-200"
                      >
                        <MessageSquare size={14} />
                        鎵撳紑鑱婂ぉ
                      </button>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="hidden gap-6 p-5 xl:grid xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">璁㈠崟鎬昏</h3>
                <p className="mt-1 text-sm text-slate-500">鍦ㄨ繖閲屾煡鐪嬩綘鍙戝竷鐨勪换鍔″拰宸叉帴鍙栫殑浠诲姟銆?</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
                {displayTasks.length}
              </span>
            </div>
          </div>

          <div className="flex rounded-2xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setOrderTab('posted')}
              className={`flex-1 rounded-xl py-2 text-sm font-semibold transition ${
                orderTab === 'posted' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              鎴戝彂甯冪殑
            </button>
            <button
              type="button"
              onClick={() => setOrderTab('accepted')}
              className={`flex-1 rounded-xl py-2 text-sm font-semibold transition ${
                orderTab === 'accepted' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              鎴戞帴鍙栫殑
            </button>
          </div>

          {displayTasks.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white px-5 py-8 text-center text-sm text-slate-500 shadow-sm">
              褰撳墠鍒楄〃閲岃繕娌℃湁浠诲姟銆?
            </div>
          ) : (
            <div className="space-y-4">
              {displayTasks.map((task) => {
                const isSelected = selectedOrder?.id === task.id;

                return (
                  <article
                    key={task.id}
                    className={`rounded-3xl border bg-white p-5 text-sm text-slate-700 shadow-sm transition ${
                      isSelected ? 'border-cyan-300 ring-1 ring-cyan-100' : 'border-slate-200 hover:border-cyan-200'
                    }`}
                  >
                    <button
                      type="button"
                      aria-pressed={selectedOrder?.id === task.id}
                      onClick={() => setSelectedOrderId(task.id)}
                      className={`w-full rounded-2xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 ${
                        isSelected ? 'bg-cyan-50/60' : 'bg-transparent'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="block font-bold text-slate-900">{task.title}</span>
                          <span className="mt-1 block text-xs text-slate-500">
                            状态：{getOrderStatusLabel(task.status)} | 赏金：{formatRmb(task.reward)}
                          </span>
                        </div>
                      </div>
                    </button>

                    <div className="mt-4 flex justify-end gap-2 border-t border-slate-200 pt-3">
                      {orderTab === 'posted' && task.status === 'accepted' ? (
                        <button
                          type="button"
                          onClick={(event) => handleCompleteTask(task.id, event)}
                          className="rounded-full bg-emerald-100 px-4 py-1.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-200"
                        >
                          鏍囪瀹屾垚
                        </button>
                      ) : null}
                      {task.status !== 'completed' ? (
                        <button
                          type="button"
                          onClick={() => openChat(task)}
                          className="flex items-center gap-1.5 rounded-full bg-cyan-100 px-4 py-1.5 text-xs font-bold text-cyan-700 transition hover:bg-cyan-200"
                        >
                          <MessageSquare size={14} />
                          鎵撳紑鑱婂ぉ
                        </button>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <aside className="space-y-4 self-start xl:sticky xl:top-5">
          {selectedOrder ? (
            <>
              <section className="rounded-3xl bg-slate-900 p-5 text-white shadow-lg">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-cyan-200">褰撳墠閫変腑</p>
                    <h2 className="mt-2 text-2xl font-bold">{selectedOrder.title}</h2>
                    <p className="mt-2 text-sm text-slate-300">
                      状态：{getOrderStatusLabel(selectedOrder.status)} | 赏金：{formatRmb(selectedOrder.reward)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/10 px-4 py-3 text-right">
                    <p className="text-xs text-slate-300">浠诲姟鍙?</p>
                    <p className="text-2xl font-bold">#{selectedOrder.id}</p>
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900">浠诲姟璇存槑</h3>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600">
                  {selectedOrder.description || '暂无补充说明。'}
                </p>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900">浠诲姟淇℃伅</h3>
                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <span className="text-slate-500">鍙戝竷鑰?</span>
                    <span className="font-semibold text-slate-900">{selectedOrder.author || '鍖垮悕鐢ㄦ埛'}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <span className="text-slate-500">鎺ュ崟浜?</span>
                    <span className="font-semibold text-slate-900">{selectedOrder.assignee || '灏氭湭鎺ュ崟'}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <span className="text-slate-500">鐘舵€?</span>
                    <span className="font-semibold text-emerald-700">{getOrderStatusLabel(selectedOrder.status)}</span>
                  </div>
                </div>
              </section>

              <div className="space-y-2">
                {orderTab === 'posted' && selectedOrder.status === 'accepted' ? (
                  <button
                    type="button"
                    onClick={(event) => handleCompleteTask(selectedOrder.id, event)}
                    className="w-full rounded-2xl bg-emerald-600 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
                  >
                    鏍囪瀹屾垚
                  </button>
                ) : null}
                {selectedOrder.status !== 'completed' ? (
                  <button
                    type="button"
                    onClick={() => openChat(selectedOrder)}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-100 py-3 text-sm font-semibold text-cyan-700 transition hover:bg-cyan-200"
                  >
                    <MessageSquare size={16} />
                    鎵撳紑鑱婂ぉ
                  </button>
                ) : null}
              </div>
            </>
          ) : (
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-cyan-700">璁㈠崟璇︽儏</p>
              <h3 className="mt-2 text-xl font-bold text-slate-900">浠庡乏渚ч€夋嫨涓€涓鍗?</h3>
              <p className="mt-3 text-sm leading-7 text-slate-500">
                杩欓噷浼氭樉绀轰换鍔¤鏄庛€佺姸鎬佸拰鍙墽琛屾搷浣溿€備綘鍙互缁х画鍦ㄥ乏渚у垏鎹㈠垪琛ㄣ€?
              </p>
            </section>
          )}
        </aside>
      </div>
    </>
  );
}
