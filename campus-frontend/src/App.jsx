import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  ArrowLeft,
  CheckCircle,
  ClipboardList,
  Home,
  LoaderCircle,
  Lock,
  Mail,
  MapPin,
  MessageSquare,
  PlusCircle,
  Send,
  ShieldCheck,
  User,
  UserPlus,
} from 'lucide-react';

const API_BASE_URL = 'http://192.168.56.1:8080';

const emptyAuthForms = {
  login: { studentId: '', password: '' },
  register: { name: '', studentId: '', email: '', password: '', confirmPassword: '' },
};

const emptyUser = {
  id: null,
  name: '',
  balance: 0,
  completedCount: 0,
  studentId: '',
  email: '',
  phone: '',
  campus: '主校区',
  address: '',
  bio: '',
};

const formatRmb = (value) => {
  const normalizedValue = `${value ?? ''}`.replace(/^[^\d.-]+/, '');
  return `￥${normalizedValue}`;
};

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [authMode, setAuthMode] = useState('login');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authForms, setAuthForms] = useState(emptyAuthForms);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [taskError, setTaskError] = useState('');
  const [currentUser, setCurrentUser] = useState(emptyUser);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileDraft, setProfileDraft] = useState(emptyUser);
  const [profileMessage, setProfileMessage] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // 新增：订单和聊天功能相关状态
  const [orderTab, setOrderTab] = useState('posted'); // 'posted' 为我的发布，'accepted' 为我的接取
  const [activeChatTask, setActiveChatTask] = useState(null);
  const [chatMessages, setChatMessages] = useState({});
  const [chatInput, setChatInput] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  const [postFormData, setPostFormData] = useState({ title: '', desc: '', reward: '' });
  const [isPostingTask, setIsPostingTask] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      fetchTasks();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!selectedTask) {
      return;
    }

    const latestTask = tasks.find((task) => task.id === selectedTask.id);
    if (!latestTask) {
      setSelectedTask(null);
      return;
    }

    setSelectedTask(latestTask);
  }, [tasks, selectedTask]);

  useEffect(() => {
    setProfileDraft(currentUser);
  }, [currentUser]);

  // 新增：当打开对话框时，开启轮询以获取最新消息
  useEffect(() => {
    let interval;
    const fetchMessages = async () => {
      if (!activeChatTask) return;
      try {
        const response = await axios.get(`${API_BASE_URL}/api/messages/${activeChatTask.id}`);
        if (response.data.code === 200) {
          setChatMessages(prev => ({
            ...prev,
            [activeChatTask.id]: response.data.data
          }));
        }
      } catch (error) {
        console.warn('获取消息失败，请确保后端已实现 /api/messages 接口');
      }
    };

    if (activeChatTask) {
      fetchMessages(); // 马上拉取一次
      interval = setInterval(fetchMessages, 3000); // 每3秒刷新一次（短轮询）
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeChatTask]);

  const fetchTasks = async () => {
    try {
      setTaskError('');
      const response = await axios.get(`${API_BASE_URL}/api/tasks`);
      setTasks(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('获取任务失败', error);
      setTaskError('暂时无法从后端加载任务列表。');
      setTasks([]);
    }
  };

  const handleAcceptTask = async (taskId, event) => {
    if (event) event.stopPropagation();
    try {
      const response = await axios.post(`${API_BASE_URL}/api/tasks/${taskId}/accept`, {
        assignee: currentUser.studentId
      });
      if (response.data.code === 200) {
        window.alert('接单成功！');
        fetchTasks();
      } else {
        window.alert(response.data.message || '接单失败');
      }
    } catch (error) {
      console.error('接单报错', error);
      window.alert(error.response?.data?.message || '网络或服务器错误，接单失败');
    }
  };

  const handleCompleteTask = async (taskId, event) => {
    if (event) event.stopPropagation();
    try {
      const response = await axios.post(`${API_BASE_URL}/api/tasks/${taskId}/complete`);
      if (response.data.code === 200) {
        window.alert('订单已标记为完成！');
        fetchTasks();
      } else {
        window.alert(response.data.message || '操作失败');
      }
    } catch (error) {
      console.error('完成订单报错', error);
      window.alert(error.response?.data?.message || '网络或服务器错误，操作失败');
    }
  };

  const updateAuthForm = (mode, field, value) => {
    setAuthForms((prev) => ({
      ...prev,
      [mode]: {
        ...prev[mode],
        [field]: value,
      },
    }));
  };

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    try {
      if (authMode === 'login') {
        const { studentId, password } = authForms.login;
        if (!studentId.trim() || !password.trim()) {
          throw new Error('请输入学号和密码。');
        }

        const response = await axios.post(`${API_BASE_URL}/api/users/login`, {
          username: studentId.trim(),
          password: password.trim(),
        });

        if (response.data.code !== 200) {
          throw new Error(response.data.message || '登录失败。');
        }

        const userData = response.data.data;
        setCurrentUser({
          ...emptyUser,
          id: userData.id ?? null,
          name: userData.name || '',
          balance: 0,
          completedCount: 0,
          studentId: userData.username,
          email: userData.email || '',
          phone: userData.phone || '',
          campus: userData.campus || '主校区',
          address: userData.address || '',
          bio: userData.bio || '这个人很低调，还没有填写个人简介。',
        });
        setIsAuthenticated(true);
        setActiveTab('home');
      } else {
        const { name, studentId, email, password, confirmPassword } = authForms.register;
        if (!name.trim() || !studentId.trim() || !email.trim() || !password.trim()) {
          throw new Error('请完整填写注册信息。');
        }
        if (password !== confirmPassword) {
          throw new Error('两次输入的密码不一致。');
        }

        const response = await axios.post(`${API_BASE_URL}/api/users/register`, {
          username: studentId.trim(),
          password: password.trim(),
          name: name.trim(),
          email: email.trim(),
          campus: '主校区',
          bio: '这个人很低调，还没有填写个人简介。',
        });

        if (response.data.code !== 201) {
          throw new Error(response.data.message || '注册失败。');
        }

        window.alert('注册成功，请登录。');
        setAuthMode('login');
        setAuthForms(emptyAuthForms);
      }
    } catch (error) {
      const message = error.response?.data?.message || error.message || '请求失败。';
      setAuthError(message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setActiveTab('home');
    setSelectedTask(null);
    setIsEditingProfile(false);
    setProfileMessage('');
    setAuthMode('login');
    setAuthError('');
    setAuthForms(emptyAuthForms);
    setCurrentUser(emptyUser);
    setTasks([]);
  };

  const updateProfileDraft = (field, value) => {
    setProfileDraft((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleEditProfile = () => {
    setProfileDraft(currentUser);
    setProfileMessage('');
    setIsEditingProfile(true);
  };

  const handleCancelProfileEdit = () => {
    setProfileDraft(currentUser);
    setProfileMessage('');
    setIsEditingProfile(false);
  };

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    setProfileMessage('');

    if (!profileDraft.name.trim() || !profileDraft.studentId.trim()) {
      setProfileMessage('姓名和学号为必填项。');
      return;
    }

    if (profileDraft.email && !/^\S+@\S+\.\S+$/.test(profileDraft.email)) {
      setProfileMessage('请输入有效的邮箱地址。');
      return;
    }

    try {
      setIsSavingProfile(true);
      const payload = {
        username: profileDraft.studentId.trim(),
        name: profileDraft.name.trim(),
        email: profileDraft.email.trim(),
        phone: profileDraft.phone.trim(),
        campus: profileDraft.campus.trim(),
        address: profileDraft.address.trim(),
        bio: profileDraft.bio.trim(),
      };

      const hasUserId = currentUser.id !== null && currentUser.id !== undefined;
      const endpoint = hasUserId
          ? `${API_BASE_URL}/api/users/${currentUser.id}/profile`
          : `${API_BASE_URL}/api/users/profile`;

      const response = await axios.put(endpoint, payload);
      if (response.data.code !== 200) {
        throw new Error(response.data.message || '保存资料失败。');
      }

      const userData = response.data.data;
      setCurrentUser((prev) => ({
        ...prev,
        id: userData.id ?? prev.id,
        name: userData.name || prev.name,
        studentId: userData.username || prev.studentId,
        email: userData.email || '',
        phone: userData.phone || '',
        campus: userData.campus || '主校区',
        address: userData.address || '',
        bio: userData.bio || '这个人很低调，还没有填写个人简介。',
      }));

      setProfileMessage('资料保存成功。');
      setIsEditingProfile(false);
    } catch (error) {
      const message = error.response?.data?.message || error.message || '保存资料失败。';
      setProfileMessage(message);
    } finally {
      setIsSavingProfile(false);
    }
  };

  // 新增：发送聊天消息到真实的后端接口
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !activeChatTask || isSendingMessage) return;

    const taskId = activeChatTask.id;
    const text = chatInput.trim();

    try {
      setIsSendingMessage(true);

      // 1. 乐观更新 UI：即使网络慢，界面上也先立刻显示自己发出的消息
      const tempMessage = {
        id: Date.now(),
        senderUsername: currentUser.studentId,
        text: text,
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setChatMessages((prev) => ({
        ...prev,
        [taskId]: [...(prev[taskId] || []), tempMessage],
      }));
      setChatInput('');

      // 2. 调用真实的后端发送接口
      await axios.post(`${API_BASE_URL}/api/messages`, {
        taskId: taskId,
        senderUsername: currentUser.studentId,
        text: text
      });

    } catch (error) {
      console.error('发送消息失败', error);
      window.alert('消息发送失败，后端接口可能暂未启动');
    } finally {
      setIsSendingMessage(false);
    }
  };

  const NavItem = ({ icon: Icon, label, id }) => (
      <button
          onClick={() => {
            setActiveTab(id);
            setSelectedTask(null);
          }}
          className={`flex w-full flex-col items-center justify-center py-3 transition-colors ${
              activeTab === id ? 'text-cyan-600' : 'text-slate-400 hover:text-cyan-500'
          }`}
      >
        <Icon size={22} className="mb-1" />
        <span className="text-xs font-semibold">{label}</span>
      </button>
  );

  const HomeView = () => {
    const openTasks = tasks.filter((task) => task.status === 'open');
    const taskStatusLabel = selectedTask?.status === 'open' ? '待接单' : selectedTask?.status || '未知';

    if (selectedTask) {
      return (
          <div className="space-y-4 p-5">
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
                    发布者：{selectedTask.author || '匿名'} | 状态：{taskStatusLabel}
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
                {selectedTask.description || '发布者暂未填写更详细的任务描述。'}
              </p>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900">任务信息</h3>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <span className="text-slate-500">任务编号</span>
                  <span className="font-semibold text-slate-900">{selectedTask.id || '未提供'}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <span className="text-slate-500">发布者</span>
                  <span className="font-semibold text-slate-900">{selectedTask.author || '匿名'}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <span className="text-slate-500">任务地点</span>
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

            {selectedTask.status === 'open' && (
                <button
                    type="button"
                    onClick={() => handleAcceptTask(selectedTask.id)}
                    className="w-full rounded-2xl bg-slate-900 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  立即接单
                </button>
            )}
          </div>
      );
    }

    return (
        <div className="space-y-4 p-5">
          <section className="rounded-3xl bg-slate-900 p-5 text-white shadow-lg">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-cyan-200">欢迎回来</p>
                <h2 className="mt-1 text-2xl font-bold">{currentUser.name}</h2>
                <p className="mt-2 text-sm text-slate-300">
                  学号 {currentUser.studentId} | 已完成 {currentUser.completedCount} 单
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
                可接任务
              </div>
              <p className="mt-3 text-2xl font-bold text-slate-900">{openTasks.length}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <ShieldCheck size={16} />
                账户状态
              </div>
              <p className="mt-3 text-2xl font-bold text-emerald-600">正常</p>
            </div>
          </section>

          <section className="flex items-center justify-between pt-2">
            <h3 className="text-xl font-bold text-slate-900">任务大厅</h3>
            <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold text-cyan-700">
            实时更新
          </span>
          </section>

          {taskError ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                {taskError}
              </div>
          ) : null}

          {openTasks.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
                <p className="text-lg font-semibold text-slate-800">当前还没有开放中的任务</p>
                <p className="mt-2 text-sm text-slate-500">你可以先发布一个新任务。</p>
              </div>
          ) : (
              openTasks.map((task) => (
                  <article
                      key={task.id}
                      onClick={() => setSelectedTask(task)}
                      className="cursor-pointer space-y-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-cyan-200 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4 className="text-lg font-bold text-slate-900">{task.title}</h4>
                        <p className="mt-1 text-sm text-slate-500">{task.description}</p>
                      </div>
                      <div className="rounded-full bg-amber-50 px-3 py-1 font-bold text-amber-600">
                        {formatRmb(task.reward)}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1">
                  <User size={14} />
                  {task.author || '匿名'}
                </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1">
                  <MapPin size={14} />
                  校园内
                </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1">
                  <CheckCircle size={14} />
                  待接单
                </span>
                    </div>

                    <button
                        type="button"
                        onClick={(event) => handleAcceptTask(task.id, event)}
                        className="w-full rounded-2xl bg-slate-900 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      立即接单
                    </button>
                  </article>
              ))
          )}
        </div>
    );
  };

  const PostTaskView = () => {
    const handleSubmit = async (event) => {
      event.preventDefault();
      if (!postFormData.title.trim() || !postFormData.reward.trim()) {
        return;
      }

      const newTask = {
        title: postFormData.title,
        description: postFormData.desc,
        reward: postFormData.reward,
        author: currentUser.name,
      };

      try {
        setIsPostingTask(true);
        await axios.post(`${API_BASE_URL}/api/tasks`, newTask);
        window.alert('任务发布成功。');
        setPostFormData({ title: '', desc: '', reward: '' });
        await fetchTasks();
        setActiveTab('home');
      } catch (error) {
        console.error('发布任务失败', error);
        window.alert('任务发布失败。');
      } finally {
        setIsPostingTask(false);
      }
    };

    return (
        <div className="p-5">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900">发布任务</h2>
            <p className="mt-2 text-sm text-slate-500">创建任务后会同步到后端接口。</p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">任务标题</span>
                <input
                    type="text"
                    required
                    placeholder="例如：帮忙代取快递"
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
                    placeholder="补充地点、时间和具体要求"
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                    value={postFormData.desc}
                    onChange={(event) => setPostFormData({ ...postFormData, desc: event.target.value })}
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">赏金（人民币）</span>
                <input
                    type="number"
                    required
                    min="1"
                    placeholder="5"
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
                确认发布
              </button>
            </form>
          </div>
        </div>
    );
  };

  const OrdersView = () => {
    const myPostedTasks = tasks.filter((task) => task.author === currentUser.name);
    const myAcceptedTasks = tasks.filter((task) => task.assignee === currentUser.studentId);

    const displayTasks = orderTab === 'posted' ? myPostedTasks : myAcceptedTasks;

    return (
        <div className="p-5">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900">我的订单</h2>
            <p className="mt-2 text-sm text-slate-500">在这里管理你的发布和接单任务。</p>

            {/* 选项卡切换 */}
            <div className="mt-4 flex rounded-xl bg-slate-100 p-1">
              <button
                  type="button"
                  onClick={() => setOrderTab('posted')}
                  className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
                      orderTab === 'posted' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                我的发布
              </button>
              <button
                  type="button"
                  onClick={() => setOrderTab('accepted')}
                  className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
                      orderTab === 'accepted' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                我的接取
              </button>
            </div>

            <div className="mt-6 space-y-4">
              {displayTasks.length === 0 ? (
                  <div className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                    暂无相关订单任务
                  </div>
              ) : (
                  displayTasks.map((task) => (
                      <div
                          key={task.id}
                          className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-700"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="block font-bold text-slate-900">{task.title}</span>
                            <span className="mt-1 block text-xs text-slate-500">
                              状态：{task.status === 'open' ? '待接单' : task.status === 'accepted' ? '进行中' : '已完成'} | 赏金：{formatRmb(task.reward)}
                            </span>
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 border-t border-slate-200 pt-3 mt-1">
                          {orderTab === 'posted' && task.status === 'accepted' && (
                              <button
                                  type="button"
                                  onClick={(event) => handleCompleteTask(task.id, event)}
                                  className="rounded-full bg-emerald-100 px-4 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-200 transition"
                              >
                                标记完成
                              </button>
                          )}
                          {orderTab === 'accepted' && task.status !== 'completed' && (
                              <button
                                  type="button"
                                  onClick={() => setActiveChatTask(task)}
                                  className="flex items-center gap-1.5 rounded-full bg-cyan-100 px-4 py-1.5 text-xs font-bold text-cyan-700 hover:bg-cyan-200 transition"
                              >
                                <MessageSquare size={14} /> 联系发布人
                              </button>
                          )}
                        </div>
                      </div>
                  ))
              )}
            </div>
          </div>
        </div>
    );
  };

  const ProfileView = () => (
      <div className="space-y-4 p-5">
        <div className="rounded-3xl bg-slate-900 p-6 text-white shadow-lg">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-cyan-200">个人信息</p>
              <h2 className="mt-2 text-2xl font-bold">{currentUser.name || '未填写姓名'}</h2>
              <p className="mt-2 text-sm text-slate-300">
                {currentUser.studentId || '未填写学号'} | {currentUser.email || '未填写邮箱'}
              </p>
            </div>
            <button
                type="button"
                onClick={handleEditProfile}
                className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              编辑资料
            </button>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/10 px-4 py-3">
              <p className="text-xs text-slate-300">余额</p>
              <p className="mt-1 text-xl font-bold">{formatRmb(currentUser.balance)}</p>
            </div>
            <div className="rounded-2xl bg-white/10 px-4 py-3">
              <p className="text-xs text-slate-300">已完成任务</p>
              <p className="mt-1 text-xl font-bold">{currentUser.completedCount}</p>
            </div>
          </div>
        </div>

        {!isEditingProfile && profileMessage ? (
            <div className="rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-700">
              {profileMessage}
            </div>
        ) : null}

        {isEditingProfile ? (
            <form onSubmit={handleSaveProfile} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">编辑资料</h3>
                  <p className="mt-1 text-sm text-slate-500">当前为本地保存，后续可接入后端用户资料接口。</p>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">姓名</span>
                  <input
                      type="text"
                      value={profileDraft.name}
                      onChange={(event) => updateProfileDraft('name', event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                      placeholder="请输入姓名"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">学号</span>
                  <input
                      type="text"
                      value={profileDraft.studentId}
                      onChange={(event) => updateProfileDraft('studentId', event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                      placeholder="请输入学号"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">邮箱</span>
                  <input
                      type="email"
                      value={profileDraft.email}
                      onChange={(event) => updateProfileDraft('email', event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                      placeholder="请输入邮箱"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">手机号</span>
                  <input
                      type="text"
                      value={profileDraft.phone}
                      onChange={(event) => updateProfileDraft('phone', event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                      placeholder="请输入手机号"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">所在校区</span>
                  <input
                      type="text"
                      value={profileDraft.campus}
                      onChange={(event) => updateProfileDraft('campus', event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                      placeholder="例如：主校区"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">宿舍 / 常用地址</span>
                  <input
                      type="text"
                      value={profileDraft.address}
                      onChange={(event) => updateProfileDraft('address', event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                      placeholder="例如：1号宿舍楼 402"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">个人简介</span>
                  <textarea
                      rows="4"
                      value={profileDraft.bio}
                      onChange={(event) => updateProfileDraft('bio', event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                      placeholder="介绍一下自己，方便他人了解你"
                  />
                </label>
              </div>

              {profileMessage ? (
                  <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                    {profileMessage}
                  </div>
              ) : null}

              <div className="mt-6 flex gap-3">
                <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-cyan-600 py-3 font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-cyan-300"
                >
                  {isSavingProfile ? <LoaderCircle size={18} className="animate-spin" /> : null}
                  保存修改
                </button>
                <button
                    type="button"
                    onClick={handleCancelProfileEdit}
                    className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 py-3 font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  取消
                </button>
              </div>
            </form>
        ) : (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-xl font-bold text-slate-900">资料详情</h3>
              <div className="mt-6 space-y-3 text-sm">
                <div className="flex justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <span className="text-slate-500">姓名</span>
                  <span className="font-semibold text-slate-900">{currentUser.name || '未填写'}</span>
                </div>
                <div className="flex justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <span className="text-slate-500">学号</span>
                  <span className="font-semibold text-slate-900">{currentUser.studentId || '未填写'}</span>
                </div>
                <div className="flex justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <span className="text-slate-500">邮箱</span>
                  <span className="font-semibold text-slate-900">{currentUser.email || '未填写'}</span>
                </div>
                <div className="flex justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <span className="text-slate-500">手机号</span>
                  <span className="font-semibold text-slate-900">{currentUser.phone || '未填写'}</span>
                </div>
                <div className="flex justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <span className="text-slate-500">所在校区</span>
                  <span className="font-semibold text-slate-900">{currentUser.campus || '未填写'}</span>
                </div>
                <div className="flex justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <span className="text-slate-500">宿舍 / 常用地址</span>
                  <span className="font-semibold text-slate-900">{currentUser.address || '未填写'}</span>
                </div>
              </div>

              <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-4">
                <p className="text-sm font-medium text-slate-500">个人简介</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                  {currentUser.bio || '这个人很低调，还没有填写个人简介。'}
                </p>
              </div>
            </div>
        )}

        <button
            type="button"
            onClick={handleLogout}
            className="w-full rounded-2xl border border-rose-200 bg-rose-50 py-3 font-semibold text-rose-600 transition hover:bg-rose-100"
        >
          退出登录
        </button>
      </div>
  );

  // 新增：消息列表视图
  const MessagesView = () => {
    // 筛选出所有当前用户参与、且已经有接单者的任务（只有接单后才允许对话）
    const chatableTasks = tasks.filter(task =>
        task.assignee &&
        (task.author === currentUser.name || task.assignee === currentUser.studentId)
    );

    return (
        <div className="p-5">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900">消息中心</h2>
            <p className="mt-2 text-sm text-slate-500">与任务发布者或接单者进行沟通。</p>

            <div className="mt-6 space-y-4">
              {chatableTasks.length === 0 ? (
                  <div className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                    暂无消息会话，快去接单或发布任务吧
                  </div>
              ) : (
                  chatableTasks.map((task) => {
                    // 判断当前登录用户是发布者还是接单者，从而展示对方的名字
                    const isAuthor = task.author === currentUser.name;
                    const otherPartyName = isAuthor ? `接单者 (${task.assignee})` : `${task.author} (发布者)`;

                    return (
                        <div
                            key={task.id}
                            onClick={() => setActiveChatTask(task)}
                            className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 transition hover:bg-slate-100"
                        >
                          <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-cyan-700">
                              <MessageSquare size={20} />
                            </div>
                            <div>
                              <h3 className="font-bold text-slate-900">{otherPartyName}</h3>
                              <p className="mt-1 text-xs text-slate-500 line-clamp-1">任务：{task.title}</p>
                            </div>
                          </div>
                          <div className="text-cyan-600">
                            <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-bold">进入聊天</span>
                          </div>
                        </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>
    );
  };

  // （修复点）把聊天弹窗作为渲染函数，而不是内部组件
  const renderChatOverlay = () => {
    if (!activeChatTask) return null;
    const messages = chatMessages[activeChatTask.id] || [];

    return (
        <div className="fixed inset-0 z-50 flex justify-center bg-slate-900/40 backdrop-blur-sm sm:items-center">
          <div className="flex h-full w-full max-w-md flex-col bg-slate-50 text-slate-900 shadow-2xl sm:h-[85vh] sm:rounded-[32px] sm:overflow-hidden">
            <header className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 shadow-sm">
              <div className="flex items-center gap-3">
                <button
                    onClick={() => setActiveChatTask(null)}
                    className="rounded-full bg-slate-100 p-2 text-slate-600 hover:bg-slate-200 transition"
                >
                  <ArrowLeft size={20} />
                </button>
                <div>
                  <h2 className="text-lg font-bold">{activeChatTask.author || '匿名发布者'}</h2>
                  <p className="text-xs text-slate-500">任务：{activeChatTask.title}</p>
                </div>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {messages.length === 0 ? (
                  <div className="mt-10 text-center text-sm text-slate-400">
                    这里是与 {activeChatTask.author || '发布者'} 的会话。<br/>你可以发送消息沟通跑腿细节。
                  </div>
              ) : (
                  messages.map((msg) => {
                    // 判断是否是当前用户自己发的消息
                    const isMe = msg.senderUsername === currentUser.studentId || msg.sender === 'me';

                    return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div
                              className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                                  isMe
                                      ? 'bg-cyan-600 text-white rounded-br-none'
                                      : 'border border-slate-200 bg-white text-slate-800 rounded-bl-none'
                              }`}
                          >
                            <p className="leading-relaxed">{msg.text}</p>
                            <span
                                className={`mt-1 block text-[10px] ${
                                    isMe ? 'text-cyan-200' : 'text-slate-400'
                                }`}
                            >
                        {msg.createdAt || msg.time}
                      </span>
                          </div>
                        </div>
                    );
                  })
              )}
            </div>

            <footer className="border-t border-slate-200 bg-white p-4 pb-6">
              <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="输入消息..."
                    disabled={isSendingMessage}
                    className="flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 disabled:bg-slate-100"
                />
                <button
                    type="submit"
                    disabled={!chatInput.trim() || isSendingMessage}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan-600 text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {isSendingMessage ? <LoaderCircle size={18} className="animate-spin" /> : <Send size={18} className="-ml-0.5" />}
                </button>
              </form>
            </footer>
          </div>
        </div>
    );
  };

  const renderAppContent = () => {
    if (activeTab === 'home') return HomeView();
    if (activeTab === 'post') return PostTaskView();
    if (activeTab === 'tasks') return OrdersView();
    if (activeTab === 'messages') return MessagesView(); // 新增这行路由判断
    return ProfileView();
  };

  if (!isAuthenticated) {
    const authForm = authForms[authMode];

    return (
        <div className="auth-shell min-h-screen px-4 py-8 text-slate-900">
          <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center">
            <div className="grid w-full overflow-hidden rounded-[32px] border border-white/60 bg-white/80 shadow-2xl backdrop-blur md:grid-cols-[1.05fr_0.95fr]">
              <section className="auth-brand px-6 py-8 text-white md:px-10 md:py-12">
                <div className="auth-brand__badge">Campus Runner</div>
                <h1 className="mt-6 max-w-md text-4xl font-black leading-tight md:text-5xl">
                  校园任务平台
                </h1>
                <p className="mt-4 max-w-md text-sm leading-7 text-cyan-50/90 md:text-base">
                  先注册，再登录，即可发布任务和浏览校园跑腿需求。
                </p>

                <div className="mt-8 grid gap-3">
                  {[
                    { icon: ShieldCheck, title: '后端认证预留', text: '登录和注册流程已经预留为对接 Spring Boot 接口。' },
                    { icon: MapPin, title: '校园场景', text: '适合校内跑腿、代取、代办等任务需求。' },
                    { icon: CheckCircle, title: '任务同步', text: '发布任务和任务大厅已经连接后端任务接口。' },
                  ].map(({ icon: Icon, title, text }) => (
                      <div key={title} className="flex gap-3 rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
                        <div className="mt-0.5 rounded-xl bg-white/15 p-2">
                          <Icon size={18} />
                        </div>
                        <div>
                          <p className="font-semibold">{title}</p>
                          <p className="mt-1 text-sm text-cyan-50/80">{text}</p>
                        </div>
                      </div>
                  ))}
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
                          }}
                          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                              authMode === 'login'
                                  ? 'bg-white text-slate-900 shadow-sm'
                                  : 'text-slate-500 hover:text-slate-900'
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
                              authMode === 'register'
                                  ? 'bg-white text-slate-900 shadow-sm'
                                  : 'text-slate-500 hover:text-slate-900'
                          }`}
                      >
                        注册
                      </button>
                    </div>
                  </div>

                  <div className="mt-8">
                    <h2 className="text-3xl font-black text-slate-900">
                      {authMode === 'login' ? '欢迎回来' : '创建账户'}
                    </h2>
                    <p className="mt-2 text-sm text-slate-500">
                      {authMode === 'login'
                          ? '输入学号和密码继续使用平台。'
                          : '先完成注册，再使用新账户登录。'}
                    </p>
                  </div>

                  <form onSubmit={handleAuthSubmit} className="mt-8 space-y-4">
                    {authMode === 'register' ? (
                        <label className="block">
                          <span className="mb-2 block text-sm font-medium text-slate-700">姓名</span>
                          <div className="flex items-center rounded-2xl border border-slate-200 px-4 py-3 focus-within:border-cyan-500 focus-within:ring-4 focus-within:ring-cyan-100">
                            <User size={18} className="text-slate-400" />
                            <input
                                type="text"
                                value={authForm.name}
                                onChange={(event) => updateAuthForm('register', 'name', event.target.value)}
                                className="ml-3 w-full border-none bg-transparent outline-none"
                                placeholder="请输入姓名"
                            />
                          </div>
                        </label>
                    ) : null}

                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">学号</span>
                      <div className="flex items-center rounded-2xl border border-slate-200 px-4 py-3 focus-within:border-cyan-500 focus-within:ring-4 focus-within:ring-cyan-100">
                        <UserPlus size={18} className="text-slate-400" />
                        <input
                            type="text"
                            value={authForm.studentId}
                            onChange={(event) => updateAuthForm(authMode, 'studentId', event.target.value)}
                            className="ml-3 w-full border-none bg-transparent outline-none"
                            placeholder="请输入学号"
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

                  <div className="mt-6 rounded-2xl bg-cyan-50 px-4 py-3 text-sm font-medium text-cyan-600">
                    已连接 Spring Boot 后端配置
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
    );
  }

  return (
      <div className="min-h-screen bg-slate-100 px-0 text-slate-900">
        <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-slate-50 shadow-2xl">
          <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 px-5 py-4 backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-cyan-600">Campus</p>
                <h1 className="text-xl font-black text-slate-900">校园跑腿众包</h1>
              </div>
              <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {currentUser.name}
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto pb-20">{renderAppContent()}</main>

          <nav className="fixed bottom-0 left-1/2 z-10 flex w-full max-w-md -translate-x-1/2 border-t border-slate-200 bg-white/95 backdrop-blur">
            <NavItem id="home" icon={Home} label="大厅" />
            <NavItem id="post" icon={PlusCircle} label="发布" />
            <NavItem id="tasks" icon={ClipboardList} label="订单" />
            <NavItem id="messages" icon={MessageSquare} label="消息" />
            <NavItem id="profile" icon={User} label="我的" />
          </nav>
        </div>

        {/* 新增：会话界面覆盖层 */}
        {renderChatOverlay()}
      </div>
  );
}