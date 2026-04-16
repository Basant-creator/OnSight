const mongoose = require("mongoose");

const graceMarkSchema = new mongoose.Schema({
  questionIndex: {
    type: Number,
    required: true
  },
  questionText: {
    type: String,
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  marksToAward: {
    type: Number,
    required: true,
    min: 0,
    max: 1
  },
  appliedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const examReviewSchema = new mongoose.Schema({
  examId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Exam",
    required: true,
    unique: true
  },
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  status: {
    type: String,
    enum: ["under_review", "reviewed", "grace_marks_applied"],
    default: "under_review"
  },
  graceMarks: {
    type: [graceMarkSchema],
    default: []
  },
  totalGraceQuestions: {
    type: Number,
    default: 0
  },
  reviewedAt: {
    type: Date,
    default: null
  },
  graceMarksAppliedAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model("ExamReview", examReviewSchema);
