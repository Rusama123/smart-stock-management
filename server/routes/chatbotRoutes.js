import express from "express";
import https from "https";
import { authenticateToken } from "../middleware/auth.js";
import Inventory from "../models/Inventory.js";
import User from "../models/User.js";

const router = express.Router();

const SYSTEM_PROMPT = `You are MediBot, a professional AI medical assistant. Your sole purpose is to recommend appropriate medicines based on the patient's symptoms, age, and medical history.

STRICT RULES:
1. ONLY respond to medical, health, or medicine-related questions.
2. If the user asks anything unrelated to health or medicine, respond EXACTLY with:
   "❌ I can only assist with medical questions and medicine recommendations. Please consult a professional for other inquiries."
3. Always respond in clear, professional English. No slang, no casual tone.
4. Keep responses concise and clinically relevant. Do not over-explain.

MEDICINE RECOMMENDATION FORMAT — use this EXACT structure:

🩺 DETECTED CONDITION: [Condition Name]

✅ RECOMMENDED MEDICINES:
- [Medicine Name] ([Generic Name])
  - Dose: [dosage and frequency]
  - Usage: [when and how to take]
  - Note: [important clinical note]

⚠️ AVOID IF:
- [pre-existing condition] — avoid [medicine/ingredient] due to [brief reason]

💡 ADVICE: [1–2 sentences of practical clinical advice]

⚠️ DISCLAIMER: This is for informational purposes only. Always consult a licensed physician before taking any medication.

EMERGENCY RULES — If symptoms suggest a potentially life-threatening condition (e.g., severe chest pain, difficulty breathing, uncontrolled bleeding, stroke symptoms, loss of consciousness):
- Respond with: "EMERGENCY: Seek immediate medical attention."
- Then provide First Aid steps clearly before recommending hospital visit.
- Format:
  EMERGENCY — Immediate Action Required
  First Aid Steps:
  1. [step]
  2. [step]
  3. Contact emergency services or go to the nearest hospital immediately.

CLINICAL GUIDELINES:
- Recommend only medicines widely available in Pakistan and South Asia.
- For children under 12, always adjust dosage and flag it explicitly.
- For patients with diabetes, heart disease, or hypertension, flag any contraindicated medicines clearly.
- For simple, common conditions (e.g., mild headache, mild fever), recommend only 1–2 medicines. Do not over-prescribe.
- For headache only (no other conditions): recommend Panadol (Paracetamol) 500mg, 1–2 tablets every 6–8 hours as needed. Do not recommend anything else unless symptoms warrant it.
- Be precise and minimal — a focused recommendation is more valuable than an exhaustive list.`;

function callGroq(messages, { temperature = 0.25, maxTokens = 900 } = {}) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return reject(new Error("GROQ_API_KEY is not configured on the server."));
    }

    const payload = JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages,
      max_tokens: maxTokens,
      temperature,
    });

    const options = {
      hostname: "api.groq.com",
      path: "/openai/v1/chat/completions",
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload),
      },
    };

    const reqHttp = https.request(options, (r) => {
      let data = "";
      r.on("data", (chunk) => (data += chunk));
      r.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (r.statusCode !== 200) {
            const err = new Error(parsed.error?.message || "Groq API returned an error.");
            err.status = r.statusCode;
            err.body = parsed;
            return reject(err);
          }
          resolve(parsed.choices?.[0]?.message?.content || "");
        } catch (e) {
          reject(e);
        }
      });
    });
    reqHttp.on("error", (err) => {
      // Network-level failures (DNS resolution, connection refused, timeout,
      // etc.) should never leak raw Node error text to end users — wrap them
      // in a clear, actionable message instead.
      const networkCodes = ["ENOTFOUND", "ECONNREFUSED", "ETIMEDOUT", "ECONNRESET", "EAI_AGAIN"];
      if (networkCodes.includes(err.code)) {
        const wrapped = new Error(
          "Unable to reach the AI service right now. Please check the server's internet connection and try again."
        );
        wrapped.status = 503;
        wrapped.cause = err;
        console.error("Groq network error:", err.code, err.message);
        return reject(wrapped);
      }
      reject(err);
    });
    reqHttp.write(payload);
    reqHttp.end();
  });
}

function extractJsonObject(text) {
  if (!text) return null;
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function mapStockItem(m) {
  return {
    brandName: m.brandName,
    genericName: m.genericName,
    dosage: m.dosage,
    category: m.category || "",
    quantity: m.currentStock,
    status: (m.currentStock || 0) > 0 ? "Available" : "Out of Stock",
  };
}

// Public (patient-facing) medicine mapping — quantity AND price are NEVER
// exposed here. Patients only get brand/generic/dosage + which pharmacy.
function mapPublicItem(m) {
  return {
    brandName: m.brandName,
    genericName: m.genericName,
    dosage: m.dosage,
  };
}

async function extractMedicineName(query) {
  const content = await callGroq(
    [
      {
        role: "system",
        content: `Extract the medicine name the user is searching for from their query.
Return ONLY valid JSON in this exact shape:
{"medicineName":"<brand or generic name or empty string>","isMedicineQuery":true|false}

Rules:
- medicineName should be the brand or salt/generic name mentioned.
- If the user is not asking about medicine availability/stock, set isMedicineQuery to false and medicineName to "".
- Do not invent a medicine name.`,
      },
      { role: "user", content: query },
    ],
    { temperature: 0.1, maxTokens: 200 }
  );

  const parsed = extractJsonObject(content) || {
    medicineName: query.trim(),
    isMedicineQuery: true,
  };

  return {
    medicineName: String(parsed.medicineName || "").trim(),
    isMedicineQuery: parsed.isMedicineQuery !== false,
  };
}

/** Suggest clinical candidate medicines from symptoms (names only — stock checked in DB). */
async function suggestCandidatesFromSymptoms({ symptoms, followUpQuery }) {
  const content = await callGroq(
    [
      {
        role: "system",
        content: `You are a clinical pharmacist assistant for a pharmacy in Pakistan/South Asia.
Given patient symptoms only, propose a SHORT list of appropriate OTC/common prescription brand AND generic (salt) names that a pharmacy might stock.

Return ONLY valid JSON:
{
  "condition": "<likely condition>",
  "candidates": [
    {"brandName":"<common brand>","genericName":"<salt/generic>","reason":"<brief why>"}
  ],
  "needsMoreInfo": false,
  "clarifyingQuestion": ""
}

Rules:
- Prefer widely available Pakistan brands (e.g. Panadol/paracetamol, Augmentin/amoxicillin-clavulanate).
- Maximum 5 candidates. Prefer 1–3 for simple cases.
- Age and pre-existing conditions are NOT provided — recommend standard first-line options for the symptoms.
- If symptoms are vague/missing and you cannot recommend safely, set needsMoreInfo true and ask one clarifyingQuestion about symptoms only (do NOT ask age or medical history).
- Do NOT invent stock quantity. Do NOT claim availability.`,
      },
      {
        role: "user",
        content: JSON.stringify({
          symptoms: symptoms || "",
          followUpQuery: followUpQuery || "",
        }),
      },
    ],
    { temperature: 0.2, maxTokens: 500 }
  );

  const parsed = extractJsonObject(content) || {
    condition: "",
    candidates: [],
    needsMoreInfo: true,
    clarifyingQuestion:
      "Could you briefly describe the patient's main symptoms (e.g. fever, cough, headache)?",
  };

  const candidates = Array.isArray(parsed.candidates)
    ? parsed.candidates
        .map((c) => ({
          brandName: String(c.brandName || "").trim(),
          genericName: String(c.genericName || "").trim(),
          reason: String(c.reason || "").trim(),
        }))
        .filter((c) => c.brandName || c.genericName)
        .slice(0, 5)
    : [];

  return {
    condition: String(parsed.condition || "").trim(),
    candidates,
    needsMoreInfo: Boolean(parsed.needsMoreInfo) && candidates.length === 0,
    clarifyingQuestion: String(parsed.clarifyingQuestion || "").trim(),
  };
}

async function loadPharmacyStock(userId) {
  const items = await Inventory.find({
    userId,
    currentStock: { $gt: 0 },
  })
    .select("brandName genericName dosage category currentStock")
    .limit(400)
    .lean();

  return items.map(mapStockItem);
}

/** Match LLM candidates against THIS pharmacy's stock; prefer same generic alternatives. */
async function matchCandidatesToPharmacyStock(userId, candidates) {
  const stock = await loadPharmacyStock(userId);
  const recommendations = [];
  const missingIdeals = [];
  const usedKeys = new Set();

  const findInStock = (brandName, genericName) => {
    const brandRe = brandName ? new RegExp(escapeRegex(brandName), "i") : null;
    const genericRe = genericName
      ? new RegExp(`^${escapeRegex(genericName)}$`, "i")
      : null;

    let direct = stock.filter((s) => {
      if (brandRe && brandRe.test(s.brandName)) return true;
      if (brandRe && brandRe.test(s.genericName)) return true;
      if (genericRe && genericRe.test(s.genericName)) return true;
      if (genericName && new RegExp(escapeRegex(genericName), "i").test(s.brandName))
        return true;
      return false;
    });

    return direct;
  };

  const findAlternatives = (genericName, excludeBrand) => {
    if (!genericName) return [];
    const genericRe = new RegExp(`^${escapeRegex(genericName)}$`, "i");
    const excludeRe = excludeBrand
      ? new RegExp(escapeRegex(excludeBrand), "i")
      : null;
    return stock.filter((s) => {
      if (!genericRe.test(s.genericName || "")) return false;
      if (excludeRe && excludeRe.test(s.brandName)) return false;
      return true;
    });
  };

  for (const cand of candidates) {
    const matches = findInStock(cand.brandName, cand.genericName);
    if (matches.length > 0) {
      for (const m of matches.slice(0, 3)) {
        const key = `${m.brandName}|${m.genericName}|${m.dosage}`;
        if (usedKeys.has(key)) continue;
        usedKeys.add(key);
        recommendations.push({
          ...m,
          reason: cand.reason,
          matchType: "direct",
        });
      }
    } else {
      const alts = findAlternatives(cand.genericName, cand.brandName);
      if (alts.length > 0) {
        missingIdeals.push({
          requested: cand.brandName || cand.genericName,
          genericName: cand.genericName,
          reason: cand.reason,
        });
        for (const m of alts.slice(0, 3)) {
          const key = `${m.brandName}|${m.genericName}|${m.dosage}`;
          if (usedKeys.has(key)) continue;
          usedKeys.add(key);
          recommendations.push({
            ...m,
            reason: cand.reason,
            matchType: "alternative",
            alternativeFor: cand.brandName || cand.genericName,
          });
        }
      } else {
        missingIdeals.push({
          requested: cand.brandName || cand.genericName,
          genericName: cand.genericName,
          reason: cand.reason,
          noAlternativeInStock: true,
        });
      }
    }
  }

  return {
    recommendations,
    missingIdeals,
    stockCount: stock.length,
    // Full stock list for LLM context when candidates fail / clarifying
    inventorySample: stock.slice(0, 120),
  };
}

async function searchPharmacyInventory(userId, medicineName) {
  const nameRegex = new RegExp(escapeRegex(medicineName), "i");

  const matches = await Inventory.find({
    userId,
    $or: [{ brandName: nameRegex }, { genericName: nameRegex }],
  })
    .select("brandName genericName dosage currentStock")
    .lean();

  const inStock = matches.filter((m) => (m.currentStock || 0) > 0);
  const outOfStock = matches.filter((m) => (m.currentStock || 0) <= 0);

  let alternatives = [];
  if (inStock.length === 0) {
    const genericNames = [
      ...new Set(
        matches
          .map((m) => m.genericName)
          .filter(Boolean)
          .map((g) => g.trim())
      ),
    ];

    if (genericNames.length > 0) {
      alternatives = await Inventory.find({
        userId,
        currentStock: { $gt: 0 },
        $or: genericNames.map((g) => ({
          genericName: new RegExp(`^${escapeRegex(g)}$`, "i"),
        })),
        brandName: { $not: nameRegex },
      })
        .select("brandName genericName dosage currentStock")
        .limit(8)
        .lean();
    }

    if (matches.length === 0) {
      alternatives = await Inventory.find({
        userId,
        currentStock: { $gt: 0 },
        genericName: nameRegex,
      })
        .select("brandName genericName dosage currentStock")
        .limit(8)
        .lean();
    }
  }

  return {
    searchedMedicine: medicineName,
    available: inStock.map(mapStockItem),
    unavailable: outOfStock.map(mapStockItem),
    alternatives: alternatives.map(mapStockItem),
  };
}

async function searchPublicNetwork(medicineName) {
  const nameRegex = new RegExp(escapeRegex(medicineName), "i");

  const pharmacies = await User.find({
    role: "user",
    hasAccess: true,
  })
    .select("_id pharmacyName city area address")
    .lean();

  if (!pharmacies.length) {
    return { searchedMedicine: medicineName, pharmacies: [] };
  }

  const pharmacyIds = pharmacies.map((p) => p._id);
  const pharmacyMap = Object.fromEntries(pharmacies.map((p) => [String(p._id), p]));

  // Availability filter uses currentStock > 0; public responses must NEVER expose
  // raw stock quantities — but price IS included now so patients know the cost.
  const items = await Inventory.find({
    userId: { $in: pharmacyIds },
    currentStock: { $gt: 0 },
    $or: [{ brandName: nameRegex }, { genericName: nameRegex }],
  })
    .select("userId brandName genericName dosage")
    .lean();

  const byPharmacy = {};
  for (const item of items) {
    const key = String(item.userId);
    if (!byPharmacy[key]) byPharmacy[key] = [];
    byPharmacy[key].push(mapPublicItem(item));
  }

  const results = Object.entries(byPharmacy)
    .map(([id, medicines]) => {
      const pharmacy = pharmacyMap[id] || {};
      const rawName = String(pharmacy.pharmacyName || "").trim();
      // A DB value that's literally "pharmacy" (or blank) isn't a real, usable
      // name for a patient — treat it the same as missing and fall back to a
      // clean, location-based label instead of showing the raw placeholder text.
      const cleanName = /^pharmacy$/i.test(rawName) ? "" : rawName;
      const locationLabel = [pharmacy.area, pharmacy.city].filter(Boolean).join(", ");
      return {
        // FIX: previously a pharmacy with no pharmacyName/location was dropped
        // entirely below, even if it had the medicine in stock. Now we keep it
        // and fall back to a clean, properly-capitalized label so the medicine
        // still shows up instead of silently disappearing from results.
        pharmacyName:
          cleanName || (locationLabel ? `Registered Pharmacy (${locationLabel})` : "Registered Pharmacy"),
        city: pharmacy.city || "",
        area: pharmacy.area || "",
        address: pharmacy.address || "",
        medicines,
      };
    })
    // The ONLY requirement now is that the pharmacy actually has the medicine
    // in stock. Incomplete profiles no longer hide otherwise-valid matches —
    // that was the bug that made "Disprin" appear missing from public search.
    .filter((p) => p.medicines.length > 0);

  return { searchedMedicine: medicineName, pharmacies: results };
}

function buildPharmacyAssistantPrompt(pharmacyName) {
  return `You are the Pharmacy Inventory Assistant for ${pharmacyName || "this pharmacy"}.

Your job:
1. Help pharmacy staff advise patients based on symptoms / health issues.
2. Recommend ONLY medicines that appear in the provided inventory JSON for THIS pharmacy.
3. Never invent stock, brands, quantities, or other pharmacies.
4. If an ideal medicine is missing but an alternative with the SAME genericName is in stock, clearly present it as an alternative.
5. If nothing suitable is in stock, say so politely and professionally.

Response format (keep professional and concise — no footer boilerplate):

🩺 ASSESSMENT: [brief condition / symptom summary]

✅ AVAILABLE FOR THIS PATIENT (in YOUR pharmacy stock):
- [Brand] ([Generic]) — [dosage] — Qty: [quantity]
  Reason: [why]
  (If alternative) Note: Alternative to [missing brand], same salt.

⚠️ NOT IN STOCK:
- [requested medicine] — no matching / same-salt item currently available

STRICT OUTPUT RULES:
- End after the stock sections above. Do NOT add DISPENSING NOTE, DISCLAIMER, advice footers, or legal boilerplate.
- Keep the answer clinically useful and concise for pharmacy staff.

If the data says the user still needs symptom clarification, ask ONE clear question instead of inventing medicines.
Do NOT expose unitPrice, supplier, batch, unitCost, or other internal business fields.`;
}

function buildPublicSystemPrompt() {
  return `You are Medix Public Medicine Finder. Patients ask which connected pharmacies have a medicine in stock.

Use ONLY the provided pharmacy/inventory JSON. Never invent pharmacies or locations.
Do NOT expose price, unitPrice, unitCost, supplier, batch, stock counts, quantity, "Qty", or any other numeric inventory amount, under any circumstances — patients only need to know WHERE the medicine is available.

IMPORTANT: The chat window displays PLAIN TEXT ONLY — it does NOT render Markdown.
NEVER use asterisks (**), underscores, hashes (#), or any Markdown symbols for bold/headers. Plain words only.

REQUIRED REPLY STRUCTURE (follow exactly, no extra sections, no boilerplate):

If pharmacies are found, reply in this exact plain-text style:

"[Medicine Name] is available at:

1. [Pharmacy Name] — [Area, City]
2. [Pharmacy Name] — [Area, City]"

Rules:
- Use the pharmacyName exactly as given in the data (do not lowercase it or shorten it).
- One numbered line per pharmacy. If area or city is missing, show whatever is available; never write an empty dash.
- Do not repeat the same pharmacy twice.
- Do not add price, quantity, disclaimers, dispensing notes, Markdown symbols, or any closing question/offer (e.g. do NOT ask about directions, calling, or reserving — the app has no such feature).
- If NO pharmacies are found, reply only with:
  "[Medicine Name] was not found at any connected pharmacy right now."
- Keep the tone professional, warm, and concise — no filler sentences before or after the structure above.`;
}

/** Strip accidental quantity / stock-count / price phrases from public chatbot replies. */
function stripPublicQuantityMentions(text) {
  if (!text) return text;
  return String(text)
    .replace(/\(\s*quantity\s*:\s*\d+\s*\)/gi, "")
    .replace(/\b(available\s+)?quantity\s*:\s*\d+\b/gi, "")
    .replace(/\bqty\s*:\s*\d+\b/gi, "")
    .replace(/\b\d+\s+units?\s+(available|in stock)\b/gi, "available")
    .replace(/\bstock\s*(count|level)?\s*:\s*\d+\b/gi, "")
    // safety net: drop accidental price mentions (Rs., PKR, Rs, ₨) even if the
    // model slips one in — public replies should never contain a price.
    .replace(/[—\-–]?\s*(Rs\.?|PKR|₨)\s*[\d,]+(\.\d+)?/gi, "")
    .replace(/\bprice\s*:\s*[\d,]+(\.\d+)?\b/gi, "")
    // safety net: strip stray Markdown bold/heading symbols — the chat widget
    // only renders plain text, so literal ** or # characters look like a bug.
    .replace(/\*\*/g, "")
    .replace(/^#+\s*/gm, "")
    // safety net: drop any lingering closing question about directions/
    // calling/reserving — the app doesn't support those actions.
    .replace(/\n?\s*would you like[^\n]*\??\s*$/gim, "")
    .replace(/\n?\s*(let me know|feel free) if[^\n]*\??\s*$/gim, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Remove DISPENSING NOTE / DISCLAIMER footers the model may still append. */
function stripBoilerplateFooters(text) {
  if (!text) return text;
  return String(text)
    .replace(/\n?\s*💡?\s*DISPENSING NOTE:[\s\S]*$/i, "")
    .replace(/\n?\s*DISCLAIMER:[\s\S]*$/i, "")
    .trim();
}

// Existing symptom chatbot (Mediserver /ai-assistant) — unchanged
router.post("/chat", async (req, res) => {
  try {
    const { messages, system } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        success: false,
        message: "A valid messages array is required.",
      });
    }

    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({
        success: false,
        message: "GROQ_API_KEY is not configured on the server.",
      });
    }

    const reply = await callGroq([
      { role: "system", content: system || SYSTEM_PROMPT },
      ...messages,
    ]);

    return res.json({
      success: true,
      reply: reply || "No response was returned. Please try again.",
    });
  } catch (error) {
    console.error("MediBot chatbot error:", error.message);
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || "An internal server error occurred. Please try again.",
    });
  }
});

async function handlePublicFinder(req, res) {
  try {
    const { query, messages } = req.body;
    const userQuery =
      (typeof query === "string" && query.trim()) ||
      (Array.isArray(messages) && messages.length
        ? String(messages[messages.length - 1]?.content || "").trim()
        : "");

    if (!userQuery) {
      return res.status(400).json({
        success: false,
        message: "A query string is required.",
      });
    }

    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({
        success: false,
        message: "GROQ_API_KEY is not configured on the server.",
      });
    }

    const { medicineName, isMedicineQuery } = await extractMedicineName(userQuery);

    if (!isMedicineQuery || !medicineName) {
      return res.json({
        success: true,
        reply:
          "Please ask about a specific medicine to find which pharmacies have it in stock. For example: \"Where can I find Augmentin?\"",
        data: null,
      });
    }

    const inventoryData = await searchPublicNetwork(medicineName);
    const history = Array.isArray(messages)
      ? messages.slice(-6).map((m) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: String(m.content || ""),
        }))
      : [];

    const rawReply = await callGroq(
      [
        { role: "system", content: buildPublicSystemPrompt() },
        ...history,
        {
          role: "user",
          content: `User query: ${userQuery}\n\nPharmacy/inventory data (JSON — use only this; no price or stock counts are included, only names/locations):\n${JSON.stringify(inventoryData, null, 2)}`,
        },
      ],
      { temperature: 0.2, maxTokens: 700 }
    );

    const reply = stripPublicQuantityMentions(
      stripBoilerplateFooters(rawReply || "No response was returned. Please try again.")
    );

    return res.json({
      success: true,
      reply,
      data: inventoryData,
    });
  } catch (error) {
    console.error("Public inventory chatbot error:", error.message);
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || "An internal server error occurred. Please try again.",
    });
  }
}

async function handlePharmacyAssistant(req, res) {
  try {
    const { query, messages, symptoms } = req.body;
    const userQuery =
      (typeof query === "string" && query.trim()) ||
      (Array.isArray(messages) && messages.length
        ? String(messages[messages.length - 1]?.content || "").trim()
        : "");

    if (!userQuery && !symptoms) {
      return res.status(400).json({
        success: false,
        message: "Please describe the patient's symptoms or ask about a medicine.",
      });
    }

    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({
        success: false,
        message: "GROQ_API_KEY is not configured on the server.",
      });
    }

    const pharmacy = await User.findById(req.userId).select("pharmacyName role").lean();
    if (!pharmacy || pharmacy.role !== "user") {
      return res.status(403).json({
        success: false,
        message: "Pharmacy inventory chat is only available for pharmacy accounts.",
      });
    }

    const providedSymptoms = String(symptoms || "").trim();

    // Direct stock lookup when staff clearly asks for a named medicine.
    // Important: after the guided intake the client still sends prior symptoms —
    // stock-style follow-ups must still hit inventory search, not the symptom recommender.
    const lookLikeStockCheck =
      /\b(have|stock|available|qty|quantity|do we|inventory|in store|do you have)\b/i.test(
        userQuery || ""
      ) &&
      !/\b(symptom|fever|cough|pain|headache|flu|cold|nausea|diarrhea|vomit|sore throat|infection)\b/i.test(
        userQuery || ""
      );

    let inventoryData;
    let formattingHint = "";

    if (lookLikeStockCheck && userQuery) {
      const { medicineName, isMedicineQuery } = await extractMedicineName(userQuery);
      if (isMedicineQuery && medicineName) {
        inventoryData = await searchPharmacyInventory(req.userId, medicineName);
        formattingHint =
          "Staff asked a direct stock question. Answer stock availability from the JSON for THIS pharmacy only.";
      }
    }

    const symptomText = providedSymptoms || (!inventoryData ? userQuery : "");

    if (!inventoryData) {
      const suggestion = await suggestCandidatesFromSymptoms({
        symptoms: symptomText,
        followUpQuery: providedSymptoms ? userQuery : "",
      });

      if (suggestion.needsMoreInfo) {
        return res.json({
          success: true,
          reply:
            suggestion.clarifyingQuestion ||
            "Please describe the patient's main symptoms so I can recommend medicines from your pharmacy stock.",
          data: { needsMoreInfo: true },
        });
      }

      const matched = await matchCandidatesToPharmacyStock(
        req.userId,
        suggestion.candidates
      );

      inventoryData = {
        mode: "symptom_recommendation",
        condition: suggestion.condition,
        patient: {
          symptoms: symptomText,
        },
        clinicalCandidates: suggestion.candidates,
        recommendations: matched.recommendations,
        missingIdeals: matched.missingIdeals,
        stockItemCount: matched.stockCount,
        // Fallback: if no candidate matched, LLM may ONLY pick from this in-stock list
        inStockInventory:
          matched.recommendations.length === 0 ? matched.inventorySample : [],
      };
      formattingHint =
        matched.recommendations.length > 0
          ? "Recommend ONLY from recommendations[]. Mention alternatives when matchType is alternative. Do not invent stock."
          : "No clinical candidate matched stock. If inStockInventory has suitable items for these symptoms, recommend only from that list; otherwise politely say nothing suitable is currently in stock.";
    }

    const history = Array.isArray(messages)
      ? messages.slice(-8).map((m) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: String(m.content || ""),
        }))
      : [];

    const rawReply = await callGroq(
      [
        { role: "system", content: buildPharmacyAssistantPrompt(pharmacy.pharmacyName) },
        ...history,
        {
          role: "user",
          content: `Staff / patient context:
Query: ${userQuery || "(see symptoms)"}
Symptoms: ${symptomText}
(Age and pre-existing conditions are not collected — recommend from symptoms and in-stock items only.)

${formattingHint}

Inventory / match data (JSON — SOURCE OF TRUTH, never invent beyond this):
${JSON.stringify(inventoryData, null, 2)}`,
        },
      ],
      { temperature: 0.2, maxTokens: 800 }
    );

    const reply = stripBoilerplateFooters(
      rawReply || "No response was returned. Please try again."
    );

    return res.json({
      success: true,
      reply,
      data: inventoryData,
    });
  } catch (error) {
    console.error("Pharmacy inventory chatbot error:", error.message);
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || "An internal server error occurred. Please try again.",
    });
  }
}

// ── Inventory chat routes ──────────────────────────────────────────────────
// IMPORTANT: public route must NEVER use authenticateToken.
// Mount path in server.js is /api/chatbot — these must terminate here so
// unmatched requests do not fall through to /api admin auth middleware.

router.post("/inventory/public", (req, res) => handlePublicFinder(req, res));

router.post("/inventory/single", authenticateToken, (req, res) =>
  handlePharmacyAssistant(req, res)
);

// Alias: pharmacy staff JWT endpoint (single-pharmacy only — never public)
router.post("/inventory", authenticateToken, (req, res) =>
  handlePharmacyAssistant(req, res)
);

// Prevent /api/chatbot/* fallthrough into app.use("/api", adminRoutes)
// which would incorrectly return "Access token required" or "Route not found".
router.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Chatbot route not found: ${req.method} ${req.originalUrl}`,
  });
});

export default router;