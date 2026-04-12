const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

async function runTest() {
  console.log("1. Logging in...");
  let cookieHeader;
  try {
    const loginRes = await axios.post("http://localhost:5000/auth/login", {
      email: "teacher@test.com", password: "teacher123"
    });
    const setCookie = loginRes.headers['set-cookie'];
    if (!setCookie) throw new Error("No cookie returned");
    cookieHeader = setCookie[0];
    console.log("Logged in successfully. Cookie obtained.");
  } catch (err) {
    console.error("Login failed:", err.response?.data || err.message);
    return;
  }

  console.log("2. Uploading PDF to /api/teacher/exams/upload");
  const pdfPath = path.join(__dirname, 'sample_exam.pdf');
  
  const formData = new FormData();
  formData.append("pdf", fs.createReadStream(pdfPath));

  let uploadData;
  try {
    const uploadRes = await axios.post("http://localhost:5000/api/teacher/exams/upload", formData, {
      headers: {
        ...formData.getHeaders(),
        Cookie: cookieHeader
      }
    });
    uploadData = uploadRes.data;
  } catch(err) {
    console.error("Upload failed:", err.response?.data || err.message);
    return;
  }

  console.log("PDF Parsed Successfully!");
  console.log("AI Output (first question snippet):", uploadData.questions && uploadData.questions.length > 0 ? uploadData.questions[0].questionText : 'No questions');

  console.log("3. Saving Exam...");
  try {
    const saveRes = await axios.post("http://localhost:5000/api/teacher/exams", {
      title: "API Test Exam",
      description: "Tested via backend script",
      questions: uploadData.questions
    }, {
      headers: { Cookie: cookieHeader }
    });
    console.log("Exam successfully saved to database!");
  } catch(err) {
      console.error("Failed to save exam:", err.response?.data || err.message);
  }
}

runTest();
