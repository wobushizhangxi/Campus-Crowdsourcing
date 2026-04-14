import { LoaderCircle, PlusCircle } from 'lucide-react';

export default function PostTaskView({
  currentUser,
  formatRmb,
  isPostingTask,
  postFormData,
  refreshWorkspaceState,
  setActiveTab,
  setPostFormData,
  setProfileSection,
  submitTask,
}) {
  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!postFormData.title.trim() || !postFormData.reward.trim()) {
      return;
    }

    const rewardValue = Number(postFormData.reward);
    if (!Number.isFinite(rewardValue) || rewardValue <= 0) {
      window.alert('请输入有效的悬赏金额。');
      return;
    }

    if (currentUser.balance < rewardValue) {
      window.alert('余额不足，请联系管理员调整余额。');
      setActiveTab('profile');
      setProfileSection('wallet');
      return;
    }

    if (!window.confirm(`确认发布该任务，并预扣 ${formatRmb(rewardValue)} 吗？`)) {
      return;
    }

    const wasPosted = await submitTask({
      title: postFormData.title,
      description: postFormData.desc,
      reward: rewardValue.toFixed(2),
    });

    if (!wasPosted) {
      return;
    }

    window.alert('任务发布成功。');
    setPostFormData({ title: '', desc: '', reward: '' });
    await refreshWorkspaceState({ includeWallet: true, successMessage: '任务已发布。' });
    setActiveTab('home');
  };

  return (
    <div className="space-y-4 p-5">
      <div className="space-y-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-slate-900">发布前提示</h3>
              <p className="mt-1 text-sm text-slate-500">发布任务后会先从你的当前余额中预扣赏金，待任务完成后再结算给接单人。</p>
            </div>
            <div className="rounded-2xl bg-cyan-50 px-4 py-3 text-right">
              <p className="text-xs font-semibold text-cyan-700">当前余额</p>
              <p className="mt-1 text-lg font-bold text-slate-900">{formatRmb(currentUser.balance)}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">任务标题</span>
            <input
              type="text"
              required
              placeholder="例如：帮我取快递"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
              value={postFormData.title}
              onChange={(event) => setPostFormData({ ...postFormData, title: event.target.value })}
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">任务描述</span>
            <textarea
              required
              rows="4"
              placeholder="请填写地点、时间和具体要求。"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
              value={postFormData.desc}
              onChange={(event) => setPostFormData({ ...postFormData, desc: event.target.value })}
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">赏金</span>
            <input
              type="number"
              required
              min="0.01"
              step="0.01"
              placeholder="5.00"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
              value={postFormData.reward}
              onChange={(event) => setPostFormData({ ...postFormData, reward: event.target.value })}
            />
          </label>

          <button
            type="submit"
            disabled={isPostingTask}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-600 py-3 font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-cyan-300"
          >
            {isPostingTask ? <LoaderCircle size={18} className="animate-spin" /> : <PlusCircle size={18} />}
            发布任务
          </button>
        </form>
      </div>
    </div>
  );
}
