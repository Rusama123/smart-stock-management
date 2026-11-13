// test_flow.js
import mongoose from 'mongoose';

async function runTests() {
  console.log("🚦 Starting Smart AI Stock Management Integration Flow Tests...");

  const BASE_URL = "http://localhost:5000";

  // Helper to make API calls with optional token
  async function api(path, method = 'GET', body = null, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const config = {
      method,
      headers
    };
    if (body) config.body = JSON.stringify(body);

    const response = await fetch(`${BASE_URL}${path}`, config);
    const data = await response.json().catch(() => ({}));
    return { status: response.status, data };
  }

  // Connect to MongoDB to fetch verification code
  console.log("📡 Connecting to MongoDB...");
  await mongoose.connect('mongodb://localhost:27017/ipims');
  console.log("✅ MongoDB Connected!");

  try {
    const uniqueId = Date.now();
    const testAdminEmail = `testadmin_${uniqueId}@example.com`;
    const testAdminPhone = `0300${String(uniqueId).slice(-7)}`;
    const testPassword = "Password123";

    // ─── 1. REGISTER A NEW ADMIN ───────────────────────────────────────────────
    console.log(`\n📝 Testing Registration of New Admin: ${testAdminEmail}...`);
    const registerRes = await api('/register', 'POST', {
      name: "Flow Test Admin",
      role: "admin",
      pharmacyName: "Flow Test Pharmacy",
      phone: testAdminPhone,
      email: testAdminEmail,
      password: testPassword
    });

    if (registerRes.status !== 200) {
      throw new Error(`Registration failed with status ${registerRes.status}: ${JSON.stringify(registerRes.data)}`);
    }

    console.log("✅ Registration response received successfully!");

    // Query MongoDB directly for verification code
    const userDoc = await mongoose.connection.collection('users').findOne({ email: testAdminEmail });
    if (!userDoc) {
      throw new Error("❌ User not found in MongoDB after registration!");
    }

    const verificationCode = userDoc.verificationCode;
    console.log(`🔎 Retrieved verification code from MongoDB: ${verificationCode}`);

    // ─── 2. VERIFY EMAIL ────────────────────────────────────────────────────────
    console.log("\n✉️ Testing Email Verification...");
    const verifyRes = await api('/verify-email', 'POST', {
      email: testAdminEmail,
      code: verificationCode
    });

    if (verifyRes.status !== 200) {
      throw new Error(`Email verification failed: ${JSON.stringify(verifyRes.data)}`);
    }
    console.log("✅ Email Verified successfully!");

    // ─── 3. LOGIN AS SUPER ADMIN TO APPROVE NEW ADMIN ───────────────────────────
    console.log("\n🔑 Login as Super Admin...");
    const superAdminLoginRes = await api('/login', 'POST', {
      role: 'admin',
      email: 'usama.rana.tech@gmail.com',
      password: 'Rana4455'
    });

    if (superAdminLoginRes.status !== 200 || !superAdminLoginRes.data.token) {
      throw new Error(`Super admin login failed: ${JSON.stringify(superAdminLoginRes.data)}`);
    }

    const superAdminToken = superAdminLoginRes.data.token;
    console.log("✅ Super Admin Login Successful!");

    // Find the new admin user ID from the super admin user list
    console.log("\n👥 Fetching admin list to locate new user...");
    const usersRes = await api('/api/admin/users', 'GET', null, superAdminToken);
    if (usersRes.status !== 200) {
      throw new Error(`Fetching users failed: ${JSON.stringify(usersRes.data)}`);
    }

    const newAdminUser = usersRes.data.users.find(u => u.email === testAdminEmail);
    if (!newAdminUser) {
      throw new Error(`❌ Newly registered admin ${testAdminEmail} was not found in admin user list!`);
    }
    const newAdminUserId = newAdminUser._id;
    console.log(`✅ Located new admin user in list with ID: ${newAdminUserId}`);

    // Approve the new admin
    console.log(`\n🔓 Granting system access to new admin ${testAdminEmail}...`);
    const accessRes = await api(`/api/admin/users/${newAdminUserId}/access`, 'PUT', {}, superAdminToken);
    if (accessRes.status !== 200) {
      throw new Error(`Failed to grant access: ${JSON.stringify(accessRes.data)}`);
    }
    console.log("✅ Access granted successfully by Super Admin!");

    // Give new admin a subscription end date (1 year)
    console.log(`\n📅 Extending subscription for new admin...`);
    const subscriptionRes = await api(`/api/admin/users/${newAdminUserId}/subscription`, 'PUT', {
      months: 12
    }, superAdminToken);
    if (subscriptionRes.status !== 200) {
      throw new Error(`Failed to extend subscription: ${JSON.stringify(subscriptionRes.data)}`);
    }
    console.log("✅ Subscription extended successfully!");

    // ─── 4. LOGIN AS THE NEWLY APPROVED ADMIN ──────────────────────────────────
    console.log(`\n🔑 Testing Login as newly approved admin: ${testAdminEmail}...`);
    const adminLoginRes = await api('/login', 'POST', {
      role: 'admin',
      email: testAdminEmail,
      password: testPassword
    });

    if (adminLoginRes.status !== 200 || !adminLoginRes.data.token) {
      throw new Error(`New admin login failed with status ${adminLoginRes.status}: ${JSON.stringify(adminLoginRes.data)}`);
    }

    const adminToken = adminLoginRes.data.token;
    console.log("✅ New Admin Login Successful!");
    console.log(`👤 User: ${adminLoginRes.data.user.name} | Role: ${adminLoginRes.data.user.role}`);

    // ─── 5. TEST CHATBOT ENDPOINT & PROMPT STRUCTURE ───────────────────────────
    console.log("\n🤖 Testing AI Chatbot Response with Roman Urdu symptoms...");
    const symptoms = "sir dard fever pat dard"; // Headache, fever, stomach ache
    const age = "25";
    const duration = "1-2 days";
    const conditions = "none";

    const chatbotSystemPrompt = `You are Mediserver, a professional AI medical assistant. Your role is strictly limited to medicine and health advice only.

IMPORTANT INSTRUCTION FOR SYMPTOMS AND TRANSLATION:
- The user might enter symptoms in English, Urdu, or Roman Urdu (e.g. "sir dard" for headache, "bukhar" or "fevar" for fever, "pat dard" or "pait dard" or "stomach pain" for stomach ache).
- You MUST correctly understand and translate these symptoms to their clinical meanings and treat them as active, separate complaints.
- Ensure you recommend appropriate, separate medicines for EACH active symptom described (e.g., if the user describes fever, headache, AND stomach pain, you must recommend a medicine for fever/headache like Paracetamol, AND a separate medicine for stomach pain like Hyoscine butylbromide/Buscopan). Do not ignore any of the symptoms.

CRITICAL OUTPUT FORMAT — You MUST follow this EXACT structure every time. Do NOT add anything outside this structure:

CONDITION: [condition name e.g. Fever, Common Cold, Headache, Stomach Cramps]

MEDICINES:
Paracetamol (Panadol)
Hyoscine butylbromide (Buscopan)

DETAILS:
Paracetamol (Panadol):
- Use: Treats fever and body aches
- Dose: 500mg, 1 tablet
- Frequency: Every 6–8 hours as needed

Hyoscine butylbromide (Buscopan):
- Use: Relieves stomach pain
- Dose: 10mg, 1 tablet
- Frequency: 3 times daily`;

    const chatRes = await api('/api/chatbot/chat', 'POST', {
      messages: [
        {
          role: "user",
          content: `Patient Information:
- Symptoms: ${symptoms}
- Age: ${age} years old
- Duration of symptoms: ${duration}
- Pre-existing conditions: ${conditions}

Please provide medicine recommendations using the required structured format.`
        }
      ],
      system: chatbotSystemPrompt
    });

    if (chatRes.status !== 200 || !chatRes.data.success) {
      throw new Error(`Chatbot request failed: ${JSON.stringify(chatRes.data)}`);
    }

    const reply = chatRes.data.reply;
    console.log("✅ Chatbot Response Received:");
    console.log("--------------------------------------------------");
    console.log(reply);
    console.log("--------------------------------------------------");

    // Validate that the output contains the correct structure and multiple recommendations
    const hasCondition = reply.includes("CONDITION:");
    const hasMedicines = reply.includes("MEDICINES:");
    const hasDetails = reply.includes("DETAILS:");
    
    // Check if both Panadol/Paracetamol AND Buscopan/Hyoscine (or stomach pain medicine) are recommended
    const recommendsFeverMed = /panadol|paracetamol|acetaminophen/i.test(reply);
    const recommendsStomachMed = /buscopan|hyoscine|spasm|dicyclomine|mebeverine/i.test(reply);

    if (!hasCondition || !hasMedicines || !hasDetails) {
      throw new Error("❌ Chatbot response format validation failed! Missing structured headers.");
    }
    if (!recommendsFeverMed || !recommendsStomachMed) {
      throw new Error(`❌ Chatbot failed to recommend separate medicines for multiple symptoms! Fever Med: ${recommendsFeverMed}, Stomach Med: ${recommendsStomachMed}`);
    }
    console.log("✅ Chatbot Response Format and Multiple Symptom recommendation verification PASSED!");

    // ─── 6. ADD A MANUFACTURER ──────────────────────────────────────────────────
    console.log("\n🏭 Testing Add Manufacturer...");
    const mfgName = `TestMfg_${Date.now()}`;
    const mfgRes = await api('/api/manufacturers', 'POST', { name: mfgName }, adminToken);
    if (mfgRes.status !== 200) {
      throw new Error(`Add Manufacturer failed: ${JSON.stringify(mfgRes.data)}`);
    }
    console.log(`✅ Manufacturer "${mfgName}" added successfully!`);

    // ─── 7. ADD A SUPPLIER ──────────────────────────────────────────────────────
    console.log("\n📦 Testing Add Supplier...");
    const supName = `TestSup_${Date.now()}`;
    const supRes = await api('/api/suppliers', 'POST', {
      name: supName,
      phone: "03001234567",
      city: "Lahore"
    }, adminToken);

    if (supRes.status !== 200) {
      throw new Error(`Add Supplier failed: ${JSON.stringify(supRes.data)}`);
    }
    console.log(`✅ Supplier "${supName}" added successfully!`);

    // ─── 8. ADD DRUG TO INVENTORY ───────────────────────────────────────────────
    console.log("\n💊 Testing Add Drug to Inventory...");
    const brandName = `TestDrug_${Date.now()}`;
    const genericName = "Paracetamol";
    const inventoryRes = await api('/api/inventory', 'POST', {
      brandName,
      genericName,
      dosage: "500mg",
      category: "Tablet",
      manufacturer: mfgName,
      supplier: supName,
      barcode: `BAR_${Date.now()}`,
      unitPrice: 5,
      unitCost: 3,
      batches: [
        {
          batchNumber: "B1",
          quantity: 100,
          expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
        }
      ]
    }, adminToken);

    if (inventoryRes.status !== 200 && inventoryRes.status !== 201) {
      throw new Error(`Add Inventory failed: ${JSON.stringify(inventoryRes.data)}`);
    }

    const inventoryItem = inventoryRes.data.inventory || inventoryRes.data.item;
    const inventoryId = inventoryItem ? inventoryItem._id : null;
    if (!inventoryId) {
      throw new Error(`Failed to retrieve inventory ID from response: ${JSON.stringify(inventoryRes.data)}`);
    }
    console.log(`✅ Drug "${brandName}" added to Inventory with ID: ${inventoryId}`);

    // ─── 9. RECORD POS SALE & CHECK STOCK ──────────────────────────────────────
    console.log("\n🛒 Testing POS Sale checkout flow (FIFO Stock deduction)...");
    const qtyToSell = 5;
    const saleRes = await api('/api/sales', 'POST', {
      inventoryId,
      brandName,
      genericName,
      quantity: qtyToSell,
      unitPrice: 5,
      batchNumber: "B1",
      customerName: "John Doe",
      customerPhone: "03217654321",
      paymentMethod: "Cash",
      discount: 0
    }, adminToken);

    if (saleRes.status !== 201) {
      throw new Error(`Record sale failed: ${JSON.stringify(saleRes.data)}`);
    }

    console.log("✅ Sale recorded successfully!");
    console.log(`📊 Sold: ${qtyToSell} | Remaining Stock in Response: ${saleRes.data.sale.newStock}`);

    // Verify stock in inventory directly
    const fetchInvRes = await api(`/api/inventory`, 'GET', null, adminToken);
    const updatedItem = fetchInvRes.data.inventory.find(item => item._id === inventoryId);
    if (updatedItem) {
      console.log(`📊 Actual Stock in Inventory DB: ${updatedItem.currentStock}`);
      if (updatedItem.currentStock !== 95) {
        throw new Error(`Stock deduction mismatch! Expected 95, found ${updatedItem.currentStock}`);
      }
      console.log("✅ Stock deducted correctly in DB!");
    }

    console.log("\n🎉 ALL TESTS PASSED SUCCESSFULLY! The flow works perfectly.");
  } catch (error) {
    console.error("\n❌ TESTS FAILED:", error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("📡 MongoDB connection closed.");
  }
}

runTests();
