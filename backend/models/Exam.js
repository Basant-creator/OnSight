const mongoose = require("mongoose");

const examSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  questions: [{
    questionText: { type: String, required: true },
    options: [{ type: String }],
    correctAnswer: { type: String, required: true },
    explanation: { type: String }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  scheduledAt: {
    type: Date
  },
  durationMinutes: {
    type: Number,
    default: 60
  },
  status: {
    type: String,
    enum: ["draft", "scheduled", "closed"],
    default: "draft"
  }
}, { timestamps: true });

module.exports = mongoose.model("Exam", examSchema);
