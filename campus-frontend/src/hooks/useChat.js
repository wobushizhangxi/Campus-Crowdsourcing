import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiGet, apiPost, isUnauthorizedError } from '../services/api';

export default function useChat({
  currentUser,
  isAuthenticated,
  isTaskOwnedByCurrentUser,
  tasks,
  onUnauthorized,
}) {
  const [activeChatTask, setActiveChatTask] = useState(null);
  const [chatMessages, setChatMessages] = useState({});
  const [chatInput, setChatInput] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [lastViewedMessageIds, setLastViewedMessageIds] = useState({});
  const [chatPendingNewMessageCount, setChatPendingNewMessageCount] = useState(0);

  const chatScrollContainerRef = useRef(null);
  const isChatPinnedToBottomRef = useRef(true);
  const chatMessageCursorRef = useRef({});
  const lastActiveChatTaskIdRef = useRef(null);

  const setChatMessageCursor = useCallback((taskId, messageId) => {
    if (!taskId) {
      return;
    }

    chatMessageCursorRef.current = {
      ...chatMessageCursorRef.current,
      [taskId]: messageId,
    };
  }, []);

  const chatableTasks = useMemo(
    () => tasks.filter(
      (task) => task.assignee && (isTaskOwnedByCurrentUser(task) || task.assignee === currentUser.studentId)
    ),
    [currentUser.studentId, isTaskOwnedByCurrentUser, tasks]
  );

  const getConversationTitle = useCallback((task) => {
    if (!task) {
      return '会话';
    }

    const isAuthor = isTaskOwnedByCurrentUser(task);
    return isAuthor ? `接单人 ${task.assignee || ''}`.trim() : `发布者 ${task.author || ''}`.trim();
  }, [isTaskOwnedByCurrentUser]);

  const getTaskStatusMeta = useCallback((status) => {
    if (status === 'open') {
      return { label: '待接单', className: 'bg-amber-100 text-amber-700' };
    }
    if (status === 'accepted') {
      return { label: '进行中', className: 'bg-cyan-100 text-cyan-700' };
    }
    if (status === 'completed') {
      return { label: '已完成', className: 'bg-emerald-100 text-emerald-700' };
    }
    return { label: status || '未知', className: 'bg-slate-100 text-slate-600' };
  }, []);

  const getLatestServerMessage = useCallback((taskId) => {
    const messages = chatMessages[taskId] || [];

    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index];
      const messageId = Number(message?.id);
      if (!message?.pending && Number.isFinite(messageId) && messageId > 0) {
        return message;
      }
    }

    return null;
  }, [chatMessages]);

  const getLatestServerMessageId = useCallback(
    (taskId) => Number(getLatestServerMessage(taskId)?.id || 0),
    [getLatestServerMessage]
  );

  const isConversationUnread = useCallback((taskId) => {
    const latestMessage = getLatestServerMessage(taskId);
    if (!latestMessage || latestMessage.senderUsername === currentUser.studentId) {
      return false;
    }

    return Number(latestMessage.id) > (lastViewedMessageIds[taskId] || 0);
  }, [currentUser.studentId, getLatestServerMessage, lastViewedMessageIds]);

  const hasUnreadMessages = useMemo(
    () => chatableTasks.some((task) => isConversationUnread(task.id)),
    [chatableTasks, isConversationUnread]
  );

  const sortedChatableTasks = useMemo(
    () => [...chatableTasks].sort((firstTask, secondTask) => {
      const firstLatestMessageId = getLatestServerMessageId(firstTask.id);
      const secondLatestMessageId = getLatestServerMessageId(secondTask.id);

      if (firstLatestMessageId !== secondLatestMessageId) {
        return secondLatestMessageId - firstLatestMessageId;
      }

      return secondTask.id - firstTask.id;
    }),
    [chatableTasks, getLatestServerMessageId]
  );

  const markConversationAsRead = useCallback((taskId) => {
    const latestMessageId = getLatestServerMessageId(taskId);
    if (!latestMessageId) {
      return;
    }

    setLastViewedMessageIds((prev) => ({
      ...prev,
      [taskId]: latestMessageId,
    }));
  }, [getLatestServerMessageId]);

  const openChat = useCallback((task) => {
    setActiveChatTask(task);
    setChatPendingNewMessageCount(0);
    isChatPinnedToBottomRef.current = true;
    markConversationAsRead(task.id);
  }, [markConversationAsRead]);

  const closeChat = useCallback(() => {
    setActiveChatTask(null);
    setChatPendingNewMessageCount(0);
    lastActiveChatTaskIdRef.current = null;
  }, []);

  const scrollChatToBottom = useCallback((behavior = 'auto') => {
    const container = chatScrollContainerRef.current;
    if (!container) {
      return;
    }

    container.scrollTo({ top: container.scrollHeight, behavior });
    isChatPinnedToBottomRef.current = true;
    setChatPendingNewMessageCount(0);
    if (activeChatTask) {
      setChatMessageCursor(activeChatTask.id, getLatestServerMessageId(activeChatTask.id));
    }
  }, [activeChatTask, getLatestServerMessageId, setChatMessageCursor]);

  const syncChatPinnedState = useCallback(() => {
    const container = chatScrollContainerRef.current;
    if (!container) {
      return;
    }

    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    isChatPinnedToBottomRef.current = distanceFromBottom < 80;
    if (isChatPinnedToBottomRef.current) {
      setChatPendingNewMessageCount(0);
    }
  }, []);

  const handleSendMessage = useCallback(async (event) => {
    event.preventDefault();
    if (!chatInput.trim() || !activeChatTask || isSendingMessage) {
      return;
    }

    const taskId = activeChatTask.id;
    const text = chatInput.trim();
    const tempId = `temp-${Date.now()}`;

    try {
      setIsSendingMessage(true);
      setChatMessages((prev) => ({
        ...prev,
        [taskId]: [
          ...(prev[taskId] || []),
          {
            id: tempId,
            senderUsername: currentUser.studentId,
            text,
            createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            pending: true,
          },
        ],
      }));
      setChatInput('');

      const response = await apiPost('/api/messages', { taskId, text });
      const savedMessage = response.data?.data;
      if (savedMessage) {
        setChatMessages((prev) => ({
          ...prev,
          [taskId]: [
            ...(prev[taskId] || []).filter((message) => message.id !== tempId),
            savedMessage,
          ],
        }));
        markConversationAsRead(taskId);
      }
    } catch (error) {
      if (isUnauthorizedError(error)) {
        onUnauthorized?.();
        return;
      }

      setChatMessages((prev) => ({
        ...prev,
        [taskId]: (prev[taskId] || []).filter((message) => message.id !== tempId),
      }));
      window.alert(error.response?.data?.message || '发送消息失败。');
    } finally {
      setIsSendingMessage(false);
    }
  }, [activeChatTask, chatInput, currentUser.studentId, isSendingMessage, markConversationAsRead, onUnauthorized]);

  const resetChatState = useCallback(() => {
    setActiveChatTask(null);
    setChatMessages({});
    setChatInput('');
    setLastViewedMessageIds({});
    setChatPendingNewMessageCount(0);
    isChatPinnedToBottomRef.current = true;
    chatMessageCursorRef.current = {};
    lastActiveChatTaskIdRef.current = null;
  }, []);

  useEffect(() => {
    if (!isAuthenticated || chatableTasks.length === 0) {
      return undefined;
    }

    let intervalId;
    let isCancelled = false;

    const fetchMessages = async () => {
      try {
        const responses = await Promise.all(
          chatableTasks.map((task) => apiGet(`/api/messages/${task.id}`))
        );

        if (isCancelled) {
          return;
        }

        setChatMessages((prev) => {
          const nextMessages = { ...prev };
          responses.forEach((response, index) => {
            const taskId = chatableTasks[index].id;
            nextMessages[taskId] = response.data.code === 200 && Array.isArray(response.data.data)
              ? response.data.data
              : [];
          });
          return nextMessages;
        });
      } catch (error) {
        if (isUnauthorizedError(error)) {
          onUnauthorized?.();
        }
      }
    };

    fetchMessages();
    intervalId = setInterval(fetchMessages, 3000);

    return () => {
      isCancelled = true;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [chatableTasks, isAuthenticated, onUnauthorized]);

  useEffect(() => {
    if (!activeChatTask) {
      return;
    }

    const taskId = activeChatTask.id;
    const messages = chatMessages[taskId] || [];
    const latestServerMessageId = getLatestServerMessageId(taskId);
    const lastObservedMessageId = chatMessageCursorRef.current[taskId] || 0;
    const isConversationSwitch = lastActiveChatTaskIdRef.current !== taskId;

    markConversationAsRead(activeChatTask.id);

    if (isConversationSwitch) {
      lastActiveChatTaskIdRef.current = taskId;
      setChatMessageCursor(taskId, latestServerMessageId);
      setChatPendingNewMessageCount(0);
      scrollChatToBottom('auto');
      return;
    }

    if (latestServerMessageId <= lastObservedMessageId) {
      return;
    }

    const newIncomingMessageCount = messages.filter((message) => {
      const messageId = Number(message?.id);
      return (
        !message?.pending &&
        Number.isFinite(messageId) &&
        messageId > lastObservedMessageId &&
        message.senderUsername !== currentUser.studentId
      );
    }).length;

    setChatMessageCursor(taskId, latestServerMessageId);

    if (newIncomingMessageCount === 0) {
      return;
    }

    if (isChatPinnedToBottomRef.current) {
      scrollChatToBottom('auto');
      return;
    }

    setChatPendingNewMessageCount((prev) => prev + newIncomingMessageCount);
  }, [activeChatTask, chatMessages, currentUser.studentId, getLatestServerMessageId, markConversationAsRead, scrollChatToBottom, setChatMessageCursor]);

  return {
    activeChatTask,
    chatInput,
    chatMessages,
    chatPendingNewMessageCount,
    chatScrollContainerRef,
    closeChat,
    getConversationTitle,
    getLatestServerMessage,
    getTaskStatusMeta,
    handleSendMessage,
    hasUnreadMessages,
    isConversationUnread,
    isSendingMessage,
    openChat,
    resetChatState,
    scrollChatToBottom,
    setChatInput,
    sortedChatableTasks,
    syncChatPinnedState,
  };
}
