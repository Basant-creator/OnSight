# 🎓 Practice Exam Platform

## 🧠 What is this?

This is a seamless, automated **Practice Exam Platform** designed to streamline evaluations for both teachers and students.

**In simple terms:**
Teachers upload exam question papers (as PDFs) along with an Answer Key. Students log in, attempt the test through the UI, and the system *automatically grades* their performance in real-time. Teachers simply review the results and manually release them, instantly granting students a detailed performance analysis without any tedious manual grading interference.

---

## ⚙️ How it works

1. **Teacher Setup**: A Teacher uploads a Question Paper PDF and provides the corresponding Answer Key to the system.
2. **Student Attempt**: Students log in securely, select the available test, and submit their answers.
3. **Auto-Grading**: The system actively grades the student's submission instantly against the Answer Key without teacher interference.
4. **Teacher Review & Release**: The Teacher reviews the overall test data and clicks "Release Results".
5. **Student Analysis**: Students receive their scores alongside an in-depth analysis of their performance.

---

## 🧰 Tech Stack

- **Frontend**: React / HTML / CSS / JavaScript (WIP)
- **Backend**: Node.js / Express
- **Database**: MongoDB (Mongoose)
- **Security & Infrastructure**: Fully integrated JWT authentication, advanced Role-Based Access Control (RBAC), Refresh Token rotations, API Rate Limiting, and active Audit Logging. 

---

## 📂 Folder Structure

```text
OnSight/
├── backend/            # Express server and APIs
│   ├── config/         # Environment and settings, roles config
│   ├── middleware/     # Auth, role hierarchies, and audit checking
│   ├── models/         # Mongoose schemas (User, AuditLog)
│   ├── routes/         # Express endpoints (/auth, /api)
│   └── server.js       # Main server entry point
├── frontend/           # React frontend interface
├── .env                # Environment variables
├── app.py              # Legacy/Alternative Python Flask backend
├── package.json        # Node.js dependencies
└── README.md           # Project documentation
```

---

## 🏃 How to Run It

### Prerequisites
Make sure you have installed:
- **Node.js** (v18+ recommended)
- **MongoDB** running locally or via Atlas cluster

### 1. Configure the Environment
Create a `.env` file in the root directory (alongside `package.json`):
```env
JWT_SECRET=your-access-token-secret
JWT_REFRESH_SECRET=your-refresh-token-secret
MONGO_URI=mongodb://127.0.0.1:27017/exam_platform
PORT=3000
```

### 2. Start the Backend
Open your terminal inside the project root and run:
```bash
# Install the necessary packages
npm install

# Start the backend node server
node backend/server.js
```
Your backend will print `MongoDB Connected` and will be accessible at `http://localhost:3000`.

---

## ✨ Features

- **Automated Grading Engine**: Instantly maps student answers to the teacher's key.
- **Secure Role Hierarchy**: Distinct views and granular permissions mapped dynamically to `Admin > Teacher > Student`.
- **Audit Logging**: Every sensitive action (login, failure, token rotation) is recorded to MongoDB.
- **Secure Sessions**: Integrated short-lived Access Tokens and long-lived Refresh Tokens.

---

## 🚧 Future Plans

- Full PDF Parsing / OCR support to extract text from question papers.
- Deeper statistical algorithms for Student Performance Analysis (e.g. topic-wise weaknesses).
- Email or SMS notifications when results are officially released by the Teacher.
- Complete the React frontend dashboard integration.

---

## 🤝 Contribution

Want to contribute?

1. Fork the repository
2. Make your code changes & fixes
3. Submit a pull request!