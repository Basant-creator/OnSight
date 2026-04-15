const mongoose = require("mongoose");

const responseSchema = new mongoose.Schema({
  questionIndex: {
    type: Number,
    required: true
  },
  questionText: {
    type: String,
    required: true
  },
  selectedAnswer: {
    type: String,
    default: null
  },
  correctAnswer: {
    type: String,
    required: true
  },
  isCorrect: {
    type: Boolean,
    required: true
  }
}, { _id: false });

const resultSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  examId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Exam",
    required: true
  },
  score: {
    type: Number,
    required: true,
    default: 0
  },
  totalQuestions: {
    type: Number,
    required: true,
    default: 0
  },
  status: {
    type: String,
    enum: ["attempted", "published"],
    default: "attempted"
  },
  attemptDate: {
    type: Date,
    default: Date.now
  },
  responses: {
    type: [responseSchema],
    default: []
  },
  startedAt: {
    type: Date,
    default: null
  },
  submittedAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model("Result", resultSchema);
