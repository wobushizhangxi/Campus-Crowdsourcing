import { ClipboardList, Home, MessageSquare, PlusCircle, User } from 'lucide-react';

const navItems = [
  { id: 'home', label: '首页', description: '浏览任务大厅', icon: Home },
  { id: 'tasks', label: '订单', description: '跟踪任务进度', icon: ClipboardList },
  { id: 'post', label: '发布', description: '创建新任务', icon: PlusCircle, featured: true },
  { id: 'messages', label: '消息', description: '查看未读会话', icon: MessageSquare },
  { id: 'profile', label: '我的', description: '管理个人资料', icon: User },
];

function SidebarItem({ activeTab, description, featured = false, hasUnreadMessages, icon, id, label, onSelectTab }) {
  const isActive = activeTab === id;
  const IconComponent = icon;

  return (
    <button
      type="button"
      onClick={() => onSelectTab(id)}
      aria-label={label}
      title={label}
      className={`group relative flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition md:justify-center xl:justify-start ${
        featured
          ? isActive
            ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/20'
            : 'bg-cyan-50 text-cyan-700 hover:bg-cyan-100'
          : isActive
            ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10'
            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      <span
        className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl transition ${
          featured
            ? isActive
              ? 'bg-white/15'
              : 'bg-white text-cyan-700'
            : isActive
              ? 'bg-white/10'
              : 'bg-slate-100 text-slate-500 group-hover:text-slate-900'
        }`}
      >
        <IconComponent size={20} strokeWidth={2.3} />
        {id === 'messages' && hasUnreadMessages ? (
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white" />
        ) : null}
      </span>

      <span className="min-w-0 flex-1">
        <span className="hidden text-sm font-semibold tracking-tight xl:block xl:text-[15px]">{label}</span>
        <span className="hidden text-xs text-slate-500 xl:block">{description}</span>
      </span>
    </button>
  );
}

export default function SidebarNav({ activeTab, currentUser, hasUnreadMessages, onSelectTab }) {
  const name = currentUser?.name || currentUser?.studentId || '用户';
  const initial = name.slice(0, 1).toUpperCase();

  return (
    <aside className="hidden min-h-0 border-r border-slate-200/80 bg-white/70 px-3 py-4 backdrop-blur-xl md:flex md:flex-col xl:px-4">
      <div className="flex h-full min-h-0 flex-col gap-4">
        <div className="flex items-center gap-3 rounded-[1.4rem] bg-slate-950 px-3 py-3 text-white shadow-lg shadow-slate-950/10">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-sm font-black uppercase">
            {initial}
          </div>
          <div className="min-w-0 md:hidden xl:block">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/55">校园</p>
            <p className="truncate text-sm font-semibold text-white">{name}</p>
          </div>
        </div>

        <nav className="flex min-h-0 flex-1 flex-col gap-2">
          {navItems.map((item) => (
            <SidebarItem
              key={item.id}
              activeTab={activeTab}
              description={item.description}
              featured={item.featured}
              hasUnreadMessages={hasUnreadMessages}
              id={item.id}
              icon={item.icon}
              label={item.label}
              onSelectTab={onSelectTab}
            />
          ))}
        </nav>
      </div>
    </aside>
  );
}
