const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const cookieParser = require("cookie-parser")
const path = require("path")
const fs = require("fs")

// Load .env only if it exists (development), Render injects vars directly
const envPath = path.resolve(__dirname, '../.env')
const rateLimit = require("express-rate-limit")
if (fs.existsSync(envPath)) {
  require("dotenv").config({ path: envPath })
} else {
  require("dotenv").config()
}

const authRoutes = require("./routes/auth")
const protectedRoutes = require("./routes/protected")
const app = express()
const PORT = Number(process.env.PORT) || 5000

// Validate required env vars
if (!process.env.MONGO_URI) {
  console.error("FATAL: MONGO_URI not set")
  process.exit(1)
}
if (!process.env.JWT_SECRET) {
  console.error("FATAL: JWT_SECRET not set")
  process.exit(1)
}

app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      "https://on-sight-cu4b.vercel.app",
      "http://localhost:5000",
      "http://localhost:5500",
      "http://127.0.0.1:5500"
    ];
    if (process.env.FRONTEND_URL) allowedOrigins.push(process.env.FRONTEND_URL);
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}))
app.use(express.json())
app.use(cookieParser())

const mongoURI = process.env.MONGO_URI
mongoose.connect(mongoURI)
.then(() => console.log("MongoDB Connected"))
.catch(err => {
  console.error("MongoDB Error:", err)
  process.exit(1)
})

// Health check - REQUIRED for Render
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? "connected" : "disconnected"
  })
})

// Additional health endpoint for monitoring
app.get("/health", (req, res) => {
  res.status(200).json({ status: "healthy" })
})

// Global Rate Limiter (applied after health and root routes)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { error: "Too many requests from this IP, please try again after 15 minutes" },
});
app.use(globalLimiter);

app.use("/auth", authRoutes)
app.use("/api", protectedRoutes)

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(`[Error] ${err.message}`)
  const status = err.status || 500
  const message = err.message || "Internal Server Error"
  res.status(status).json({ error: message })
})

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

// Graceful shutdown for Render
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully')
  server.close(() => {
    mongoose.connection.close(false, () => {
      process.exit(0)
    })
  })
})
