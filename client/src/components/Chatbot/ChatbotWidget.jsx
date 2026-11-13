import { useRef, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useChatbot } from "./useChatbot";
import "./ChatbotWidget.css";

// ─── Icons ────────────────────────────────────────────────
const SendIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const MediserverLogo = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <rect width="40" height="40" rx="10" fill="white" fillOpacity="0.15"/>
    <rect x="15" y="7" width="10" height="26" rx="3" fill="white"/>
    <rect x="7" y="15" width="26" height="10" rx="3" fill="white"/>
  </svg>
);

// ─── Parse AI structured response ─────────────────────────
function parseMedicineResponse(text) {
  const result = {
    condition: "",
    medicines: [],
    details: [],
    // ADVICE and DISCLAIMER intentionally removed
  };

  // CONDITION
  const condMatch = text.match(/CONDITION:\s*(.+)/i);
  if (condMatch) result.condition = condMatch[1].trim();

  // MEDICINES block — lines between MEDICINES: and DETAILS:
  const medBlock = text.match(/MEDICINES:\s*([\s\S]*?)(?=DETAILS:|$)/i);
  if (medBlock) {
    result.medicines = medBlock[1]
      .split("\n")
      .map((l) => l.replace(/^[-•*]\s*/, "").trim())
      .filter((l) => l.length > 2);
  }

  // DETAILS block — parse each medicine block (stop before ADVICE or DISCLAIMER)
  const detailsBlock = text.match(/DETAILS:\s*([\s\S]*?)(?=ADVICE:|DISCLAIMER:|$)/i);
  if (detailsBlock) {
    const blocks = detailsBlock[1].split(/\n(?=[^\s-].*:)/);
    blocks.forEach((block) => {
      const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
      if (!lines.length) return;
      const name = lines[0].replace(/:$/, "").trim();
      const useMatch  = block.match(/[-–]\s*Use:\s*(.+)/i);
      const doseMatch = block.match(/[-–]\s*Dose:\s*(.+)/i);
      const freqMatch = block.match(/[-–]\s*Frequency:\s*(.+)/i);
      if (name && (useMatch || doseMatch || freqMatch)) {
        result.details.push({
          name,
          use:       useMatch  ? useMatch[1].trim()  : "",
          dose:      doseMatch ? doseMatch[1].trim()  : "",
          frequency: freqMatch ? freqMatch[1].trim()  : "",
        });
      }
    });
  }

  return result;
}

// ─── Medicine Card Component ───────────────────────────────
const MedicineCard = ({ text }) => {
  const data = parseMedicineResponse(text);

  // Fallback: if parsing fails just render plain text
  if (!data.condition && !data.medicines.length) {
    return (
      <div className="ms-msg bot" style={{ wordBreak: "break-word", overflowWrap: "break-word", whiteSpace: "normal" }}>
        {text.split("\n").map((l, i) => <span key={i}>{l}<br /></span>)}
      </div>
    );
  }

  return (
    <div className="med-card">
      {/* Condition */}
      {data.condition && (
        <div className="med-card__condition">
          <span className="med-card__condition-icon">🩺</span>
          <span>{data.condition}</span>
        </div>
      )}

      {/* Medicine names list */}
      {data.medicines.length > 0 && (
        <div className="med-card__names-section">
          <div className="med-card__section-label">💊 Recommended Medicines</div>
          <div className="med-card__names-list">
            {data.medicines.map((med, i) => (
              <span key={i} className="med-card__name-pill">{med}</span>
            ))}
          </div>
        </div>
      )}

      {/* Detailed blocks per medicine */}
      {data.details.length > 0 && (
        <div className="med-card__details-section">
          <div className="med-card__section-label">📋 Medicine Details</div>
          {data.details.map((med, i) => (
            <div key={i} className="med-card__detail-block">
              <div className="med-card__detail-name">{med.name}</div>
              {med.use && (
                <div className="med-card__detail-row">
                  <span className="med-card__detail-key">Use</span>
                  <span className="med-card__detail-val">{med.use}</span>
                </div>
              )}
              {med.dose && (
                <div className="med-card__detail-row">
                  <span className="med-card__detail-key">Dose</span>
                  <span className="med-card__detail-val">{med.dose}</span>
                </div>
              )}
              {med.frequency && (
                <div className="med-card__detail-row">
                  <span className="med-card__detail-key">Frequency</span>
                  <span className="med-card__detail-val freq-badge">{med.frequency}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ADVICE and DISCLAIMER sections intentionally removed */}
    </div>
  );
};

// ─── Message Bubble ────────────────────────────────────────
const MessageBubble = ({ msg }) => {
  if (msg.type === "thinking") return (
    <div className="ms-msg-wrap bot">
      <div className="bot-avatar"><MediserverLogo size={16} /></div>
      <div className="ms-msg bot typing"><span /><span /><span /></div>
    </div>
  );

  if (msg.from === "user") return (
    <div className="ms-msg-wrap user">
      <div className="ms-msg user">{msg.text}</div>
    </div>
  );

  if (msg.type === "medicine-card") return (
    <div className="ms-msg-wrap bot wide-msg">
      <div className="bot-avatar"><MediserverLogo size={16} /></div>
      <MedicineCard text={msg.text} />
    </div>
  );

  if (msg.type === "error") return (
    <div className="ms-msg-wrap bot">
      <div className="bot-avatar"><MediserverLogo size={16} /></div>
      <div className="ms-msg bot msg-warning" style={{ wordBreak: "break-word", overflowWrap: "break-word" }}>
        {(msg.text || "").split("\n").map((l, i) => <span key={i}>{l}<br /></span>)}
      </div>
    </div>
  );

  return (
    <div className="ms-msg-wrap bot">
      <div className="bot-avatar"><MediserverLogo size={16} /></div>
      <div className="ms-msg bot" style={{ wordBreak: "break-word", overflowWrap: "break-word" }}>
        {(msg.text || "").split("\n").map((l, i) => <span key={i}>{l}<br /></span>)}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// MAIN WIDGET
// ═══════════════════════════════════════════════════════════
export default function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const messagesEndRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    if (location.pathname === "/ai-assistant") {
      setOpen(true);
    }
  }, [location]);

  const {
    messages, loading, done, currentStep,
    inputText, setInputText,
    handleAnswer, toggleMulti, submitMulti, multiSel, reset,
    followUpText, setFollowUpText, handleFollowUp,
  } = useChatbot();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleOpen = () => { setIsClosing(false); setOpen(true); };
  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => { setOpen(false); setIsClosing(false); }, 280);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (inputText.trim()) handleAnswer(inputText); }
  };
  const handleFollowUpKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (followUpText.trim()) handleFollowUp(followUpText); }
  };

  const userMsgCount = messages.filter(m => m.from === "user").length;
  const totalSteps = 4;
  const progressPct = done ? 100 : Math.min((userMsgCount / totalSteps) * 100, 95);
  const stepLabels = ["Symptoms", "Age", "Duration", "Conditions"];

  const renderInput = () => {
    if (loading) return null;

    if (done) return (
      <div className="ms-input-area">
        <div className="ms-text-input">
          <input
            type="text"
            placeholder="Ask a follow-up question..."
            value={followUpText}
            onChange={(e) => setFollowUpText(e.target.value)}
            onKeyDown={handleFollowUpKey}
            autoFocus
          />
          <button onClick={() => followUpText.trim() && handleFollowUp(followUpText)} disabled={!followUpText.trim()}>
            <SendIcon />
          </button>
        </div>
        <button className="btn-new-consult" onClick={reset}>↺ Start New Consultation</button>
      </div>
    );

    if (!currentStep) return null;

    if (currentStep.type === "options") return (
      <div className="ms-input-area">
        <div className="options-grid">
          {currentStep.options.map((opt) => (
            <button key={opt.value} className="btn-option" onClick={() => handleAnswer(opt.value)}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    );

    if (currentStep.type === "multi") return (
      <div className="ms-input-area">
        <div className="multi-list">
          {currentStep.options.map((opt) => {
            const sel = multiSel.includes(opt.value);
            return (
              <div key={opt.value} className={`multi-opt ${sel ? "multi-opt--on" : ""}`} onClick={() => toggleMulti(opt.value)}>
                <span className="multi-check">{sel ? "✓" : ""}</span>
                <span>{opt.label}</span>
              </div>
            );
          })}
        </div>
        <button className="btn-continue" onClick={submitMulti}>Continue →</button>
      </div>
    );

    return (
      <div className="ms-input-area">
        <div className="ms-text-input">
          <input
            type="text"
            placeholder={currentStep.placeholder || "Type your response..."}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            autoFocus
          />
          <button onClick={() => inputText.trim() && handleAnswer(inputText)} disabled={!inputText.trim() || loading}>
            {loading ? "⏳" : <SendIcon />}
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      <button
        className={`ms-fab ${open ? "ms-fab--open" : ""}`}
        onClick={open ? handleClose : handleOpen}
        title="Medix — Medical Assistant"
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
        {open ? "Close" : "Medix"}
        {!open && <span className="fab-pulse" />}
      </button>

      {open && (
        <div className={`ms-window ${isClosing ? "ms-window--closing" : ""}`}>

          {/* Header */}
          <div className="ms-header">
            <div className="header-brand">
              <div className="header-logo-box"><MediserverLogo size={20} /></div>
              <div>
                <div className="header-title">Med<span>ix</span></div>
                <div className="header-sub">AI Medical Assistant</div>
              </div>
            </div>
            <div className="header-actions">
              <div className="header-status">
                <span className="status-dot" /><span className="status-text">Online</span>
              </div>
              <button className="btn-icon" onClick={reset} title="New Consultation">
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

          {/* Progress */}
          {!done && (
            <div className="ms-progress">
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${progressPct}%` }} />
              </div>
              <div className="progress-labels">
                {stepLabels.map((label, i) => (
                  <span key={i} className={`prog-label ${
                    i < userMsgCount ? "prog-label--done" :
                    i === userMsgCount ? "prog-label--active" : ""
                  }`}>
                    {i < userMsgCount ? "✓ " : `${i + 1}. `}{label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="ms-messages">
            {messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          {renderInput()}

          {/* Footer */}
          <div className="ms-footer">
            Powered by <strong>Medix AI</strong> · For Medical Assistant
          </div>
        </div>
      )}
    </>
  );
}