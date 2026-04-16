const Exam = require("../models/Exam");
const Result = require("../models/Result");
const User = require("../models/User");
const { GoogleGenAI } = require("@google/genai");

// Setup GenAI
let ai;
if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

const ISO_DATE_TIME_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/;
const ADMIN_ROLES = new Set(["head_admin", "sub_admin"]);

const parseAndValidateScheduleDate = (scheduledAt) => {
  if (!scheduledAt || typeof scheduledAt !== "string") {
    return { error: "scheduledAt is required" };
  }

  if (!ISO_DATE_TIME_REGEX.test(scheduledAt)) {
    return { error: "scheduledAt must be a valid ISO date-time string" };
  }

  const scheduledDate = new Date(scheduledAt);
  if (Number.isNaN(scheduledDate.getTime())) {
    return { error: "scheduledAt must be a valid ISO date-time string" };
  }

  if (scheduledDate <= new Date()) {
    return { error: "scheduledAt must be in the future" };
  }

  return { scheduledDate };
};

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
      createdBy: req.user.id,
      status: "draft"
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

    if (!["teacher", ...ADMIN_ROLES].includes(req.user.role)) {
      return res.status(403).json({ error: "Unauthorized role for exam scheduling" });
    }

    const { scheduledDate, error: scheduleError } = parseAndValidateScheduleDate(scheduledAt);
    if (scheduleError) {
      return res.status(400).json({ error: scheduleError });
    }

    if (durationMinutes !== undefined) {
      const parsedDuration = Number(durationMinutes);
      if (!Number.isInteger(parsedDuration) || parsedDuration < 15 || parsedDuration > 480) {
        return res.status(400).json({ error: "durationMinutes must be an integer between 15 and 480" });
      }
    }

    const query = { _id: id };
    if (req.user.role === "teacher") {
      query.createdBy = req.user.id;
    }
    const exam = await Exam.findOne(query);
    if (!exam) {
      return res.status(404).json({ error: "Exam not found" });
    }

    exam.scheduledAt = scheduledDate;
    if (durationMinutes !== undefined) {
      exam.durationMinutes = Number(durationMinutes);
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

// Get exam data for attempt (safe - no correct answers exposed)
exports.getExamForAttempt = async (req, res) => {
  try {
    const { id } = req.params;
    const studentId = req.user.id;

    const exam = await Exam.findById(id);
    if (!exam) {
      return res.status(404).json({ error: "Exam not found" });
    }

    // Check if exam is scheduled and within the allowed window
    const now = new Date();
    const scheduledAt = new Date(exam.scheduledAt);
    const endTime = new Date(scheduledAt.getTime() + exam.durationMinutes * 60 * 1000);

    // Allow starting 10 minutes before scheduled time
    const startWindow = new Date(scheduledAt.getTime() - 10 * 60 * 1000);

    if (exam.status !== "scheduled") {
      return res.status(400).json({ error: "Exam is not available for attempt" });
    }

    if (now < startWindow) {
      return res.status(400).json({ error: "Exam has not started yet" });
    }

    if (now > endTime) {
      return res.status(400).json({ error: "Exam time has expired" });
    }

    // Check for duplicate attempt
    const existingAttempt = await Result.findOne({ examId: id, studentId });
    if (existingAttempt) {
      return res.status(400).json({ error: "You have already attempted this exam" });
    }

    // Create a new attempt record with startedAt
    const newAttempt = new Result({
      studentId,
      examId: id,
      score: 0,
      totalQuestions: exam.questions.length,
      status: "attempted",
      startedAt: now,
      responses: []
    });
    await newAttempt.save();

    // Return exam data without correct answers
    const safeQuestions = exam.questions.map((q, index) => ({
      questionIndex: index,
      questionText: q.questionText,
      options: q.options
    }));

    return res.status(200).json({
      attemptId: newAttempt._id,
      exam: {
        _id: exam._id,
        title: exam.title,
        description: exam.description,
        durationMinutes: exam.durationMinutes,
        scheduledAt: exam.scheduledAt,
        totalQuestions: exam.questions.length
      },
      questions: safeQuestions
    });
  } catch (error) {
    console.error("Get Exam For Attempt Error:", error);
    res.status(500).json({ error: "Error fetching exam for attempt" });
  }
};

// Submit exam attempt
exports.submitAttempt = async (req, res) => {
  try {
    const { id } = req.params;
    const { answers } = req.body; // Array of { questionIndex, selectedAnswer }
    const studentId = req.user.id;

    const exam = await Exam.findById(id);
    if (!exam) {
      return res.status(404).json({ error: "Exam not found" });
    }

    // Find the existing attempt
    const attempt = await Result.findOne({ examId: id, studentId });
    if (!attempt) {
      return res.status(400).json({ error: "No active attempt found. Please start the exam first." });
    }

    if (attempt.submittedAt) {
      return res.status(400).json({ error: "You have already submitted this exam" });
    }

    // Validate time window
    const now = new Date();
    const scheduledAt = new Date(exam.scheduledAt);
    const endTime = new Date(scheduledAt.getTime() + exam.durationMinutes * 60 * 1000);

    if (now > endTime) {
      return res.status(400).json({ error: "Exam time has expired" });
    }

    // Evaluate answers
    const responses = [];
    let correctCount = 0;

    exam.questions.forEach((question, index) => {
      const answer = answers.find(a => a.questionIndex === index);
      const selectedAnswer = answer ? answer.selectedAnswer : null;
      const wasAttempted = selectedAnswer !== null && selectedAnswer !== undefined && selectedAnswer !== "";
      const isCorrect = wasAttempted && selectedAnswer === question.correctAnswer;

      if (isCorrect) correctCount++;

      responses.push({
        questionIndex: index,
        questionText: question.questionText,
        selectedAnswer,
        correctAnswer: question.correctAnswer,
        isCorrect,
        wasAttempted,
        graceMarks: 0
      });
    });

    const score = correctCount;
    const totalQuestions = exam.questions.length;

    // Update the attempt - store original score
    attempt.originalScore = score;
    attempt.score = score;
    attempt.totalGraceMarks = 0;
    attempt.totalQuestions = totalQuestions;
    attempt.responses = responses;
    attempt.submittedAt = now;
    await attempt.save();

    // Return response respecting publish status
    const isPublished = exam.isPublished || attempt.status === "published";

    return res.status(200).json({
      message: "Exam submitted successfully",
      attempt: {
        _id: attempt._id,
        examId: attempt.examId,
        score: isPublished ? score : null,
        totalQuestions,
        status: attempt.status,
        submittedAt: attempt.submittedAt,
        // Only show detailed responses if published
        responses: isPublished ? responses.map(r => ({
          questionIndex: r.questionIndex,
          questionText: r.questionText,
          selectedAnswer: r.selectedAnswer,
          isCorrect: r.isCorrect
        })) : null
      }
    });
  } catch (error) {
    console.error("Submit Attempt Error:", error);
    res.status(500).json({ error: "Error submitting attempt" });
  }
};

// Get student's own attempts/history
exports.getStudentAttempts = async (req, res) => {
  try {
    const studentId = req.user.id;

    const attempts = await Result.find({ studentId })
      .populate("examId", "title description durationMinutes isPublished scheduledAt")
      .sort({ attemptDate: -1 });

    const formattedAttempts = attempts.map(attempt => {
      const exam = attempt.examId;
      const isPublished = exam && exam.isPublished;

      return {
        _id: attempt._id,
        exam: exam ? {
          _id: exam._id,
          title: exam.title,
          description: exam.description,
          durationMinutes: exam.durationMinutes,
          scheduledAt: exam.scheduledAt
        } : null,
        score: isPublished ? attempt.score : null,
        originalScore: isPublished ? attempt.originalScore : null,
        totalGraceMarks: isPublished ? attempt.totalGraceMarks : null,
        totalQuestions: attempt.totalQuestions,
        status: attempt.status,
        attemptDate: attempt.attemptDate,
        submittedAt: attempt.submittedAt,
        graceMarksApplied: attempt.graceMarksApplied,
        // Only include responses if published
        responses: isPublished ? attempt.responses.map(r => ({
          questionIndex: r.questionIndex,
          questionText: r.questionText,
          selectedAnswer: r.selectedAnswer,
          isCorrect: r.isCorrect,
          graceMarks: r.graceMarks,
          wasAttempted: r.wasAttempted
        })) : null
      };
    });

    return res.status(200).json({ attempts: formattedAttempts });
  } catch (error) {
    console.error("Get Student Attempts Error:", error);
    res.status(500).json({ error: "Error fetching attempts" });
  }
};

// Get specific attempt details
exports.getAttemptDetails = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const studentId = req.user.id;

    const attempt = await Result.findOne({ _id: attemptId, studentId })
      .populate("examId", "title description durationMinutes isPublished scheduledAt");

    if (!attempt) {
      return res.status(404).json({ error: "Attempt not found" });
    }

    const exam = attempt.examId;
    const isPublished = exam && exam.isPublished;

    return res.status(200).json({
      attempt: {
        _id: attempt._id,
        exam: exam ? {
          _id: exam._id,
          title: exam.title,
          description: exam.description,
          durationMinutes: exam.durationMinutes,
          scheduledAt: exam.scheduledAt
        } : null,
        score: isPublished ? attempt.score : null,
        originalScore: isPublished ? attempt.originalScore : null,
        totalGraceMarks: isPublished ? attempt.totalGraceMarks : null,
        totalQuestions: attempt.totalQuestions,
        status: attempt.status,
        attemptDate: attempt.attemptDate,
        submittedAt: attempt.submittedAt,
        graceMarksApplied: attempt.graceMarksApplied,
        responses: isPublished ? attempt.responses.map(r => ({
          questionIndex: r.questionIndex,
          questionText: r.questionText,
          selectedAnswer: r.selectedAnswer,
          isCorrect: r.isCorrect,
          graceMarks: r.graceMarks,
          wasAttempted: r.wasAttempted
        })) : null
      }
    });
  } catch (error) {
    console.error("Get Attempt Details Error:", error);
    res.status(500).json({ error: "Error fetching attempt details" });
  }
};

// Import ExamReview model
const ExamReview = require("../models/ExamReview");

// Get exam for teacher review with aggregated student responses
exports.getExamForReview = async (req, res) => {
  try {
    const { id } = req.params;
    const teacherId = req.user.id;

    // Check if exam belongs to teacher
    const exam = await Exam.findOne({ _id: id, createdBy: teacherId });
    if (!exam) {
      return res.status(404).json({ error: "Exam not found or unauthorized" });
    }

    // Get all attempts for this exam
    const attempts = await Result.find({ examId: id })
      .populate("studentId", "name email");

    // Calculate aggregated stats per question
    const questionStats = exam.questions.map((question, index) => {
      const stats = {
        questionIndex: index,
        questionText: question.questionText,
        options: question.options,
        correctAnswer: question.correctAnswer,
        totalAttempted: 0,
        totalCorrect: 0,
        totalIncorrect: 0,
        totalNotAttempted: 0,
        optionDistribution: {}
      };

      // Initialize option distribution
      question.options.forEach(opt => {
        stats.optionDistribution[opt] = 0;
      });
      stats.optionDistribution["Not Attempted"] = 0;

      attempts.forEach(attempt => {
        const response = attempt.responses.find(r => r.questionIndex === index);
        if (response) {
          if (response.wasAttempted) {
            stats.totalAttempted++;
            if (response.isCorrect) {
              stats.totalCorrect++;
            } else {
              stats.totalIncorrect++;
            }
            // Count option selection
            if (stats.optionDistribution[response.selectedAnswer] !== undefined) {
              stats.optionDistribution[response.selectedAnswer]++;
            }
          } else {
            stats.totalNotAttempted++;
            stats.optionDistribution["Not Attempted"]++;
          }
        }
      });

      return stats;
    });

    // Get existing review data if any
    let review = await ExamReview.findOne({ examId: id });
    if (!review) {
      review = new ExamReview({
        examId: id,
        teacherId,
        status: "under_review",
        graceMarks: []
      });
      await review.save();
    }

    return res.status(200).json({
      exam: {
        _id: exam._id,
        title: exam.title,
        description: exam.description,
        totalQuestions: exam.questions.length,
        isPublished: exam.isPublished
      },
      questionStats,
      totalAttempts: attempts.length,
      review: {
        status: review.status,
        graceMarks: review.graceMarks,
        totalGraceQuestions: review.totalGraceQuestions,
        graceMarksAppliedAt: review.graceMarksAppliedAt
      }
    });
  } catch (error) {
    console.error("Get Exam For Review Error:", error);
    res.status(500).json({ error: "Error fetching exam review data" });
  }
};

// Mark a question for grace marks
exports.addGraceMark = async (req, res) => {
  try {
    const { id } = req.params;
    const { questionIndex, reason, marksToAward } = req.body;
    const teacherId = req.user.id;

    // Validate input
    if (questionIndex === undefined || !reason || marksToAward === undefined) {
      return res.status(400).json({ error: "Missing required fields: questionIndex, reason, marksToAward" });
    }

    if (marksToAward < 0 || marksToAward > 1) {
      return res.status(400).json({ error: "marksToAward must be between 0 and 1" });
    }

    // Check if exam belongs to teacher
    const exam = await Exam.findOne({ _id: id, createdBy: teacherId });
    if (!exam) {
      return res.status(404).json({ error: "Exam not found or unauthorized" });
    }

    // Check if exam is already published
    if (exam.isPublished) {
      return res.status(400).json({ error: "Cannot add grace marks to a published exam. Unpublish first." });
    }

    // Get the question text
    const question = exam.questions[questionIndex];
    if (!question) {
      return res.status(400).json({ error: "Invalid question index" });
    }

    // Find or create review
    let review = await ExamReview.findOne({ examId: id });
    if (!review) {
      review = new ExamReview({
        examId: id,
        teacherId,
        status: "under_review",
        graceMarks: []
      });
    }

    // Check if this question already has a grace mark
    const existingGraceIndex = review.graceMarks.findIndex(gm => gm.questionIndex === questionIndex);
    if (existingGraceIndex >= 0) {
      // Update existing grace mark
      review.graceMarks[existingGraceIndex] = {
        questionIndex,
        questionText: question.questionText,
        reason,
        marksToAward,
        appliedAt: new Date()
      };
    } else {
      // Add new grace mark
      review.graceMarks.push({
        questionIndex,
        questionText: question.questionText,
        reason,
        marksToAward,
        appliedAt: new Date()
      });
    }

    review.totalGraceQuestions = review.graceMarks.length;
    review.status = "reviewed";
    review.reviewedAt = new Date();
    await review.save();

    return res.status(200).json({
      message: "Grace mark added successfully",
      review: {
        status: review.status,
        graceMarks: review.graceMarks,
        totalGraceQuestions: review.totalGraceQuestions
      }
    });
  } catch (error) {
    console.error("Add Grace Mark Error:", error);
    res.status(500).json({ error: "Error adding grace mark" });
  }
};

// Remove a grace mark
exports.removeGraceMark = async (req, res) => {
  try {
    const { id, questionIndex } = req.params;
    const teacherId = req.user.id;

    // Check if exam belongs to teacher
    const exam = await Exam.findOne({ _id: id, createdBy: teacherId });
    if (!exam) {
      return res.status(404).json({ error: "Exam not found or unauthorized" });
    }

    // Check if exam is already published
    if (exam.isPublished) {
      return res.status(400).json({ error: "Cannot remove grace marks from a published exam. Unpublish first." });
    }

    const review = await ExamReview.findOne({ examId: id });
    if (!review) {
      return res.status(404).json({ error: "No review found for this exam" });
    }

    // Remove the grace mark
    review.graceMarks = review.graceMarks.filter(gm => gm.questionIndex !== parseInt(questionIndex));
    review.totalGraceQuestions = review.graceMarks.length;
    await review.save();

    return res.status(200).json({
      message: "Grace mark removed successfully",
      review: {
        status: review.status,
        graceMarks: review.graceMarks,
        totalGraceQuestions: review.totalGraceQuestions
      }
    });
  } catch (error) {
    console.error("Remove Grace Mark Error:", error);
    res.status(500).json({ error: "Error removing grace mark" });
  }
};

// Apply grace marks to all attempts and recalculate scores
exports.applyGraceMarks = async (req, res) => {
  try {
    const { id } = req.params;
    const teacherId = req.user.id;

    // Check if exam belongs to teacher
    const exam = await Exam.findOne({ _id: id, createdBy: teacherId });
    if (!exam) {
      return res.status(404).json({ error: "Exam not found or unauthorized" });
    }

    // Get the review
    const review = await ExamReview.findOne({ examId: id });
    if (!review || review.graceMarks.length === 0) {
      return res.status(400).json({ error: "No grace marks to apply" });
    }

    // Get all attempts for this exam
    const attempts = await Result.find({ examId: id });

    let updatedCount = 0;

    for (const attempt of attempts) {
      let totalGraceMarks = 0;

      // Apply grace marks to each response
      for (const graceMark of review.graceMarks) {
        const response = attempt.responses.find(r => r.questionIndex === graceMark.questionIndex);

        if (response) {
          // Only award grace marks if the question was attempted (not left blank)
          if (response.wasAttempted) {
            // Remove previous grace marks if any
            const previousGrace = response.graceMarks || 0;
            if (previousGrace > 0) {
              totalGraceMarks -= previousGrace;
            }

            // Award new grace marks
            response.graceMarks = graceMark.marksToAward;
            totalGraceMarks += graceMark.marksToAward;
          } else {
            // If not attempted, no grace marks
            response.graceMarks = 0;
          }
        }
      }

      // Calculate new total score
      const originalCorrectCount = attempt.responses.filter(r => r.isCorrect).length;
      const graceMarksTotal = attempt.responses.reduce((sum, r) => sum + (r.graceMarks || 0), 0);
      const finalScore = originalCorrectCount + graceMarksTotal;

      // Save original score if not already saved
      if (attempt.originalScore === null || attempt.originalScore === undefined) {
        attempt.originalScore = originalCorrectCount;
      }

      attempt.totalGraceMarks = graceMarksTotal;
      attempt.score = finalScore;
      attempt.graceMarksApplied = true;
      attempt.graceMarksAppliedAt = new Date();
      await attempt.save();
      updatedCount++;
    }

    // Update review status
    review.status = "grace_marks_applied";
    review.graceMarksAppliedAt = new Date();
    await review.save();

    return res.status(200).json({
      message: `Grace marks applied successfully to ${updatedCount} attempts`,
      review: {
        status: review.status,
        graceMarks: review.graceMarks,
        totalGraceQuestions: review.totalGraceQuestions,
        graceMarksAppliedAt: review.graceMarksAppliedAt
      }
    });
  } catch (error) {
    console.error("Apply Grace Marks Error:", error);
    res.status(500).json({ error: "Error applying grace marks" });
  }
};

// Get detailed attempt view for teacher (with grace mark info)
exports.getTeacherAttemptDetails = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const teacherId = req.user.id;

    const attempt = await Result.findById(attemptId)
      .populate("studentId", "name email")
      .populate("examId", "title description questions durationMinutes");

    if (!attempt) {
      return res.status(404).json({ error: "Attempt not found" });
    }

    // Verify teacher owns this exam
    const exam = attempt.examId;
    if (exam.createdBy.toString() !== teacherId) {
      return res.status(403).json({ error: "Unauthorized to view this attempt" });
    }

    // Get review data
    const review = await ExamReview.findOne({ examId: exam._id });

    return res.status(200).json({
      attempt: {
        _id: attempt._id,
        student: attempt.studentId,
        exam: {
          _id: exam._id,
          title: exam.title,
          description: exam.description,
          durationMinutes: exam.durationMinutes
        },
        score: attempt.score,
        originalScore: attempt.originalScore,
        totalGraceMarks: attempt.totalGraceMarks,
        totalQuestions: attempt.totalQuestions,
        status: attempt.status,
        attemptDate: attempt.attemptDate,
        submittedAt: attempt.submittedAt,
        graceMarksApplied: attempt.graceMarksApplied,
        responses: attempt.responses.map(r => ({
          questionIndex: r.questionIndex,
          questionText: r.questionText,
          selectedAnswer: r.selectedAnswer,
          correctAnswer: exam.questions[r.questionIndex]?.correctAnswer,
          isCorrect: r.isCorrect,
          wasAttempted: r.wasAttempted,
          graceMarks: r.graceMarks
        }))
      },
      review: review ? {
        status: review.status,
        graceMarks: review.graceMarks
      } : null
    });
  } catch (error) {
    console.error("Get Teacher Attempt Details Error:", error);
    res.status(500).json({ error: "Error fetching attempt details" });
  }
};
