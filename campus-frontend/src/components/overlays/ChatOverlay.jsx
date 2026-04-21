import { useCallback, useEffect, useRef } from 'react';
import ChatPanel from '../chat/ChatPanel';

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

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
  const overlayRef = useRef(null);
  const closeButtonRef = useRef(null);
  const restoreFocusRef = useRef(null);

  const getFocusableElements = useCallback(() => {
    const container = overlayRef.current;
    if (!container) {
      return [];
    }

    return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
      (element) => element instanceof HTMLElement && !element.hasAttribute('disabled'),
    );
  }, []);

  useEffect(() => {
    if (!activeChatTask) {
      restoreFocusRef.current = null;
      return undefined;
    }

    const activeElement = document.activeElement;
    restoreFocusRef.current = activeElement instanceof HTMLElement ? activeElement : null;
    const frameId = requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });

    return () => {
      cancelAnimationFrame(frameId);
      const restoreTarget = restoreFocusRef.current;
      restoreFocusRef.current = null;

      if (restoreTarget && restoreTarget.isConnected) {
        restoreTarget.focus();
      }
    };
  }, [activeChatTask]);

  const focusFirstElement = useCallback(() => {
    const focusableElements = getFocusableElements();
    const firstElement = focusableElements[0];
    if (firstElement) {
      firstElement.focus();
    } else {
      overlayRef.current?.focus();
    }
  }, [getFocusableElements]);

  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      onClose?.();
      return;
    }

    if (event.key !== 'Tab') {
      return;
    }

    const focusableElements = getFocusableElements();
    if (focusableElements.length === 0) {
      event.preventDefault();
      overlayRef.current?.focus();
      return;
    }

    const activeElement = document.activeElement;
    const currentIndex = focusableElements.findIndex((element) => element === activeElement);
    const lastIndex = focusableElements.length - 1;

    event.preventDefault();
    if (event.shiftKey) {
      const previousIndex = currentIndex <= 0 ? lastIndex : currentIndex - 1;
      focusableElements[previousIndex].focus();
      return;
    }

    const nextIndex = currentIndex === -1 || currentIndex === lastIndex ? 0 : currentIndex + 1;
    focusableElements[nextIndex].focus();
  }, [getFocusableElements, onClose]);

  useEffect(() => {
    if (!activeChatTask) {
      return undefined;
    }

    const handleFocusIn = (event) => {
      const container = overlayRef.current;
      if (!container || container.contains(event.target)) {
        return;
      }

      focusFirstElement();
    };

    document.addEventListener('focusin', handleFocusIn);

    return () => {
      document.removeEventListener('focusin', handleFocusIn);
    };
  }, [activeChatTask, focusFirstElement]);

  return (
    <div
      ref={overlayRef}
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
