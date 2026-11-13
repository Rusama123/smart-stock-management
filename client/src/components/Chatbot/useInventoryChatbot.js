import { useState } from "react";

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"
).replace(/\/$/, "");

const PHARMACY_WELCOME =
  "Hello! I'm your Pharmacy Inventory Assistant.\n\nI'll recommend medicines based on the patient's symptoms — but only items currently in YOUR pharmacy stock.\n\nPlease describe the patient's symptoms or health issue.";

const SYMPTOMS_PLACEHOLDER = "e.g. fever and sore throat for 2 days...";

function validateSymptoms(v) {
  return v.trim().length < 3
    ? "Please describe the symptoms in a bit more detail."
    : null;
}

async function callInventoryChat({ query, type, messages, symptoms }) {
  const token = localStorage.getItem("token");
  const isSingle = type === "single";
  // Public MUST hit /inventory/public (no JWT). Pharmacy uses /inventory/single with Bearer token.
  const url = isSingle
    ? `${API_BASE}/api/chatbot/inventory/single`
    : `${API_BASE}/api/chatbot/inventory/public`;

  const headers = { "Content-Type": "application/json" };
  if (isSingle) {
    if (!token) throw new Error("Please log in to use the Pharmacy Inventory Assistant.");
    headers.Authorization = `Bearer ${token}`;
  }

  const body = {
    query,
    type: isSingle ? "single" : "public",
    messages,
  };
  if (isSingle && symptoms) {
    body.symptoms = symptoms;
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) {
    throw new Error(data.message || `Server error ${response.status}`);
  }
  return data.reply;
}

export function useInventoryChatbot({ type = "public" } = {}) {
  const isSingle = type === "single";

  const publicWelcome =
    "Hello! I'm Medix Medicine Finder.\n\nAsk which pharmacies have a medicine — for example: \"Where can I find Augmentin?\" or \"panadol\"";

  const [messages, setMessages] = useState([
    {
      from: "bot",
      type: "bot-text",
      text: isSingle ? PHARMACY_WELCOME : publicWelcome,
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversation, setConversation] = useState([]);

  // Pharmacy: one symptoms question, then free follow-up
  const [symptoms, setSymptoms] = useState("");
  const [intakeDone, setIntakeDone] = useState(!isSingle);

  const sendPublicMessage = async (query) => {
    const updatedConv = [...conversation, { role: "user", content: query }];
    setMessages((prev) => [...prev, { from: "bot", type: "thinking", text: "" }]);
    try {
      const reply = await callInventoryChat({
        query,
        type: "public",
        messages: updatedConv,
      });
      setMessages((prev) => prev.filter((m) => m.type !== "thinking"));
      setMessages((prev) => [...prev, { from: "bot", type: "bot-text", text: reply }]);
      setConversation([...updatedConv, { role: "assistant", content: reply }]);
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.type !== "thinking"));
      setMessages((prev) => [
        ...prev,
        {
          from: "bot",
          type: "error",
          text: err.message || "Unable to search pharmacies. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const runPharmacyRecommendation = async (symptomText, followUpQuery) => {
    const summary = `Patient symptoms: ${symptomText}.${
      followUpQuery ? ` Follow-up: ${followUpQuery}` : ""
    }`;
    const updatedConv = [...conversation, { role: "user", content: summary }];
    setMessages((prev) => [...prev, { from: "bot", type: "thinking", text: "" }]);

    try {
      const reply = await callInventoryChat({
        query: followUpQuery || summary,
        type: "single",
        messages: updatedConv,
        symptoms: symptomText,
      });
      setMessages((prev) => prev.filter((m) => m.type !== "thinking"));
      setMessages((prev) => [...prev, { from: "bot", type: "bot-text", text: reply }]);
      setConversation([...updatedConv, { role: "assistant", content: reply }]);
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.type !== "thinking"));
      setMessages((prev) => [
        ...prev,
        {
          from: "bot",
          type: "error",
          text: err.message || "Unable to check pharmacy stock. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (text) => {
    const query = (text || "").trim();
    if (!query || loading) return;

    setMessages((prev) => [...prev, { from: "user", type: "user", text: query }]);
    setInputText("");
    setLoading(true);

    if (!isSingle) {
      await sendPublicMessage(query);
      return;
    }

    // Pharmacy: single symptoms intake, then free follow-up against stocked recommendations
    if (!intakeDone) {
      const err = validateSymptoms(query);
      if (err) {
        setLoading(false);
        setMessages((prev) => [
          ...prev,
          { from: "bot", type: "error", text: err },
        ]);
        return;
      }

      setSymptoms(query);
      setIntakeDone(true);
      await runPharmacyRecommendation(query, null);
      return;
    }

    await runPharmacyRecommendation(symptoms, query);
  };

  const reset = () => {
    setMessages([
      {
        from: "bot",
        type: "bot-text",
        text: isSingle ? PHARMACY_WELCOME : publicWelcome,
      },
    ]);
    setInputText("");
    setLoading(false);
    setConversation([]);
    setSymptoms("");
    setIntakeDone(!isSingle);
  };

  const placeholder = (() => {
    if (!isSingle) return "Which medicine are you looking for?";
    if (!intakeDone) return SYMPTOMS_PLACEHOLDER;
    return "Ask a follow-up, or describe new symptoms...";
  })();

  return {
    messages,
    loading,
    inputText,
    setInputText,
    sendMessage,
    reset,
    type,
    placeholder,
    intakeDone,
  };
}
