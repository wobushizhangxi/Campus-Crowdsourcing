import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle, ClipboardList, Flag, Heart, MapPin, Search, ShieldCheck, SlidersHorizontal, Trash2 } from 'lucide-react';
import { filterAndSortOpenTasks, getTaskCategories } from '../../utils/taskFilters';
import { getVerificationMeta } from '../../utils/formatters';

const getTaskStatusLabel = (status) => {
  if (status === 'open') {
    return '待接单';
  }
  if (status === 'accepted') {
    return '进行中';
  }
  if (status === 'submitted') {
    return '待验收';
  }
  if (status === 'completed') {
    return '已完成';
  }
  if (status === 'cancelled') {
    return '已取消';
  }
  if (status === 'disputed') {
    return '纠纷中';
  }
  return status || '未知';
};

export default function HomeView({
  currentUser,
  favoriteTaskIds = [],
  formatRmb,
  handleAcceptTask,
  handleToggleFavoriteTask,
  onAdminDeleteTask,
  onReportTask,
  selectedTask,
  setSelectedTask,
  taskError,
  taskCategoriesConfig = [],
  tasks,
}) {
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('全部');
  const [sortBy, setSortBy] = useState('latest');

  const totalOpenTasks = useMemo(() => tasks.filter((task) => task.status === 'open'), [tasks]);
  const taskCategories = useMemo(() => getTaskCategories(tasks, taskCategoriesConfig), [taskCategoriesConfig, tasks]);
  const favoriteTaskIdSet = useMemo(() => new Set(favoriteTaskIds.map((taskId) => Number(taskId))), [favoriteTaskIds]);
  const effectiveSelectedCategory = taskCategories.includes(selectedCategory) ? selectedCategory : '全部';
  const openTasks = useMemo(
    () => filterAndSortOpenTasks(tasks, { keyword: searchKeyword, category: effectiveSelectedCategory, sortBy }),
    [effectiveSelectedCategory, searchKeyword, sortBy, tasks],
  );
  const selectedTaskId = selectedTask?.id ?? null;
  const currentSelectedTask = selectedTaskId ? openTasks.find((task) => task.id === selectedTaskId) || null : null;
  const taskStatusLabel = getTaskStatusLabel(currentSelectedTask?.status);
  const desktopSelectedTask = currentSelectedTask;
  const hasAnyOpenTasks = totalOpenTasks.length > 0;
  const isTaskFavorited = (taskId) => favoriteTaskIdSet.has(Number(taskId));
  const isAdmin = currentUser?.role === 'ADMIN';
  const hasActiveFilters = Boolean(searchKeyword.trim()) || effectiveSelectedCategory !== '全部';

  useEffect(() => {
    if (selectedTaskId && !currentSelectedTask) {
      setSelectedTask(null);
    }
  }, [currentSelectedTask, selectedTaskId, setSelectedTask]);

  const resetFilters = () => {
    setSearchKeyword('');
    setSelectedCategory('全部');
    setSortBy('latest');
  };

  const renderFavoriteButton = (task, variant = 'light') => {
    const favorited = isTaskFavorited(task.id);
    const darkMode = variant === 'dark';

    return (
      <button
        type="button"
        onClick={(event) => handleToggleFavoriteTask?.(task.id, event)}
        aria-pressed={favorited}
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition ${
          favorited
            ? darkMode
              ? 'bg-rose-500 text-white'
              : 'bg-rose-100 text-rose-700 hover:bg-rose-200'
            : darkMode
              ? 'bg-white/10 text-white hover:bg-white/15'
              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
        }`}
      >
        <Heart size={14} fill={favorited ? 'currentColor' : 'none'} />
        {favorited ? '已收藏' : '收藏'}
      </button>
    );
  };

  const renderVerificationBadge = (status, variant = 'light') => {
    const meta = getVerificationMeta(status);
    const darkMode = variant === 'dark';

    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${
          darkMode ? 'bg-white/10 text-white' : meta.className
        }`}
      >
        <ShieldCheck size={13} />
        {meta.label}
      </span>
    );
  };

  const renderTaskFilters = () => (
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <SlidersHorizontal size={16} />
        筛选任务
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_150px_150px]">
        <label className="relative block">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={searchKeyword}
            onChange={(event) => setSearchKeyword(event.target.value)}
            placeholder="搜索标题、描述、地点"
            className="w-full rounded-2xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
          />
        </label>
        <select
          value={effectiveSelectedCategory}
          onChange={(event) => setSelectedCategory(event.target.value)}
          className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
        >
          {taskCategories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        <select
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value)}
          className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
        >
          <option value="latest">最新发布</option>
          <option value="reward">赏金最高</option>
        </select>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <span>
          已显示 {openTasks.length} / {totalOpenTasks.length} 个待接任务
        </span>
        {hasActiveFilters ? (
          <button type="button" onClick={resetFilters} className="font-semibold text-cyan-700 transition hover:text-cyan-800">
            清空筛选
          </button>
        ) : null}
      </div>
    </section>
  );

  return (
    <>
      <div className="space-y-4 p-5 xl:hidden">
        {currentSelectedTask ? (
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
                  <h2 className="mt-2 text-2xl font-bold">{currentSelectedTask.title}</h2>
                  <p className="mt-2 text-sm text-slate-300">
                    发布者：{currentSelectedTask.author || '匿名用户'} | 状态：{taskStatusLabel}
                  </p>
                  <div className="mt-3">{renderVerificationBadge(currentSelectedTask.authorVerificationStatus, 'dark')}</div>
                  <div className="mt-3">{renderFavoriteButton(currentSelectedTask, 'dark')}</div>
                </div>
                <div className="rounded-2xl bg-white/10 px-4 py-3 text-right">
                  <p className="text-xs text-slate-300">赏金</p>
                  <p className="text-2xl font-bold">{formatRmb(currentSelectedTask.reward)}</p>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900">任务说明</h3>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600">
                {currentSelectedTask.description || '暂无补充说明。'}
              </p>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900">任务信息</h3>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <span className="text-slate-500">任务编号</span>
                  <span className="font-semibold text-slate-900">{currentSelectedTask.id}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <span className="text-slate-500">发布者</span>
                  <span className="font-semibold text-slate-900">{currentSelectedTask.author || '匿名用户'}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <span className="text-slate-500">发布者认证</span>
                  {renderVerificationBadge(currentSelectedTask.authorVerificationStatus)}
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <span className="text-slate-500">地点</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-slate-900">
                    <MapPin size={14} />
                    {currentSelectedTask.location || currentSelectedTask.campus || '校园内'}
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

            {currentSelectedTask.status === 'open' ? (
              <button
                type="button"
                onClick={() => handleAcceptTask(currentSelectedTask.id)}
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
                <p className="mt-3 text-2xl font-bold text-slate-900">{totalOpenTasks.length}</p>
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

            {renderTaskFilters()}

            {taskError ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                {taskError}
              </div>
            ) : null}

            {openTasks.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
                <p className="text-lg font-semibold text-slate-800">
                  {hasAnyOpenTasks ? '没有匹配的待接任务。' : '当前暂无待接任务。'}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  {hasAnyOpenTasks ? '换个关键词或分类再试试。' : '你可以先发布一个新任务。'}
                </p>
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
                      <p className="mt-2 text-xs text-slate-400">
                        {task.category || '其他'} | {task.location || task.campus || '校园内'}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <span className="rounded-full bg-cyan-100 px-3 py-1 text-sm font-bold text-cyan-700">
                        {formatRmb(task.reward)}
                      </span>
                      {renderFavoriteButton(task)}
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3 text-xs text-slate-500">
                    <span className="inline-flex min-w-0 items-center gap-2">
                      <span className="truncate">发布者：{task.author || '匿名用户'}</span>
                      {renderVerificationBadge(task.authorVerificationStatus)}
                    </span>
                    <div className="flex items-center gap-2">
                      {isAdmin ? (
                        <button
                          type="button"
                          onClick={(event) => { event.stopPropagation(); onAdminDeleteTask?.(task.id); }}
                          className="rounded-full bg-rose-100 p-1.5 text-rose-600 transition hover:bg-rose-200"
                          title="删除帖子"
                        >
                          <Trash2 size={14} />
                        </button>
                      ) : null}
                      {!isAdmin && currentUser?.studentId !== task.authorUsername ? (
                        <button
                          type="button"
                          onClick={(event) => { event.stopPropagation(); onReportTask?.(task.id); }}
                          className="rounded-full bg-amber-100 p-1.5 text-amber-600 transition hover:bg-amber-200"
                          title="举报"
                        >
                          <Flag size={14} />
                        </button>
                      ) : null}
                      <span>任务 #{task.id}</span>
                    </div>
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
              <p className="mt-3 text-2xl font-bold text-slate-900">{totalOpenTasks.length}</p>
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

          {renderTaskFilters()}

          {taskError ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              {taskError}
            </div>
          ) : null}

          {openTasks.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
              <p className="text-lg font-semibold text-slate-800">
                {hasAnyOpenTasks ? '没有匹配的待接任务。' : '当前暂无待接任务。'}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                {hasAnyOpenTasks ? '换个关键词或分类再试试。' : '你可以先发布一个新任务。'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {openTasks.map((task) => {
                const isSelected = desktopSelectedTask?.id === task.id;

                return (
                  <article
                    key={task.id}
                    aria-current={isSelected ? 'true' : undefined}
                    tabIndex={0}
                    onClick={() => setSelectedTask(task)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setSelectedTask(task);
                      }
                    }}
                    className={`w-full rounded-3xl border bg-white p-5 text-left shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 ${
                      isSelected ? 'border-cyan-300 ring-1 ring-cyan-100' : 'border-slate-200 hover:border-cyan-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">{task.title}</h3>
                        <p className="mt-2 text-sm text-slate-500">{task.description || '暂无描述。'}</p>
                        <p className="mt-2 text-xs text-slate-400">
                          {task.category || '其他'} | {task.location || task.campus || '校园内'}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <span className="rounded-full bg-cyan-100 px-3 py-1 text-sm font-bold text-cyan-700">
                          {formatRmb(task.reward)}
                        </span>
                        {renderFavoriteButton(task)}
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-3 text-xs text-slate-500">
                      <span className="inline-flex min-w-0 items-center gap-2">
                        <span className="truncate">发布者：{task.author || '匿名用户'}</span>
                        {renderVerificationBadge(task.authorVerificationStatus)}
                      </span>
                      <div className="flex items-center gap-2">
                        {isAdmin ? (
                          <button
                            type="button"
                            onClick={(event) => { event.stopPropagation(); onAdminDeleteTask?.(task.id); }}
                            className="rounded-full bg-rose-100 p-1.5 text-rose-600 transition hover:bg-rose-200"
                            title="删除帖子"
                          >
                            <Trash2 size={14} />
                          </button>
                        ) : null}
                        {!isAdmin && currentUser?.studentId !== task.authorUsername ? (
                          <button
                            type="button"
                            onClick={(event) => { event.stopPropagation(); onReportTask?.(task.id); }}
                            className="rounded-full bg-amber-100 p-1.5 text-amber-600 transition hover:bg-amber-200"
                            title="举报"
                          >
                            <Flag size={14} />
                          </button>
                        ) : null}
                        <span>任务 #{task.id}</span>
                      </div>
                    </div>
                  </article>
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
                    <div className="mt-3">{renderVerificationBadge(desktopSelectedTask.authorVerificationStatus, 'dark')}</div>
                    <div className="mt-3">{renderFavoriteButton(desktopSelectedTask, 'dark')}</div>
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
                    <span className="text-slate-500">发布者认证</span>
                    {renderVerificationBadge(desktopSelectedTask.authorVerificationStatus)}
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <span className="text-slate-500">地点</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-slate-900">
                      <MapPin size={14} />
                      {desktopSelectedTask.location || desktopSelectedTask.campus || '校园内'}
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
