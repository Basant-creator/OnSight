const Exam = require("../models/Exam");
const Result = require("../models/Result");
const User = require("../models/User");
const pdfParse = require("pdf-parse");
const { GoogleGenAI } = require("@google/genai");

// Setup GenAI
let ai;
if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

const extractQuestionsViaGemini = async (text) => {
  if (!ai) {
    throw new Error("GEMINI_API_KEY is not configured in the environment.");
  }
  const prompt = `
Extract multiple choice questions from the following text and format them as a JSON array. 
The output MUST be a valid JSON array of objects. Do not include markdown formatting or backticks around the json.
Format of each object:
{
  "questionText": "The question...?",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctAnswer": "Option B",
  "explanation": "Optional explanation if present, otherwise empty string."
}

Text:
${text}
`;
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });
  
  let resultText = response.text;
  if(resultText.startsWith("```json")) {
      resultText = resultText.replace(/^```json/, "").replace(/```$/, "").trim();
  } else if (resultText.startsWith("```")) {
      resultText = resultText.replace(/^```/, "").replace(/```$/, "").trim();
  }

  return JSON.parse(resultText);
};

exports.uploadAndParsePDF = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No PDF file uploaded" });
    }
    
    const dataBuffer = req.file.buffer;
    const pdfData = await pdfParse(dataBuffer);
    const text = pdfData.text;

    try {
      const formattedQuestions = await extractQuestionsViaGemini(text);
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
      createdBy: req.user.userId
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
    const exams = await Exam.find({ createdBy: req.user.userId }).sort({ createdAt: -1 });
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
        const exams = await Exam.find({ createdBy: req.user.userId }).select('_id title');
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
    const exam = await Exam.findOne({ _id: id, createdBy: req.user.userId });
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
