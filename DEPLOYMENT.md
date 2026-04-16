# 🚀 OnSight Deployment Guide (Render + Vercel)

## Quick Overview
- **Backend**: Deploy to Render (Node.js server)
- **Frontend**: Deploy to Vercel (Static HTML files)
- **Database**: MongoDB Atlas (Free tier)

---

## Step 1: Database Setup (MongoDB Atlas)

1. Go to https://www.mongodb.com/atlas
2. Create free account → Create new cluster
3. Choose AWS/GCP/Azure region closest to your users
4. In "Database Access": Create database user
5. In "Network Access": Add IP `0.0.0.0/0` (allows all, needed for Render)
6. Get connection string: `mongodb+srv://user:pass@cluster...`

---

## Step 2: Backend Deployment (Render)

### Step 2a: Get Google Gemini API Key (Required for PDF Extraction)

1. Go to https://ai.google.dev/
2. Sign in with Google account
3. Click "Get API Key"
4. Copy the key (starts with `AIza...`)
5. **Save this key** - you'll need it in Render dashboard

### Step 2b: Deploy to Render

#### Option A: Using render.yaml (Recommended)

1. Push code to GitHub
2. In Render Dashboard → "New Blueprint"
3. Connect your repo
4. Render will read `render.yaml` and auto-configure
5. **Set Environment Variables** in Render Dashboard:
   ```
   MONGO_URI=mongodb+srv://your-atlas-uri
   JWT_SECRET=generate-random-string-32-chars
   JWT_REFRESH_SECRET=another-random-string-32-chars
   FRONTEND_URL=https://your-vercel-url.vercel.app (add after Vercel deploy)
   GEMINI_API_KEY=AIza...your-actual-key
   ```

### Option B: Manual Setup
1. New Web Service → Connect repo
2. **Build Command**: `npm install`
3. **Start Command**: `node backend/server.js`
4. Add environment variables as above

---

## Step 3: Frontend Deployment (Vercel)

1. Go to https://vercel.com
2. Import GitHub repo
3. **Framework Preset**: Other (static HTML)
4. **Root Directory**: `frontend/`
5. Deploy!

### After Deploy:
1. Copy Vercel URL: `https://your-project.vercel.app`
2. Go back to Render Dashboard
3. Update `FRONTEND_URL` environment variable
4. Restart Render service

---

## Step 4: Update Frontend API URL

In all HTML files, update the Render URL:

**File**: `frontend/student_dashboard.html`, `teacher_dashboard.html`, `admin_dashboard.html`, `index.html`, `login.html`

```javascript
// Line ~8-11 - Replace YOUR_RENDER_URL
window.API_BASE = window.location.hostname.includes('vercel.app')
    ? 'https://your-render-url.onrender.com'  // ← REPLACE THIS
    : 'http://localhost:5000';
```

---

## ✅ Pre-Deployment Checklist

### Security
- [ ] Strong JWT secrets (32+ characters)
- [ ] MongoDB Atlas IP whitelist set to `0.0.0.0/0`
- [ ] `FRONTEND_URL` matches Vercel domain exactly
- [ ] `NODE_ENV=production` set

### Code
- [ ] API_BASE uses `window.API_BASE` in script.js
- [ ] All HTML files have the config script block
- [ ] CORS origin set to Vercel URL (in server.js)

### Testing (Before Deploy)
- [ ] Login works locally
- [ ] Teacher can upload PDF and AI extracts questions
- [ ] Teacher can create exam from extracted questions
- [ ] Student can attempt exam
- [ ] Results show after publish

### Required External Services
- [ ] MongoDB Atlas cluster created
- [ ] Google Gemini API key obtained
- [ ] GitHub repo with all code pushed

---

## 🔧 Troubleshooting

### CORS Errors
```
Access-Control-Allow-Origin header missing
```
**Fix**: Update `FRONTEND_URL` in Render to match exact Vercel URL (include `https://`)

### MongoDB Connection Fails
```
MongooseServerSelectionError
```
**Fix**: Check IP whitelist in Atlas, verify MONGO_URI format

### API Not Responding
**Fix**: Check Render logs, ensure server.js is starting on port from env

### Frontend Shows "Error Loading"
**Fix**: Check browser console, verify `window.API_BASE` is set correctly

### PDF Upload Fails / "GEMINI_API_KEY not configured"
```
Error: GEMINI_API_KEY is not configured in the environment.
```
**Fix**: 
1. Verify `GEMINI_API_KEY` is set in Render Dashboard → Environment
2. Restart service after adding the key
3. Check that the key is valid at https://ai.google.dev/

### PDF Upload Times Out
**Fix**: 
- Large PDFs (>5MB) are rejected (configured limit)
- Render free tier may be slow on first request (cold start)
- Try uploading a smaller PDF (<2MB) for testing

### AI Returns Wrong Format / Not JSON
**Fix**:
- The code handles malformed JSON from Gemini
- Try re-uploading the PDF
- Ensure PDF contains clear MCQ questions

---

## 🤖 PDF AI Extraction Configuration

### How It Works
1. Teacher uploads PDF to `/api/teacher/exams/upload`
2. Backend converts PDF to base64
3. Gemini AI extracts MCQ questions, options, and correct answers
4. Returns structured JSON to frontend for review
5. Teacher edits if needed, then saves exam

### AI Models Used
The system tries models in order:
1. **gemini-2.5-flash** (primary)
2. **gemini-2.0-flash** (fallback)

### Expected PDF Format
For best results, PDF should contain:
```
Question 1: What is 2 + 2?
A) 3
B) 4
C) 5
D) 6
Answer: B

Question 2: ...
```

### Gemini API Pricing
- **Free tier**: 60 requests/minute, sufficient for testing
- **Production**: Pay-as-you-go, very affordable
- See: https://ai.google.dev/pricing

---

## 📦 What Gets Deployed

### To Render (Backend):
```
backend/
├── server.js
├── controllers/
│   └── exam.controller.js  # Contains PDF AI extraction ✨
├── middleware/
├── models/
├── routes/
├── services/
├── validations/
├── config/
├── package.json
├── sample_exam.pdf        # For testing PDF upload
└── .env (from Render dashboard)
```

### To Vercel (Frontend):
```
frontend/
├── *.html
├── script.js
├── style.css
└── config.js
```

---

## 🎯 Post-Deploy Verification

Test these flows:
1. ✅ **Head Admin** login → Create Sub-Admin
2. ✅ **Sub-Admin** login → Create Teacher → Create Student
3. ✅ **Teacher** login → **Upload PDF → AI extracts questions** → Save exam → Schedule it
4. ✅ **Student** login → see exam → attempt it
5. ✅ Teacher publishes results
6. ✅ Student sees score

**Role Hierarchy:** Head Admin → Sub Admin → Teacher → Student

**PDF Upload Test:**
- Upload a PDF with MCQ questions
- Verify AI extracts: Question text, Options, Correct Answer
- Save the extracted exam
- Verify it appears in scheduled exams

---

## 📋 Free Tier Limits

| Service | Free Tier |
|---------|-----------|
| Render | 750 hours/month, sleeps after 15min idle |
| Vercel | 100GB bandwidth, unlimited static sites |
| MongoDB Atlas | 512MB storage, shared cluster |

**Note**: Render free tier "sleeps" after 15min inactivity (cold start ~30s).

---

## 🔄 Updating After Deploy

1. Push changes to GitHub
2. Render auto-deploys (backend)
3. Vercel auto-deploys (frontend)
4. Both update automatically!
