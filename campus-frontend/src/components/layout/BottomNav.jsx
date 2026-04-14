import React from 'react';
import { ClipboardList, Home, MessageSquare, PlusCircle, User } from 'lucide-react';

function NavItem({ activeTab, icon, label, id, onSelect, showDot = false, featured = false }) {
  return (
    <button
      onClick={() => onSelect(id)}
      className={`relative flex w-full flex-col items-center justify-center py-2 transition-colors ${
        featured
          ? 'text-slate-900'
          : activeTab === id
            ? 'text-cyan-600'
            : 'text-slate-400 hover:text-cyan-500'
      }`}
    >
      <span className={`relative mb-1 ${featured ? '-mt-7' : ''}`}>
        {featured ? (
          <span className={`flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-200 shadow-lg transition ${
            activeTab === id ? 'bg-cyan-600 text-white' : 'bg-white text-cyan-600'
          }`}>
            {React.createElement(icon, { size: 24, strokeWidth: 2.4 })}
          </span>
        ) : (
          React.createElement(icon, { size: 22 })
        )}
        {showDot ? (
          <span className="absolute -right-1 -top-0.5 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white" />
        ) : null}
      </span>
      <span className={`text-xs font-semibold ${featured ? 'text-slate-700' : ''}`}>{label}</span>
    </button>
  );
}

export default function BottomNav({ activeTab, hasUnreadMessages, onSelectTab }) {
  return (
    <nav className="fixed bottom-0 left-1/2 z-10 w-full max-w-md -translate-x-1/2 border-t border-slate-200 bg-white/96 px-2 pb-3 pt-2 backdrop-blur-xl">
      <div className="grid grid-cols-5 items-end">
        <NavItem activeTab={activeTab} id="home" icon={Home} label="首页" onSelect={onSelectTab} />
        <NavItem activeTab={activeTab} id="tasks" icon={ClipboardList} label="订单" onSelect={onSelectTab} />
        <NavItem activeTab={activeTab} id="post" icon={PlusCircle} label="发布" onSelect={onSelectTab} featured />
        <NavItem activeTab={activeTab} id="messages" icon={MessageSquare} label="消息" onSelect={onSelectTab} showDot={hasUnreadMessages} />
        <NavItem activeTab={activeTab} id="profile" icon={User} label="我的" onSelect={onSelectTab} />
      </div>
    </nav>
  );
}
