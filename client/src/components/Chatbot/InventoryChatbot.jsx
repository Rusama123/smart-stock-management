import { useRef, useEffect, useState } from "react";
import { useInventoryChatbot } from "./useInventoryChatbot";
import "./ChatbotWidget.css";

const SendIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const Logo = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <rect width="40" height="40" rx="10" fill="white" fillOpacity="0.15"/>
    <rect x="15" y="7" width="10" height="26" rx="3" fill="white"/>
    <rect x="7" y="15" width="26" height="10" rx="3" fill="white"/>
  </svg>
);

const MessageBubble = ({ msg }) => {
  if (msg.type === "thinking") {
    return (
      <div className="ms-msg-wrap bot">
        <div className="bot-avatar"><Logo size={16} /></div>
        <div className="ms-msg bot typing"><span /><span /><span /></div>
      </div>
    );
  }

  if (msg.from === "user") {
    return (
      <div className="ms-msg-wrap user">
        <div className="ms-msg user">{msg.text}</div>
      </div>
    );
  }

  const isError = msg.type === "error";
  return (
    <div className="ms-msg-wrap bot">
      <div className="bot-avatar"><Logo size={16} /></div>
      <div
        className={`ms-msg bot ${isError ? "msg-warning" : ""}`}
        style={{ wordBreak: "break-word", overflowWrap: "break-word" }}
      >
        {(msg.text || "").split("\n").map((l, i) => (
          <span key={i}>{l}<br /></span>
        ))}
      </div>
    </div>
  );
};

export default function InventoryChatbot({ type = "public", defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const [isClosing, setIsClosing] = useState(false);
  const messagesEndRef = useRef(null);
  const {
    messages, loading, inputText, setInputText, sendMessage, reset, placeholder,
  } = useInventoryChatbot({ type });

  const isSingle = type === "single";
  const title = isSingle ? "Pharmacy Assistant" : "Medicine Finder";
  const subtitle = isSingle ? "Symptoms → in-stock only" : "Find medicine nearby";
  const fabLabel = isSingle ? "Assist" : "Find Med";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleOpen = () => { setIsClosing(false); setOpen(true); };
  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => { setOpen(false); setIsClosing(false); }, 280);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (inputText.trim()) sendMessage(inputText);
    }
  };

  return (
    <>
      <button
        className={`ms-fab ${open ? "ms-fab--open" : ""} ${isSingle ? "ms-fab--inventory" : "ms-fab--public"}`}
        onClick={open ? handleClose : handleOpen}
        title={title}
      >
        <span className="fab-logo-wrap">
          {open ? (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 40 40" fill="none">
              <rect x="15" y="7" width="10" height="26" rx="3" fill="white"/>
              <rect x="7" y="15" width="26" height="10" rx="3" fill="white"/>
            </svg>
          )}
        </span>
        {open ? "Close" : fabLabel}
        {!open && <span className="fab-pulse" />}
      </button>

      {open && (
        <div className={`ms-window ${isClosing ? "ms-window--closing" : ""}`}>
          <div className="ms-header">
            <div className="header-brand">
              <div className="header-logo-box"><Logo size={20} /></div>
              <div>
                <div className="header-title">Med<span>ix</span></div>
                <div className="header-sub">{subtitle}</div>
              </div>
            </div>
            <div className="header-actions">
              <div className="header-status">
                <span className="status-dot" /><span className="status-text">Online</span>
              </div>
              <button className="btn-icon" onClick={reset} title="New chat">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="1 4 1 10 7 10" />
                  <path d="M3.51 15a9 9 0 1 0 .49-4.95" />
                </svg>
              </button>
              <button className="btn-icon" onClick={handleClose}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>

          <div className="ms-messages">
            {messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}
            <div ref={messagesEndRef} />
          </div>

          <div className="ms-input-area">
            <div className="ms-text-input">
              <input
                type="text"
                placeholder={placeholder}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
                autoFocus
              />
              <button
                onClick={() => inputText.trim() && sendMessage(inputText)}
                disabled={!inputText.trim() || loading}
              >
                {loading ? "⏳" : <SendIcon />}
              </button>
            </div>
          </div>

          <div className="ms-footer">
            {isSingle
              ? <>Powered by <strong>Medix</strong> · Recommend only what you stock</>
              : <>Powered by <strong>Medix</strong> · Connected pharmacies</>}
          </div>
        </div>
      )}
    </>
  );
}
