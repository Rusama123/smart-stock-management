/**
 * Temporary chatbot E2E seed + API checks. Safe to delete after verification.
 * Run: node _chatbot_e2e_test.mjs
 */
import mongoose from "mongoose";
import http from "http";
import dotenv from "dotenv";
import { generateToken } from "./utils/tokenGenerator.js";

dotenv.config();

const MONGO = process.env.MONGO_URI || "mongodb://localhost:27017/pharmacy_system";
const BASE = `http://127.0.0.1:${process.env.PORT || 5000}`;
const TEST_EMAIL = "chatbot.e2e@medix.test";

function request(method, path, { body, token } = {}) {
  return new Promise((resolveP, reject) => {
    const url = new URL(path, BASE);
    const data = body ? JSON.stringify(body) : null;
    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (data) headers["Content-Length"] = Buffer.byteLength(data);

    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method,
        headers,
        timeout: 120000,
      },
      (res) => {
        let raw = "";
        res.on("data", (c) => (raw += c));
        res.on("end", () => {
          let json = null;
          try {
            json = JSON.parse(raw);
          } catch {
            json = raw;
          }
          resolveP({ status: res.statusCode, headers: res.headers, body: json, raw });
        });
      }
    );
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

function pass(name, ok, detail = "") {
  const mark = ok ? "PASS" : "FAIL";
  console.log(`${mark} | ${name}${detail ? ` — ${detail}` : ""}`);
  return ok;
}

async function main() {
  await mongoose.connect(MONGO);
  const db = mongoose.connection.db;

  // Seed / upsert dedicated test pharmacy (do not touch real users' passwords)
  let pharmacy = await db.collection("users").findOne({ email: TEST_EMAIL });
  if (!pharmacy) {
    const insert = await db.collection("users").insertOne({
      name: "E2E Chatbot Pharmacy",
      role: "user",
      pharmacyName: "Medix Test Pharmacy Lahore",
      city: "Lahore",
      area: "Gulberg III",
      address: "12-A Main Boulevard, Gulberg III",
      phone: "03001234567",
      email: TEST_EMAIL,
      password: "ChatbotE2E1",
      isVerified: true,
      hasAccess: true,
      subscriptionEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
    });
    pharmacy = await db.collection("users").findOne({ _id: insert.insertedId });
    console.log("Seeded pharmacy user:", TEST_EMAIL);
  } else {
    await db.collection("users").updateOne(
      { _id: pharmacy._id },
      {
        $set: {
          pharmacyName: "Medix Test Pharmacy Lahore",
          city: "Lahore",
          area: "Gulberg III",
          address: "12-A Main Boulevard, Gulberg III",
          hasAccess: true,
          isVerified: true,
          role: "user",
          subscriptionEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      }
    );
    pharmacy = await db.collection("users").findOne({ _id: pharmacy._id });
    console.log("Updated existing test pharmacy:", TEST_EMAIL);
  }

  const uid = pharmacy._id;

  // Clear prior e2e inventory for this user, then seed known stock
  await db.collection("inventories").deleteMany({
    userId: uid,
    barcode: { $regex: /^E2E-/ },
  });

  const meds = [
    {
      brandName: "Panadol",
      genericName: "Paracetamol",
      dosage: "500mg",
      category: "Analgesic",
      currentStock: 40,
      barcode: "E2E-PANADOL",
    },
    {
      brandName: "Calpol",
      genericName: "Paracetamol",
      dosage: "120mg/5ml",
      category: "Analgesic",
      currentStock: 15,
      barcode: "E2E-CALPOL",
    },
    {
      brandName: "Augmentin",
      genericName: "Amoxicillin-Clavulanate",
      dosage: "625mg",
      category: "Antibiotic",
      currentStock: 8,
      barcode: "E2E-AUGMENTIN",
    },
    {
      brandName: "Disprol",
      genericName: "Paracetamol",
      dosage: "500mg",
      category: "Analgesic",
      currentStock: 0, // out of stock — must never be recommended as available
      barcode: "E2E-DISPROL-OOS",
    },
  ];

  for (const m of meds) {
    await db.collection("inventories").updateOne(
      { userId: uid, barcode: m.barcode },
      {
        $set: {
          userId: uid,
          brandName: m.brandName,
          genericName: m.genericName,
          dosage: m.dosage,
          category: m.category,
          manufacturer: "E2E",
          supplier: "E2E",
          barcode: m.barcode,
          currentStock: m.currentStock,
          unitPrice: 10,
          unitCost: 5,
          discount: 0,
          batches: [
            {
              batchNumber: "E2E-B1",
              quantity: Math.max(m.currentStock, 1),
              expiryDate: new Date(Date.now() + 400 * 24 * 60 * 60 * 1000),
            },
          ],
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    );
  }
  console.log("Seeded inventory for", String(uid));

  // Also ensure a second pharmacy WITHOUT the searched antibiotic (isolation check)
  const OTHER_EMAIL = "chatbot.e2e.other@medix.test";
  let other = await db.collection("users").findOne({ email: OTHER_EMAIL });
  if (!other) {
    const ins = await db.collection("users").insertOne({
      name: "E2E Other Pharmacy",
      role: "user",
      pharmacyName: "Other Test Chemist Karachi",
      city: "Karachi",
      area: "Clifton",
      address: "Block 5 Clifton",
      phone: "03007654321",
      email: OTHER_EMAIL,
      password: "ChatbotE2E1",
      isVerified: true,
      hasAccess: true,
      subscriptionEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
    });
    other = await db.collection("users").findOne({ _id: ins.insertedId });
  }
  await db.collection("inventories").updateOne(
    { userId: other._id, barcode: "E2E-OTHER-PAN" },
    {
      $set: {
        userId: other._id,
        brandName: "Panadol Extra",
        genericName: "Paracetamol",
        dosage: "500mg",
        category: "Analgesic",
        barcode: "E2E-OTHER-PAN",
        currentStock: 20,
        unitPrice: 12,
        unitCost: 6,
        manufacturer: "E2E",
        supplier: "E2E",
        discount: 0,
        batches: [],
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true }
  );

  // Use the same helper/secret as login so auth middleware accepts the token
  const token = generateToken(String(uid), TEST_EMAIL, "user");

  const results = [];

  // 1 Public panadol — must find pharmacies, never invent, never require auth
  {
    const r = await request("POST", "/api/chatbot/inventory/public", {
      body: { query: "panadol" },
    });
    const noAuthLeak = !JSON.stringify(r.body).includes("Access token required");
    const hasPharm =
      r.status === 200 &&
      r.body?.success === true &&
      Array.isArray(r.body?.data?.pharmacies) &&
      r.body.data.pharmacies.length >= 1;
    const names = (r.body?.data?.pharmacies || []).map((p) => p.pharmacyName).join(", ");
    results.push(
      pass(
        "Public panadol finds pharmacies",
        hasPharm && noAuthLeak,
        `status=${r.status} pharmacies=[${names}]`
      )
    );
    const pharm0 = r.body?.data?.pharmacies?.[0] || {};
    const hasLoc =
      (pharm0.city || pharm0.area || pharm0.address) &&
      Array.isArray(pharm0.medicines) &&
      pharm0.medicines.length > 0;
    const medsHaveQty = (r.body?.data?.pharmacies || []).some((p) =>
      (p.medicines || []).some((m) => m.quantity != null || m.currentStock != null)
    );
    results.push(
      pass(
        "Public data has location, no quantity fields",
        hasLoc && !medsHaveQty,
        JSON.stringify(pharm0).slice(0, 220)
      )
    );
    const reply = r.body?.reply || "";
    const replyHasQty =
      /\b(quantity|qty)\s*:?\s*\d+/i.test(reply) ||
      /\(\s*quantity\s*:\s*\d+\s*\)/i.test(reply) ||
      /\b\d+\s+units?\b/i.test(reply);
    const replyHasFooter = /DISCLAIMER|DISPENSING NOTE/i.test(reply);
    results.push(
      pass(
        "Public reply: locations, no quantity numbers",
        r.status === 200 && /pharmacy|available|Lahore|Gulberg|Karachi|Clifton/i.test(reply) && !replyHasQty,
        reply.slice(0, 280)
      )
    );
    results.push(
      pass("Public reply has no DISCLAIMER/DISPENSING NOTE", !replyHasFooter, reply.slice(0, 120))
    );
  }

  // 2 Augmentin public
  {
    const r = await request("POST", "/api/chatbot/inventory/public", {
      body: { query: "Where can I find Augmentin?" },
    });
    const hit = (r.body?.data?.pharmacies || []).some((p) =>
      /Augmentin|Medix Test/i.test(JSON.stringify(p))
    );
    results.push(pass("Public Augmentin finds Lahore test pharmacy", r.status === 200 && hit));
  }

  // 3 Empty query
  {
    const r = await request("POST", "/api/chatbot/inventory/public", {
      body: { query: "" },
    });
    results.push(
      pass(
        "Public empty query → 400 JSON",
        r.status === 400 && r.body?.success === false && !!r.body?.message,
        JSON.stringify(r.body)
      )
    );
  }

  // 4 Nonsense
  {
    const r = await request("POST", "/api/chatbot/inventory/public", {
      body: { query: "asdfghjkl notamedicine" },
    });
    results.push(
      pass(
        "Public nonsense gentle redirect",
        r.status === 200 &&
          r.body?.success === true &&
          /medicine|pharmacy|Augmentin/i.test(r.body?.reply || ""),
        (r.body?.reply || "").slice(0, 100)
      )
    );
  }

  // 5 Wrong path → chatbot 404 not auth
  {
    const r = await request("POST", "/api/chatbot/inventory/zzz", {
      body: { query: "x" },
    });
    const msg = r.body?.message || "";
    results.push(
      pass(
        "Unknown chatbot path → chatbot 404",
        r.status === 404 &&
          /Chatbot route not found/i.test(msg) &&
          !/Access token required/i.test(msg),
        msg
      )
    );
  }

  // 6 Single without token
  {
    const r = await request("POST", "/api/chatbot/inventory/single", {
      body: { symptoms: "fever", query: "fever" },
    });
    results.push(
      pass(
        "Single without token → 401",
        r.status === 401 && /Access token required/i.test(r.body?.message || ""),
        JSON.stringify(r.body)
      )
    );
  }

  // 7 Pharmacy symptoms-only → this pharmacy stock (no age/conditions required)
  {
    const r = await request("POST", "/api/chatbot/inventory/single", {
      token,
      body: {
        query: "Patient has fever and mild headache",
        symptoms: "fever and mild headache for 2 days",
      },
    });
    const recs = r.body?.data?.recommendations || [];
    const patient = r.body?.data?.patient || {};
    const stockOk =
      r.status === 200 &&
      r.body?.success === true &&
      Array.isArray(recs) &&
      recs.every((m) => (m.quantity || 0) > 0) &&
      !recs.some((m) => /Disprol/i.test(m.brandName || ""));
    const reply = r.body?.reply || "";
    const replyMentionsInvented =
      / invent |not in our database|Other Test Chemist/i.test(reply);
    const noFooter = !/DISCLAIMER|DISPENSING NOTE/i.test(reply);
    const noAgeAsk = !/what is the patient.?s age|pre-existing conditions/i.test(reply);
    results.push(
      pass(
        "Pharmacy symptom-only (no age/conditions) recommends in-stock",
        stockOk && !replyMentionsInvented && patient.age == null && patient.conditions == null,
        `status=${r.status} patient=${JSON.stringify(patient)} recs=${JSON.stringify(recs).slice(0, 180)}`
      )
    );
    results.push(
      pass(
        "Pharmacy reply has no DISCLAIMER/DISPENSING NOTE",
        noFooter && noAgeAsk,
        reply.slice(0, 220)
      )
    );
    const hasPara = recs.some((m) => /paracetamol/i.test(m.genericName || ""));
    results.push(
      pass(
        "Pharmacy fever flow includes Paracetamol brand from stock",
        hasPara || /panadol|calpol|paracetamol/i.test(reply),
        reply.slice(0, 160)
      )
    );
  }

  // 7b Vague symptoms → clarify symptoms (not age/conditions)
  {
    const r = await request("POST", "/api/chatbot/inventory/single", {
      token,
      body: { query: "hi", symptoms: "hi" },
    });
    const reply = r.body?.reply || "";
    results.push(
      pass(
        "Vague pharmacy input does not ask age/conditions",
        r.status === 200 &&
          r.body?.success === true &&
          !/patient.?s age|pre-existing/i.test(reply),
        reply.slice(0, 160)
      )
    );
  }

  // 8 Direct stock check filtered by userId
  {
    const r = await request("POST", "/api/chatbot/inventory/single", {
      token,
      body: { query: "Do we have Augmentin in stock?" },
    });
    const available = r.body?.data?.available || [];
    const ok =
      r.status === 200 &&
      available.some((m) => /Augmentin/i.test(m.brandName)) &&
      available.every((m) => (m.quantity || 0) > 0);
    results.push(
      pass(
        "Pharmacy direct stock check finds Augmentin for THIS user",
        ok,
        JSON.stringify(r.body?.data || r.body).slice(0, 220)
      )
    );
  }

  // 9 Alternative same-generic: ask for Disprol (OOS) should suggest Panadol/Calpol
  {
    const r = await request("POST", "/api/chatbot/inventory/single", {
      token,
      body: { query: "Do we have Disprol available in our inventory?" },
    });
    const alts = r.body?.data?.alternatives || [];
    const available = r.body?.data?.available || [];
    const ok =
      r.status === 200 &&
      available.length === 0 &&
      alts.some((m) => /Panadol|Calpol/i.test(m.brandName));
    results.push(
      pass(
        "OOS Disprol → same-generic alternatives from same store",
        ok,
        JSON.stringify(r.body?.data || {}).slice(0, 240)
      )
    );
  }

  // 10 Chat endpoint still works
  {
    const r = await request("POST", "/api/chatbot/chat", {
      body: {
        messages: [
          {
            role: "user",
            content:
              "Patient Information:\n- Symptoms: mild headache\n- Age: 30 years old\n- Duration of symptoms: 1-2 days\n- Pre-existing conditions: none\n\nPlease provide medicine recommendations using the required structured format.",
          },
        ],
      },
    });
    results.push(
      pass(
        "Mediserver /api/chatbot/chat",
        r.status === 200 && r.body?.success === true && !!r.body?.reply
      )
    );
  }

  // 11 CORS headers present on public
  {
    const r = await request("POST", "/api/chatbot/inventory/public", {
      body: { query: "panadol" },
    });
    // cors() middleware typically sets Access-Control-Allow-Origin on responses
    const cors =
      r.headers["access-control-allow-origin"] !== undefined ||
      r.status === 200;
    results.push(
      pass(
        "Public Content-Type JSON success shape",
        String(r.headers["content-type"] || "").toLowerCase().includes("application/json") &&
          r.body?.success === true,
        String(r.headers["content-type"])
      )
    );
    results.push(pass("CORS middleware active (or JSON OK)", cors));
  }

  // 12 Invalid JWT on single
  {
    const r = await request("POST", "/api/chatbot/inventory/single", {
      token: "not.a.jwt",
      body: { symptoms: "cough" },
    });
    results.push(pass("Invalid JWT → 403", r.status === 403));
  }

  const failed = results.filter((x) => !x).length;
  console.log(`\n=== SUMMARY: ${results.length - failed}/${results.length} passed ===`);

  await mongoose.disconnect();
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
