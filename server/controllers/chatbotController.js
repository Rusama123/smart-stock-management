import axios from "axios";

export const predictDisease = async (req, res) => {
  try {
    const { fever, cough, diabetes, headache, body_pain, age, current_medicine } = req.body;

    // Validate input
    if (
      fever === undefined || cough === undefined ||
      diabetes === undefined || headache === undefined ||
      body_pain === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all symptom fields."
      });
    }

    // Call Flask AI service
    const flaskRes = await axios.post(
      `${process.env.FLASK_URL || "http://127.0.0.1:8000"}/predict`,
      { fever, cough, diabetes, headache, body_pain }
    );

    // Drug interaction warning
    let drugWarning = null;
    if (current_medicine && flaskRes.data.disease === "diabetic_headache") {
      drugWarning = "⚠️ You are already on medication. Do not add any OTC medicine without doctor approval.";
    }

    return res.json({
      success: true,
      age,
      current_medicine: current_medicine || "None",
      drug_warning: drugWarning,
      result: flaskRes.data
    });

  } catch (error) {
    console.error("Chatbot error:", error.message);
    return res.status(500).json({
      success: false,
      message: "AI service unavailable. Please ensure Flask is running.",
    });
  }
};