export default function AppHeader({ pageMeta, currentUser, onOpenProfile }) {
  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/88 px-5 pb-4 pt-5 backdrop-blur-xl md:px-6 xl:px-8">
      <div className="flex flex-col items-start gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.34em] text-cyan-600">{pageMeta.eyebrow}</p>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900">{pageMeta.title}</h1>
          <p className="mt-1 max-w-[30rem] text-sm leading-6 text-slate-500 lg:max-w-[40rem]">{pageMeta.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={onOpenProfile}
          className="flex shrink-0 items-center gap-3 rounded-2xl border border-white/70 bg-white/90 px-3 py-2 shadow-sm transition hover:border-cyan-100 hover:shadow"
        >
          {currentUser.avatarUrl ? (
            <img
              src={currentUser.avatarUrl}
              alt=""
              className="h-10 w-10 rounded-2xl object-cover"
            />
          ) : (
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-600 text-sm font-black text-white">
              {(currentUser.name || currentUser.studentId || '用').slice(0, 1).toUpperCase()}
            </span>
          )}
          <span className="text-right">
            <span className="block text-xs font-bold tracking-[0.2em] text-slate-400">账号</span>
            <span className="block max-w-[8rem] truncate text-sm font-semibold text-slate-700 sm:max-w-[11rem] lg:max-w-[14rem]">
              {currentUser.name || currentUser.studentId || '用户'}
            </span>
          </span>
        </button>
      </div>
    </header>
  );
}
