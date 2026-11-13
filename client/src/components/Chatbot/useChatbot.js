import { useState } from "react";

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"
).replace(/\/$/, "");

// ── 4 STEP QUESTIONS ──────────────────────────────────────
const STEPS = [
  {
    key: "symptoms",
    question: "Hi there! I'm Mediserver, your AI medical assistant.\n\nPlease describe the symptoms you are currently experiencing (e.g. head pain, stomach pain, fever, cough, etc.).",
    type: "text",
    placeholder: "Describe your symptoms here...",
    validate: (v) =>
      v.trim().length < 3
        ? "Please provide a brief description of your symptoms."
        : null,
  },
  {
    key: "age",
    question: "Thank you for sharing that.\n\nCould you please tell me your age?",
    type: "text",
    placeholder: "Enter your age (e.g. 35)",
    validate: (v) => {
      const n = parseInt(v);
      return isNaN(n) || n < 1 || n > 120
        ? "Please enter a valid age between 1 and 120."
        : null;
    },
  },
  {
    key: "duration",
    question: "How long have you been experiencing these symptoms?",
    type: "options",
    options: [
      { label: "1–2 Days",         value: "1-2 days" },
      { label: "3–5 Days",         value: "3-5 days" },
      { label: "About 1 Week",     value: "1 week" },
      { label: "More than 1 Week", value: "more than 1 week" },
    ],
  },
  {
    key: "conditions",
    question: "Do you have any pre-existing medical conditions?\n\nPlease select all that apply.",
    type: "multi",
    options: [
      { label: "❤️ Heart Patient",      value: "heart patient" },
      { label: "🩸 High Blood Pressure", value: "high blood pressure" },
      { label: "🍬 Diabetes / Sugar",   value: "diabetes" },
      { label: "✅ None of the above",  value: "none" },
    ],
  },
];

// ── SYSTEM PROMPT ─────────────────────────────────────────
const SYSTEM_PROMPT = `You are Mediserver, a professional AI medical assistant. Your role is strictly limited to medicine and health advice only.

IMPORTANT INSTRUCTION FOR SYMPTOMS AND TRANSLATION:
- The user might enter symptoms in English, Urdu, or Roman Urdu (e.g. "sir dard" for headache, "bukhar" or "fevar" for fever, "pat dard" or "pait dard" or "stomach pain" for stomach ache, "khansi" for cough, "galay main dard" or "throat pain" for sore throat, "nazla/zukaam" for common cold, "vomit/ulti" for vomiting).
- You MUST correctly understand and translate these symptoms to their clinical meanings and treat them as active, separate complaints.
- Ensure you recommend appropriate, separate medicines for EACH active symptom described (e.g., if the user describes fever, headache, AND stomach pain, you must recommend a medicine for fever/headache like Paracetamol, AND a separate medicine for stomach pain like Hyoscine butylbromide/Buscopan). Do not ignore any of the symptoms.

CRITICAL OUTPUT FORMAT — You MUST follow this EXACT structure every time. Do NOT add anything outside this structure:

CONDITION: [condition name e.g. Fever, Common Cold, Headache, Stomach Cramps]

MEDICINES:
[List only the medicine names, one per line, e.g.:
Paracetamol (Panadol)
Hyoscine butylbromide (Buscopan)]

DETAILS:
[For EACH medicine above, write a separate block in this exact format:]
[Medicine Name]:
- Use: [what it treats / why it is used]
- Dose: [exact dose e.g. 500mg, 1 tablet]
- Frequency: [how many times per day e.g. 2–3 times daily, every 8 hours]

[Repeat block for every medicine listed]

STRICT RULES:
- If the user's message is NOT about medicine, symptoms, or health, respond ONLY with: "I'm here to assist with medical questions only. Please describe your symptoms or ask a health-related question."
- Always consider pre-existing conditions and adjust recommendations accordingly (e.g. avoid NSAIDs/Ibuprofen for blood pressure/heart patients, avoid sugar-coated pills or certain drugs for diabetics).
- Never recommend more than 4 medicines.
- Never skip the format above.
- Do NOT include any ADVICE section.
- Do NOT include any DISCLAIMER section.
- End your response after the DETAILS section only.`;

// ── CALL BACKEND ──────────────────────────────────────────
async function callBackend(messages) {
  const response = await fetch(`${API_BASE}/api/chatbot/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, system: SYSTEM_PROMPT }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || `Server error ${response.status}`);
  }
  const data = await response.json();
  if (!data.success) throw new Error(data.message || "Unknown error");
  return data.reply;
}

function buildPrompt(answers) {
  return `Patient Information:
- Symptoms: ${answers.symptoms}
- Age: ${answers.age} years old
- Duration of symptoms: ${answers.duration}
- Pre-existing conditions: ${answers.conditions}

Please provide medicine recommendations using the required structured format.`;
}

// ═══════════════════════════════════════════════════════════
export const useChatbot = () => {
  const [messages, setMessages] = useState([
    { from: "bot", type: "bot-text", text: STEPS[0].question },
  ]);
  const [step, setStep]               = useState(0);
  const [answers, setAnswers]         = useState({});
  const [loading, setLoading]         = useState(false);
  const [done, setDone]               = useState(false);
  const [multiSel, setMultiSel]       = useState([]);
  const [inputText, setInputText]     = useState("");
  const [followUpText, setFollowUpText] = useState("");
  const [conversation, setConversation] = useState([]);

  const addMsg = (msg) =>
    setMessages((prev) => [...prev, { from: "bot", ...msg }]);

  const handleAnswer = async (value) => {
    const currentStep = STEPS[step];
    if (currentStep.validate) {
      const err = currentStep.validate(String(value));
      if (err) { addMsg({ type: "error", text: err }); return; }
    }

    let displayVal = value;
    if (currentStep.type === "options")
      displayVal = currentStep.options.find((o) => o.value === value)?.label || value;
    if (currentStep.type === "multi") {
      const vals = Array.isArray(value) ? value : [value];
      displayVal = vals.map((v) => currentStep.options.find((o) => o.value === v)?.label || v).join(", ");
    }

    const newAnswers = {
      ...answers,
      [currentStep.key]: Array.isArray(value) ? value.join(", ") : value,
    };
    setAnswers(newAnswers);
    setMessages((prev) => [...prev, { from: "user", type: "user", text: displayVal }]);
    setInputText("");

    const nextStep = step + 1;

    if (nextStep < STEPS.length) {
      setTimeout(() => {
        addMsg({ type: "bot-text", text: STEPS[nextStep].question });
        setStep(nextStep);
        setMultiSel([]);
      }, 350);
    } else {
      setDone(true);
      setLoading(true);
      setTimeout(() => addMsg({ type: "thinking" }), 400);

      const userPrompt = buildPrompt(newAnswers);
      const msgs = [{ role: "user", content: userPrompt }];

      try {
        const aiReply = await callBackend(msgs);
        setMessages((prev) => prev.filter((m) => m.type !== "thinking"));
        addMsg({ type: "medicine-card", text: aiReply });
        setConversation([
          { role: "user", content: userPrompt },
          { role: "assistant", content: aiReply },
        ]);
      } catch (err) {
        setMessages((prev) => prev.filter((m) => m.type !== "thinking"));
        addMsg({
          type: "error",
          text: `Unable to retrieve a recommendation.\n\nError: ${err.message}\n\nPlease try again or consult a healthcare professional.`,
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleFollowUp = async (text) => {
    if (!text.trim()) return;
    setMessages((prev) => [...prev, { from: "user", type: "user", text }]);
    setFollowUpText("");
    setLoading(true);
    setTimeout(() => addMsg({ type: "thinking" }), 300);
    const updatedConv = [...conversation, { role: "user", content: text }];
    try {
      const aiReply = await callBackend(updatedConv);
      setMessages((prev) => prev.filter((m) => m.type !== "thinking"));
      const isStructured = aiReply.includes("CONDITION:") || aiReply.includes("MEDICINES:");
      addMsg({ type: isStructured ? "medicine-card" : "bot-text", text: aiReply });
      setConversation([...updatedConv, { role: "assistant", content: aiReply }]);
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.type !== "thinking"));
      addMsg({ type: "error", text: `Error: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  const toggleMulti = (val) => {
    if (val === "none") { setMultiSel(["none"]); return; }
    setMultiSel((prev) => {
      const without = prev.filter((v) => v !== "none");
      return without.includes(val) ? without.filter((v) => v !== val) : [...without, val];
    });
  };

  const submitMulti = () => {
    const vals = multiSel.length === 0 ? ["none"] : multiSel;
    handleAnswer(vals);
  };

  const reset = () => {
    setMessages([{ from: "bot", type: "bot-text", text: STEPS[0].question }]);
    setStep(0);
    setAnswers({});
    setDone(false);
    setLoading(false);
    setMultiSel([]);
    setInputText("");
    setFollowUpText("");
    setConversation([]);
  };

  return {
    messages, loading, done,
    currentStep: done ? null : STEPS[step],
    inputText, setInputText,
    handleAnswer, toggleMulti, submitMulti, multiSel,
    reset,
    followUpText, setFollowUpText, handleFollowUp,
  };
};