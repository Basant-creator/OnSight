require("dotenv").config();
const axios = require("axios");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");
const Exam = require("./models/Exam");

const BASE_URL = "http://localhost:5000";

const getCookieHeader = (setCookie) => {
  if (!Array.isArray(setCookie) || setCookie.length === 0) return "";
  return setCookie.map((cookie) => cookie.split(";")[0]).join("; ");
};

async function ensureUser({ email, password, role, name }) {
  const existing = await User.findOne({ email });
  const hashedPassword = await bcrypt.hash(password, 10);
  if (!existing) {
    await User.create({ email, password: hashedPassword, role, name });
    return;
  }
  existing.password = hashedPassword;
  existing.role = role;
  existing.name = name;
  await existing.save();
}

async function loginAndGetCookie(email, password) {
  const response = await axios.post(`${BASE_URL}/auth/login`, { email, password });
  return getCookieHeader(response.headers["set-cookie"]);
}

async function run() {
  const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/exam_platform";
  await mongoose.connect(mongoUri);

  const stamp = Date.now();
  const teacherEmail = `teacher.schedule.${stamp}@test.com`;
  const studentEmail = `student.schedule.${stamp}@test.com`;
  const teacherPassword = "teacher123";
  const studentPassword = "student123";

  await ensureUser({
    email: teacherEmail,
    password: teacherPassword,
    role: "teacher",
    name: "Schedule Teacher"
  });
  await ensureUser({
    email: studentEmail,
    password: studentPassword,
    role: "student",
    name: "Schedule Student"
  });

  const teacherCookie = await loginAndGetCookie(teacherEmail, teacherPassword);
  const studentCookie = await loginAndGetCookie(studentEmail, studentPassword);

  const createA = await axios.post(`${BASE_URL}/api/teacher/exams`, {
    title: `A Exam ${stamp}`,
    description: "Sooner exam",
    questions: [{ questionText: "Q1", options: ["A"], correctAnswer: "A" }]
  }, { headers: { Cookie: teacherCookie } });

  const createB = await axios.post(`${BASE_URL}/api/teacher/exams`, {
    title: `B Exam ${stamp}`,
    description: "Later exam",
    questions: [{ questionText: "Q2", options: ["B"], correctAnswer: "B" }]
  }, { headers: { Cookie: teacherCookie } });

  const createDraftOnly = await axios.post(`${BASE_URL}/api/teacher/exams`, {
    title: `Draft Only ${stamp}`,
    description: "Should not appear in upcoming list",
    questions: [{ questionText: "Q3", options: ["C"], correctAnswer: "C" }]
  }, { headers: { Cookie: teacherCookie } });

  const examAId = createA.data.exam._id;
  const examBId = createB.data.exam._id;
  const draftId = createDraftOnly.data.exam._id;

  // Validation test: invalid ISO date-time
  let validationPassed = false;
  try {
    await axios.patch(`${BASE_URL}/api/teacher/exams/${examAId}/schedule`, {
      scheduledAt: "not-a-valid-date"
    }, { headers: { Cookie: teacherCookie } });
  } catch (error) {
    if (error.response?.status === 400 &&
        String(error.response?.data?.error || "").includes("valid ISO date-time")) {
      validationPassed = true;
    }
  }
  if (!validationPassed) {
    throw new Error("Scheduling validation test failed: invalid ISO date-time was not rejected with clear 400.");
  }

  const soon = new Date(Date.now() + 90 * 60 * 1000).toISOString();
  const later = new Date(Date.now() + 180 * 60 * 1000).toISOString();

  await axios.patch(`${BASE_URL}/api/teacher/exams/${examBId}/schedule`, {
    scheduledAt: later,
    durationMinutes: 120
  }, { headers: { Cookie: teacherCookie } });

  await axios.patch(`${BASE_URL}/api/teacher/exams/${examAId}/schedule`, {
    scheduledAt: soon,
    durationMinutes: 60
  }, { headers: { Cookie: teacherCookie } });

  // Ensure draft exam remains draft and hidden from student upcoming endpoint
  await Exam.updateOne({ _id: draftId }, { $set: { status: "draft", scheduledAt: null } });

  const studentUpcoming = await axios.get(`${BASE_URL}/api/student/exams`, {
    headers: { Cookie: studentCookie }
  });
  const exams = studentUpcoming.data.exams || [];

  if (exams.length < 2) {
    throw new Error("Student upcoming listing test failed: expected scheduled exams to be returned.");
  }

  const ids = exams.map((exam) => String(exam._id));
  if (ids.includes(String(draftId))) {
    throw new Error("Student upcoming listing test failed: draft exam appeared in upcoming list.");
  }

  const indexA = ids.indexOf(String(examAId));
  const indexB = ids.indexOf(String(examBId));
  if (indexA === -1 || indexB === -1 || indexA > indexB) {
    throw new Error("Student upcoming listing test failed: exams are not sorted by nearest scheduled time.");
  }

  console.log("PASS: Scheduling validation rejects invalid ISO date-time.");
  console.log("PASS: Student upcoming list includes only scheduled future exams sorted by nearest date.");
  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error("FAIL:", error.response?.data || error.message);
  try {
    await mongoose.disconnect();
  } catch (_) {
    // no-op
  }
  process.exit(1);
});
