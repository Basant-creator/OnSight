# 🚀 OnSight

## 🧠 What is this?

OnSight is a smart monitoring and detection system that uses real-time data (like camera input or user activity) to provide instant insights and alerts.

In simple terms:  
It helps users keep an eye on things automatically instead of manually checking everything.

---

## ⚙️ How it works

- User connects input source (camera / system / data stream)
- The system processes the data using logic or models
- It detects events, patterns, or anomalies
- Output is shown as alerts, logs, or visual insights

So instead of constantly watching, the system does the watching for you.

---

## 🧰 Tech Stack

- Frontend: React / HTML / CSS / JavaScript  
- Backend: Node.js / Express  
- Database: MongoDB  
- Other tools: APIs, real-time processing, possibly ML models  

---

## ✨ Features

- Real-time monitoring and detection  
- Automated alerts for important events  
- Clean and simple dashboard for insights  
- Scalable architecture for handling multiple inputs  
- Easy integration with different data sources  

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

## 🚧 Future Plans

- Add AI-based detection for smarter predictions  
- Improve accuracy and reduce false alerts  
- Enhance UI/UX  
- Add user authentication and role-based access  
- Mobile support for monitoring on the go  
- Cloud deployment for better scalability  

---

## 🎯 Why this project exists

Because constantly monitoring systems or environments manually is inefficient and error-prone.  
OnSIght aims to automate that process and make monitoring smarter and faster.

---

## 🤝 Contribution

Want to contribute?

- Fork the repository  
- Make your changes  
- Submit a pull request  

---

## 📌 Final Note

This project is still evolving.  
There will be bugs. Improvements are ongoing.