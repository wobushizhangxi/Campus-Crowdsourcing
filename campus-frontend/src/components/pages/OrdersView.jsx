import { useMemo, useState } from 'react';
import { Heart, MessageSquare, ShieldCheck } from 'lucide-react';
import { formatDateTime, getTaskStatusMeta, getVerificationMeta } from '../../utils/formatters';
import { getFavoriteTasks } from '../../utils/taskFavorites';

export default function OrdersView({
  currentUser,
  favoriteTaskIds = [],
  formatRmb,
  handleAcceptTask,
  handleCancelTask,
  handleCompleteTask,
  handleDisputeTask,
  handleRejectTask,
  handleReviewTask,
  handleSubmitTaskCompletion,
  handleToggleFavoriteTask,
  isTaskOwnedByCurrentUser,
  openChat,
  orderTab,
  setOrderTab,
  tasks,
}) {
  const myPostedTasks = tasks.filter((task) => isTaskOwnedByCurrentUser(task));
  const myAcceptedTasks = tasks.filter((task) => task.assignee === currentUser.studentId);
  const favoriteTaskIdSet = useMemo(() => new Set(favoriteTaskIds.map((taskId) => Number(taskId))), [favoriteTaskIds]);
  const favoriteTasks = getFavoriteTasks(tasks, favoriteTaskIds);
  const displayTasks =
    orderTab === 'posted'
      ? myPostedTasks
      : orderTab === 'favorites'
        ? favoriteTasks
        : myAcceptedTasks;
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const resolvedSelectedOrderId = displayTasks.some((task) => task.id === selectedOrderId)
    ? selectedOrderId
    : displayTasks[0]?.id ?? null;
  const selectedOrder = displayTasks.find((task) => task.id === resolvedSelectedOrderId) || null;

  const renderTaskActions = (task) => {
    const isPublisher = isTaskOwnedByCurrentUser(task);
    const isAssignee = task.assignee === currentUser.studentId;
    const isFavorite = favoriteTaskIdSet.has(Number(task.id));
    const status = task.status;

    return (
      <div className="flex flex-wrap justify-end gap-2">
        {isAssignee && status === 'accepted' ? (
          <button type="button" onClick={(event) => handleSubmitTaskCompletion(task.id, event)} className="rounded-full bg-indigo-100 px-4 py-1.5 text-xs font-bold text-indigo-700 transition hover:bg-indigo-200">
            提交完成
          </button>
        ) : null}
        {isPublisher && status === 'submitted' ? (
          <>
            <button type="button" onClick={(event) => handleCompleteTask(task.id, event)} className="rounded-full bg-emerald-100 px-4 py-1.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-200">
              验收通过
            </button>
            <button type="button" onClick={(event) => handleRejectTask(task.id, event)} className="rounded-full bg-amber-100 px-4 py-1.5 text-xs font-bold text-amber-700 transition hover:bg-amber-200">
              驳回
            </button>
          </>
        ) : null}
        {isPublisher && status === 'open' ? (
          <button type="button" onClick={(event) => handleCancelTask(task.id, event)} className="rounded-full bg-slate-100 px-4 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-200">
            取消任务
          </button>
        ) : null}
        {(isPublisher || isAssignee) && (status === 'accepted' || status === 'submitted') ? (
          <button type="button" onClick={(event) => handleDisputeTask(task.id, event)} className="rounded-full bg-rose-100 px-4 py-1.5 text-xs font-bold text-rose-700 transition hover:bg-rose-200">
            发起纠纷
          </button>
        ) : null}
        {(isPublisher || isAssignee) && status === 'completed' ? (
          <button
            type="button"
            onClick={(event) => handleReviewTask(task.id, event)}
            disabled={!task.currentUserCanReview}
            className="rounded-full bg-cyan-100 px-4 py-1.5 text-xs font-bold text-cyan-700 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
          >
            {task.currentUserReviewSubmitted ? '已评价' : '评价'}
          </button>
        ) : null}
        {!isPublisher && !isAssignee && status === 'open' ? (
          <button type="button" onClick={(event) => handleAcceptTask(task.id, event)} className="rounded-full bg-slate-900 px-4 py-1.5 text-xs font-bold text-white transition hover:bg-slate-800">
            直接接单
          </button>
        ) : null}
        {isFavorite ? (
          <button type="button" onClick={(event) => handleToggleFavoriteTask?.(task.id, event)} className="flex items-center gap-1.5 rounded-full bg-rose-100 px-4 py-1.5 text-xs font-bold text-rose-700 transition hover:bg-rose-200">
            <Heart size={14} fill="currentColor" />
            取消收藏
          </button>
        ) : null}
        {task.assignee && status !== 'completed' && status !== 'cancelled' ? (
          <button type="button" onClick={() => openChat(task)} className="flex items-center gap-1.5 rounded-full bg-cyan-100 px-4 py-1.5 text-xs font-bold text-cyan-700 transition hover:bg-cyan-200">
            <MessageSquare size={14} />
            聊天
          </button>
        ) : null}
      </div>
    );
  };

  const renderOrderCard = (task) => {
    const statusMeta = getTaskStatusMeta(task.status);
    const isSelected = selectedOrder?.id === task.id;

    return (
      <article
        key={task.id}
        className={`rounded-3xl border bg-white p-5 text-sm text-slate-700 shadow-sm transition ${
          isSelected ? 'border-cyan-300 ring-1 ring-cyan-100' : 'border-slate-200 hover:border-cyan-200'
        }`}
      >
        <button type="button" onClick={() => setSelectedOrderId(task.id)} className="w-full text-left">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="block font-bold text-slate-900">{task.title}</span>
              <span className="mt-1 block text-xs text-slate-500">
                {task.category || '其他'} | {task.location || task.campus || '校园内'} | {formatRmb(task.reward)}
              </span>
            </div>
            <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${statusMeta.className}`}>
              {statusMeta.label}
            </span>
          </div>
        </button>
        <div className="mt-4 border-t border-slate-200 pt-3">{renderTaskActions(task)}</div>
      </article>
    );
  };

  return (
    <div className="grid gap-6 p-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-4">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-slate-900">订单总览</h3>
              <p className="mt-1 text-sm text-slate-500">跟踪发布、接单、提交、验收和评价。</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">{displayTasks.length}</span>
          </div>
        </section>

        <div className="flex rounded-2xl bg-slate-100 p-1">
          <button type="button" onClick={() => setOrderTab('posted')} className={`flex-1 rounded-xl py-2 text-sm font-semibold transition ${orderTab === 'posted' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            我发布的
          </button>
          <button type="button" onClick={() => setOrderTab('accepted')} className={`flex-1 rounded-xl py-2 text-sm font-semibold transition ${orderTab === 'accepted' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            我接取的
          </button>
          <button type="button" onClick={() => setOrderTab('favorites')} className={`flex-1 rounded-xl py-2 text-sm font-semibold transition ${orderTab === 'favorites' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            收藏夹
          </button>
        </div>

        {displayTasks.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white px-5 py-8 text-center text-sm text-slate-500 shadow-sm">
            当前列表里还没有任务。
          </div>
        ) : (
          <div className="space-y-4">{displayTasks.map(renderOrderCard)}</div>
        )}
      </div>

      <aside className="space-y-4 self-start xl:sticky xl:top-5">
        {selectedOrder ? (
          <>
            <section className="rounded-3xl bg-slate-900 p-5 text-white shadow-lg">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-cyan-200">当前选中</p>
                  <h2 className="mt-2 text-2xl font-bold">{selectedOrder.title}</h2>
                  <p className="mt-2 text-sm text-slate-300">
                    {getTaskStatusMeta(selectedOrder.status).label} | {formatRmb(selectedOrder.reward)}
                  </p>
                </div>
                <div className="rounded-2xl bg-white/10 px-4 py-3 text-right">
                  <p className="text-xs text-slate-300">任务编号</p>
                  <p className="text-2xl font-bold">#{selectedOrder.id}</p>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900">任务说明</h3>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600">{selectedOrder.description || '暂无补充说明。'}</p>
              <div className="mt-4 space-y-3 text-sm">
                <InfoRow label="分类" value={selectedOrder.category || '其他'} />
                <InfoRow label="地点" value={selectedOrder.location || selectedOrder.campus || '校园内'} />
                <InfoRow label="截止时间" value={formatDateTime(selectedOrder.deadlineAt)} />
                <InfoRow label="发布者" value={selectedOrder.author || '匿名用户'} />
                <VerificationRow label="发布者认证" status={selectedOrder.authorVerificationStatus} />
                <InfoRow label="接单人" value={selectedOrder.assignee || '尚未接单'} />
                <VerificationRow label="接单人认证" status={selectedOrder.assigneeVerificationStatus} />
              </div>
            </section>

            {(selectedOrder.submissionNote || selectedOrder.rejectionReason || selectedOrder.cancelReason || selectedOrder.disputeReason || selectedOrder.resolutionNote) ? (
              <section className="rounded-3xl border border-slate-200 bg-white p-5 text-sm shadow-sm">
                <h3 className="text-lg font-bold text-slate-900">流程记录</h3>
                {selectedOrder.submissionNote ? <p className="mt-3 text-slate-600">提交说明：{selectedOrder.submissionNote}</p> : null}
                {selectedOrder.rejectionReason ? <p className="mt-3 text-amber-700">驳回原因：{selectedOrder.rejectionReason}</p> : null}
                {selectedOrder.cancelReason ? <p className="mt-3 text-slate-600">取消原因：{selectedOrder.cancelReason}</p> : null}
                {selectedOrder.disputeReason ? <p className="mt-3 text-rose-700">纠纷原因：{selectedOrder.disputeReason}</p> : null}
                {selectedOrder.resolutionNote ? <p className="mt-3 text-emerald-700">处理说明：{selectedOrder.resolutionNote}</p> : null}
              </section>
            ) : null}

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">{renderTaskActions(selectedOrder)}</div>
          </>
        ) : (
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-cyan-700">订单详情</p>
            <h3 className="mt-2 text-xl font-bold text-slate-900">从左侧选择一个订单</h3>
            <p className="mt-3 text-sm leading-7 text-slate-500">这里会显示任务状态、说明和下一步动作。</p>
          </section>
        )}
      </aside>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
      <span className="text-slate-500">{label}</span>
      <span className="max-w-[62%] text-right font-semibold text-slate-900">{value || '-'}</span>
    </div>
  );
}

function VerificationRow({ label, status }) {
  const meta = getVerificationMeta(status);

  return (
    <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
      <span className="text-slate-500">{label}</span>
      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${meta.className}`}>
        <ShieldCheck size={13} />
        {meta.label}
      </span>
    </div>
  );
}
