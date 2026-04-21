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
  isMessagesPage = false,
  isSendingMessage,
  onChatInputChange,
  onClose,
  onScroll,
  scrollChatToBottom,
}) {
  if (!activeChatTask) {
    return null;
  }

  // The messages page already renders the inline chat panel at xl widths.
  const overlayClasses = `fixed inset-0 z-50 flex justify-center bg-slate-900/40 backdrop-blur-sm sm:items-center ${
    isMessagesPage ? 'xl:hidden' : ''
  }`;

  return (
    <div className={overlayClasses}>
      <ChatPanel
        activeChatTask={activeChatTask}
        chatInput={chatInput}
        chatMessages={chatMessages}
        chatPendingNewMessageCount={chatPendingNewMessageCount}
        chatScrollContainerRef={chatScrollContainerRef}
        currentUser={currentUser}
        getConversationTitle={getConversationTitle}
        handleSendMessage={handleSendMessage}
        isSendingMessage={isSendingMessage}
        onChatInputChange={onChatInputChange}
        onClose={onClose}
        onScroll={onScroll}
        scrollChatToBottom={scrollChatToBottom}
        variant="overlay"
      />
    </div>
  );
}
