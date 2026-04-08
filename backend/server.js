const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const cookieParser = require("cookie-parser")
const path = require("path")
const authRoutes = require("./routes/auth")
const protectedRoutes = require("./routes/protected")
require("dotenv").config({ path: path.resolve(__dirname, '../.env') })
const app = express()

app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}))
app.use(express.json())
app.use(cookieParser())

const mongoURI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/exam_platform"
mongoose.connect(mongoURI)
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log(err))

app.get("/", (req,res)=>{
    res.send("API is running")
})

app.use("/auth", authRoutes)
app.use("/api", protectedRoutes)

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(`[Error] ${err.message}`);
  const status = err.status || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ error: message });
})

app.listen(5000, ()=>{
    console.log("Server running on port 5000")
})