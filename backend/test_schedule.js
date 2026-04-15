const axios = require('axios');

async function runTest() {
  let adminCookie;
  let teacherCookie;
  let studentCookie;

  console.log("1. Authenticating...");
  try {
    const adminLogin = await axios.post("http://localhost:5000/auth/login", { email: "admin@test.com", password: "adminpassword" }); // Assuming admin exists
    adminCookie = adminLogin.headers['set-cookie'][0];
  } catch (e) {
    if (e.response?.status !== 401) console.log("Admin login failed, ignoring if not needed.", e.message);
  }

  try {
    const loginRes = await axios.post("http://localhost:5000/auth/login", { email: "teacher@test.com", password: "teacher123" });
    teacherCookie = loginRes.headers['set-cookie'][0];
  } catch (e) {
    console.error("Teacher login failed:", e.response?.data || e.message);
    return;
  }

  try {
    const studentRes = await axios.post("http://localhost:5000/auth/login", { email: "student@test.com", password: "student123" });
    studentCookie = studentRes.headers['set-cookie'][0];
  } catch (e) {
    console.error("Student login failed:", e.response?.data || e.message);
    return;
  }

  let examId;
  console.log("2. Creating an Exam...");
  try {
    const saveRes = await axios.post("http://localhost:5000/api/teacher/exams", {
      title: "Schedule Validation Test",
      description: "Tested via scheduling script",
      questions: []
    }, {
      headers: { Cookie: teacherCookie }
    });
    examId = saveRes.data.exam._id;
    console.log("Exam successfully saved with ID:", examId);
  } catch(err) {
      console.error("Failed to save exam:", err.response?.data || err.message);
      return;
  }

  console.log("3. Testing invalid schedule (past date)...");
  try {
    await axios.patch(`http://localhost:5000/api/teacher/exams/${examId}/schedule`, {
      scheduledAt: new Date(Date.now() - 100000).toISOString()
    }, { headers: { Cookie: teacherCookie } });
    console.error("FAIL: Should not allow past date.");
  } catch(err) {
    console.log("PASS: Invalid schedule error:", err.response?.data);
  }

  console.log("4. Testing valid schedule (future date)...");
  try {
    const scheduleRes = await axios.patch(`http://localhost:5000/api/teacher/exams/${examId}/schedule`, {
      scheduledAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(), // Tomorrow
      durationMinutes: 90
    }, { headers: { Cookie: teacherCookie } });
    console.log("PASS: Exam scheduled:", scheduleRes.data.exam.status);
  } catch(err) {
    console.error("FAIL: Could not schedule exam:", err.response?.data || err.message);
  }

  console.log("5. Testing student upcoming exam list...");
  try {
    const studentExamsRes = await axios.get("http://localhost:5000/api/student/exams", {
      headers: { Cookie: studentCookie }
    });
    const upcoming = studentExamsRes.data.exams;
    const found = upcoming.find(e => e._id === examId);
    if(found) {
      console.log("PASS: Student sees the upcoming exam.");
    } else {
      console.error("FAIL: Student does not see the upcoming exam.", upcoming);
    }
  } catch(err) {
    console.error("FAIL: Student exams fetch failed:", err.response?.data || err.message);
  }
}

runTest();
