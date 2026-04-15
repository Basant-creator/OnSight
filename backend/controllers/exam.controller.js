const Exam = require("../models/Exam");
const Result = require("../models/Result");
const User = require("../models/User");
const { GoogleGenAI } = require("@google/genai");

// Setup GenAI
let ai;
if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

const extractQuestionsViaGemini = async (pdfBuffer) => {
  if (!ai) {
    throw new Error("GEMINI_API_KEY is not configured in the environment.");
  }

  if (!pdfBuffer || !Buffer.isBuffer(pdfBuffer) || pdfBuffer.length === 0) {
    throw new Error("Uploaded PDF is empty or invalid.");
  }

  const prompt = `
Extract multiple choice questions from this PDF and format them as a JSON array.
The output MUST be a valid JSON array of objects. Do not include markdown formatting or backticks around the json.
Format of each object:
{
  "questionText": "The question...?",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctAnswer": "Option B",
  "explanation": "Optional explanation if present, otherwise empty string."
}
`;

  const pdfBase64 = pdfBuffer.toString("base64");

  const models = ["gemini-2.5-flash", "gemini-2.0-flash"];
  let response;
  let lastError;

  for (const model of models) {
    try {
      response = await ai.models.generateContent({
        model,
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  mimeType: "application/pdf",
                  data: pdfBase64,
                },
              },
              {
                text: prompt,
              },
            ],
          },
        ],
      });
      break;
    } catch (error) {
      lastError = error;
      const errMsg = String(error && error.message ? error.message : error);
      const isTransientError = errMsg.includes("503") || errMsg.includes("UNAVAILABLE") || 
                               errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || 
                               errMsg.includes("500") || errMsg.includes("INTERNAL") || 
                               errMsg.includes("502") || errMsg.includes("BAD_GATEWAY");
      if (!isTransientError) {
        throw error;
      }
    }
  }

  if (!response) {
    throw lastError || new Error("Failed to get response from Gemini models.");
  }
  
  let resultText = (response.text || "").trim();

  // Handle malformed fences seen in model output, e.g. ``json ... ``.
  resultText = resultText
    .replace(/^`{2,}json\s*/i, "")
    .replace(/^`{2,}\s*/i, "")
    .replace(/\s*`{2,}$/i, "")
    .trim();

  // Remove markdown code fences even when model returns extra whitespace/newlines.
  const fencedJsonMatch = resultText.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fencedJsonMatch) {
    resultText = fencedJsonMatch[1].trim();
  }

  try {
    const parsed = JSON.parse(resultText);
    if (!Array.isArray(parsed)) {
      throw new Error("Gemini output is not an array.");
    }

    return parsed.map((item) => ({
      questionText: item.questionText || item.question || "",
      options: Array.isArray(item.options) ? item.options : [],
      correctAnswer: item.correctAnswer || item.correct_answer || item.answer || "",
      explanation: item.explanation || "",
    }));
  } catch (parseError) {
    throw new Error(`Gemini returned non-JSON output: ${parseError.message}`);
  }
};

exports.uploadAndParsePDF = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No PDF file uploaded" });
    }

    const dataBuffer = req.file.buffer;

    try {
      const formattedQuestions = await extractQuestionsViaGemini(dataBuffer);
      return res.status(200).json({ 
        message: "PDF parsed and extracted successfully", 
        questions: formattedQuestions 
      });
    } catch (aiError) {
      console.error("AI Extraction failed:", aiError);
      return res.status(500).json({ error: "Failed to parse questions using AI. " + aiError.message });
    }
  } catch (error) {
    console.error("PDF Upload Error:", error);
    res.status(500).json({ error: "Error parsing PDF file" });
  }
};

exports.createExam = async (req, res) => {
  try {
    const { title, description, questions } = req.body;

    const exam = new Exam({
      title,
      description,
      questions,
      createdBy: req.user.id
    });

    await exam.save();
    return res.status(201).json({ message: "Exam created successfully", exam });
  } catch (error) {
    console.error("Create Exam Error:", error);
    res.status(500).json({ error: "Error creating exam" });
  }
};

exports.getTeacherExams = async (req, res) => {
  try {
    const exams = await Exam.find({ createdBy: req.user.id }).sort({ createdAt: -1 });
    return res.status(200).json({ exams });
  } catch (error) {
    console.error("Get Exams Error:", error);
    res.status(500).json({ error: "Error fetching exams" });
  }
};

exports.getExamAttempts = async (req, res) => {
  try {
    const { id } = req.params;
    const attempts = await Result.find({ examId: id }).populate("studentId", "username email");
    return res.status(200).json({ attempts });
  } catch (error) {
    console.error("Get Attempts Error:", error);
    res.status(500).json({ error: "Error fetching attempts" });
  }
};

exports.getAllAttemptsForTeacher = async (req, res) => {
    try {
        const exams = await Exam.find({ createdBy: req.user.id }).select('_id title');
        const examIds = exams.map(e => e._id);
        const attempts = await Result.find({ examId: { $in: examIds } })
            .populate("studentId", "username email")
            .populate("examId", "title")
            .sort({ attemptDate: -1 });
        return res.status(200).json({ attempts });
    } catch (error) {
        console.error("Get All Attempts Error:", error);
        res.status(500).json({ error: "Error fetching all attempts" });
    }
}

exports.publishResults = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if exam belongs to teacher
    const exam = await Exam.findOne({ _id: id, createdBy: req.user.id });
    if (!exam) {
      return res.status(404).json({ error: "Exam not found or unauthorized" });
    }

    exam.isPublished = true;
    await exam.save();

    await Result.updateMany(
      { examId: id },
      { $set: { status: "published" } }
    );

    return res.status(200).json({ message: "Results published successfully" });
  } catch (error) {
    console.error("Publish Results Error:", error);
    res.status(500).json({ error: "Error publishing results" });
  }
};

exports.renameExam = async (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body;

    if (!title || title.trim() === "") {
      return res.status(400).json({ error: "Title is required" });
    }

    const exam = await Exam.findOne({ _id: id, createdBy: req.user.id });
    if (!exam) {
      return res.status(404).json({ error: "Exam not found or unauthorized" });
    }

    exam.title = title.trim();
    await exam.save();

    return res.status(200).json({ message: "Exam renamed successfully", exam });
  } catch (error) {
    console.error("Rename Exam Error:", error);
    res.status(500).json({ error: "Error renaming exam" });
  }
};

exports.scheduleExam = async (req, res) => {
  try {
    const { id } = req.params;
    const { scheduledAt, durationMinutes } = req.body;

    if (!scheduledAt) {
      return res.status(400).json({ error: "scheduledAt is required" });
    }

    const scheduledDate = new Date(scheduledAt);
    if (isNaN(scheduledDate.getTime())) {
      return res.status(400).json({ error: "Invalid date format" });
    }

    if (scheduledDate <= new Date()) {
      return res.status(400).json({ error: "Scheduled date must be in the future" });
    }

    const exam = await Exam.findOne({ _id: id, createdBy: req.user.id });
    if (!exam) {
      return res.status(404).json({ error: "Exam not found or unauthorized" });
    }

    exam.scheduledAt = scheduledDate;
    if (durationMinutes) {
      exam.durationMinutes = durationMinutes;
    }
    exam.status = "scheduled";
    
    await exam.save();
    return res.status(200).json({ message: "Exam scheduled successfully", exam });
  } catch (error) {
    console.error("Schedule Exam Error:", error);
    res.status(500).json({ error: "Error scheduling exam" });
  }
};

exports.getStudentExams = async (req, res) => {
  try {
    const now = new Date();
    const exams = await Exam.find({
      status: "scheduled",
      scheduledAt: { $gte: now }
    }).sort({ scheduledAt: 1 }).select("_id title description scheduledAt durationMinutes status");

    return res.status(200).json({ exams });
  } catch (error) {
    console.error("Get Student Exams Error:", error);
    res.status(500).json({ error: "Error fetching student exams" });
  }
};
