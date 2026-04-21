import React from 'react';
import { LoaderCircle, Lock, Mail, ShieldCheck, User, UserPlus } from 'lucide-react';

export default function AuthScreen({
  authBrandImageUrl,
  authError,
  authForms,
  authLoading,
  authMode,
  autoLoginEnabled,
  handleAuthSubmit,
  handleSavedAccountSelect,
  hydrateLoginFormFromAccount,
  lastSavedAccount,
  rememberAccount,
  savedAccounts,
  setAuthError,
  setAuthMode,
  setAutoLoginEnabled,
  setRememberAccount,
  updateAuthForm,
}) {
  const authForm = authForms[authMode];

  return (
    <div className="auth-shell min-h-screen px-4 py-8 text-slate-900">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-[1280px] items-center">
        <div className="grid w-full overflow-hidden rounded-[32px] border border-white/60 bg-white/80 shadow-2xl backdrop-blur lg:grid-cols-[1.05fr_0.95fr]">
          <section className="auth-brand relative overflow-hidden px-6 py-8 text-white md:px-10 md:py-12">
            <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${authBrandImageUrl})` }} />
            <div className="absolute inset-0 bg-slate-950/55" />
            <div className="absolute -left-12 top-10 h-40 w-40 rounded-full bg-amber-200/20 blur-3xl" />
            <div className="absolute bottom-8 right-[-36px] h-56 w-56 rounded-full bg-cyan-300/20 blur-3xl" />

            <div className="relative z-10">
              <div className="auth-brand__badge">校园众包平台</div>
              <h1 className="mt-6 max-w-md text-4xl font-black leading-tight md:text-5xl">
                安全的校园任务协作与接单平台
              </h1>
              <p className="mt-4 max-w-md text-sm leading-7 text-cyan-50/90 md:text-base">
                注册账号、发布任务、接取委托，并通过登录态安全管理你的钱包与资料。
              </p>

              <div className="mt-8 grid gap-3">
                {[
                  { icon: ShieldCheck, title: '助人', text: '帮助每一个需要帮助的人。' },
                  { icon: UserPlus, title: '开放', text: '我们都可以让校园变更好。' },
                  { icon: Mail, title: '和谐', text: '让新和谐风气从这里开始。' },
                ].map(({ icon, title, text }) => (
                  <div key={title} className="flex gap-3 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                    <div className="mt-0.5 rounded-xl bg-white/15 p-2">
                      {React.createElement(icon, { size: 18 })}
                    </div>
                    <div>
                      <p className="font-semibold">{title}</p>
                      <p className="mt-1 text-sm text-cyan-50/80">{text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="px-6 py-8 md:px-10 md:py-12">
            <div className="mx-auto w-full max-w-md">
              <div className="rounded-full bg-slate-100 p-1">
                <div className="grid grid-cols-2 gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('login');
                      setAuthError('');
                      hydrateLoginFormFromAccount(lastSavedAccount);
                    }}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      authMode === 'login' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    登录
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('register');
                      setAuthError('');
                    }}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      authMode === 'register' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    注册
                  </button>
                </div>
              </div>

              <div className="mt-8">
                <h2 className="text-3xl font-black text-slate-900">
                  {authMode === 'login' ? '欢迎回来' : '创建账号'}
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  {authMode === 'login'
                    ? '使用用户名和密码继续。'
                    : '注册新账号后即可开始使用平台。'}
                </p>
              </div>

              <form onSubmit={handleAuthSubmit} className="mt-8 space-y-4">
                {authMode === 'register' ? (
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">昵称</span>
                    <div className="flex items-center rounded-2xl border border-slate-200 px-4 py-3 focus-within:border-cyan-500 focus-within:ring-4 focus-within:ring-cyan-100">
                      <User size={18} className="text-slate-400" />
                      <input
                        type="text"
                        value={authForm.name}
                        onChange={(event) => updateAuthForm('register', 'name', event.target.value)}
                        className="ml-3 w-full border-none bg-transparent outline-none"
                        placeholder="请输入昵称"
                      />
                    </div>
                  </label>
                ) : null}

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">用户名</span>
                  <div className="flex items-center rounded-2xl border border-slate-200 px-4 py-3 focus-within:border-cyan-500 focus-within:ring-4 focus-within:ring-cyan-100">
                    <UserPlus size={18} className="text-slate-400" />
                    <input
                      type="text"
                      value={authForm.studentId}
                      onChange={(event) => updateAuthForm(authMode, 'studentId', event.target.value)}
                      className="ml-3 w-full border-none bg-transparent outline-none"
                      placeholder="请输入用户名"
                    />
                  </div>
                </label>

                {authMode === 'register' ? (
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">邮箱</span>
                    <div className="flex items-center rounded-2xl border border-slate-200 px-4 py-3 focus-within:border-cyan-500 focus-within:ring-4 focus-within:ring-cyan-100">
                      <Mail size={18} className="text-slate-400" />
                      <input
                        type="email"
                        value={authForm.email}
                        onChange={(event) => updateAuthForm('register', 'email', event.target.value)}
                        className="ml-3 w-full border-none bg-transparent outline-none"
                        placeholder="请输入邮箱"
                      />
                    </div>
                  </label>
                ) : null}

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">密码</span>
                  <div className="flex items-center rounded-2xl border border-slate-200 px-4 py-3 focus-within:border-cyan-500 focus-within:ring-4 focus-within:ring-cyan-100">
                    <Lock size={18} className="text-slate-400" />
                    <input
                      type="password"
                      value={authForm.password}
                      onChange={(event) => updateAuthForm(authMode, 'password', event.target.value)}
                      className="ml-3 w-full border-none bg-transparent outline-none"
                      placeholder="请输入密码"
                    />
                  </div>
                </label>

                {authMode === 'register' ? (
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">确认密码</span>
                    <div className="flex items-center rounded-2xl border border-slate-200 px-4 py-3 focus-within:border-cyan-500 focus-within:ring-4 focus-within:ring-cyan-100">
                      <Lock size={18} className="text-slate-400" />
                      <input
                        type="password"
                        value={authForm.confirmPassword}
                        onChange={(event) => updateAuthForm('register', 'confirmPassword', event.target.value)}
                        className="ml-3 w-full border-none bg-transparent outline-none"
                        placeholder="请再次输入密码"
                      />
                    </div>
                  </label>
                ) : null}

                {authMode === 'login' ? (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={rememberAccount}
                          onChange={(event) => {
                            const checked = event.target.checked;
                            setRememberAccount(checked);
                            if (!checked) {
                              setAutoLoginEnabled(false);
                            }
                          }}
                          className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                        />
                        记住账号
                      </label>
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={autoLoginEnabled}
                          onChange={(event) => {
                            const checked = event.target.checked;
                            setAutoLoginEnabled(checked);
                            if (checked) {
                              setRememberAccount(true);
                            }
                          }}
                          className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                        />
                        保持登录
                      </label>
                    </div>

                    {savedAccounts.length > 0 ? (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">最近使用的账号</p>
                            <p className="mt-1 text-xs text-slate-500">点击后可自动填入用户名。</p>
                          </div>
                          <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-slate-500">
                            {savedAccounts.length}
                          </span>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {savedAccounts.map((account) => (
                            <button
                              key={account.username}
                              type="button"
                              onClick={() => handleSavedAccountSelect(account)}
                              className={`rounded-full border px-3 py-2 text-left text-xs font-semibold transition ${
                                authForms.login.studentId === account.username
                                  ? 'border-cyan-200 bg-cyan-50 text-cyan-700'
                                  : 'border-slate-200 bg-white text-slate-600 hover:border-cyan-200 hover:text-cyan-700'
                              }`}
                            >
                              <span className="block">{account.name || account.username}</span>
                              <span className="mt-1 block text-[11px] font-medium text-slate-400">
                                {account.username}{account.autoLogin ? ' | 已保持登录' : ''}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {authError ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                    {authError}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={authLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {authLoading ? <LoaderCircle size={18} className="animate-spin" /> : null}
                  {authMode === 'login' ? '登录' : '注册'}
                </button>
              </form>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
