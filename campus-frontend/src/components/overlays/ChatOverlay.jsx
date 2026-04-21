import { useEffect, useRef } from 'react';
import ChatPanel from '../chat/ChatPanel';

export default function ChatOverlay({
  activeChatTask,
  chatInput,
  chatMessages,
  chatPendingNewMessageCount,
  chatScrollContainerRef,
  currentUser,
  getConversationTitle,
  handleSendMessage,
  isSendingMessage,
  onChatInputChange,
  onClose,
  onScroll,
  scrollChatToBottom,
}) {
  const closeButtonRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (!activeChatTask) {
      return undefined;
    }

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const frameId = requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });

    return () => {
      cancelAnimationFrame(frameId);
      previousFocusRef.current?.focus?.();
      previousFocusRef.current = null;
    };
  }, [activeChatTask]);

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      onClose?.();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-center bg-slate-900/40 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="chat-overlay-title"
      aria-describedby="chat-overlay-description"
      tabIndex={-1}
      onKeyDown={handleKeyDown}
    >
      <ChatPanel
        activeChatTask={activeChatTask}
        chatInput={chatInput}
        chatMessages={chatMessages}
        chatPendingNewMessageCount={chatPendingNewMessageCount}
        chatScrollContainerRef={chatScrollContainerRef}
        currentUser={currentUser}
        dialogDescriptionId="chat-overlay-description"
        dialogTitleId="chat-overlay-title"
        getConversationTitle={getConversationTitle}
        handleSendMessage={handleSendMessage}
        isSendingMessage={isSendingMessage}
        onChatInputChange={onChatInputChange}
        onClose={onClose}
        closeButtonRef={closeButtonRef}
        onScroll={onScroll}
        scrollChatToBottom={scrollChatToBottom}
        variant="overlay"
      />
    </div>
  );
}
