# Practice Exam Platform - Backend Phase 0

Minimal but clean backend setup using Python Flask and MongoDB.

## Folder Structure
```text
Practice_Exam_Platform/
├── app.py                 # Main Flask application entry point
├── config/
│   ├── __init__.py        
│   └── db.py              # MongoDB connection setup and error handling
├── .env                   # Environment variables (do not commit)
├── .env.example           # Example environment variables template
├── requirements.txt       # Python dependencies
└── README.md              # Project documentation
```

## Prerequisites
- Python 3.8+
- MongoDB (Running locally or a MongoDB Atlas URI)

## Setup Instructions

1. **Create a virtual environment (recommended):**
   ```bash
   python -m venv venv
   ```

2. **Activate the virtual environment:**
   - On Windows:
     ```bash
     venv\Scripts\activate
     ```
   - On macOS/Linux:
     ```bash
     source venv/bin/activate
     ```

3. **Install the dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure Environment Variables:**
   - Make sure your MongoDB is running locally, or update the `MONGO_URI` in `.env`.
   - The `.env` file should have been generated automatically, looking like:
     ```env
     MONGO_URI=mongodb://localhost:27017/practice_exam_db
     PORT=5000
     DEBUG=True
     ```

5. **Run the Flask Application:**
   ```bash
   python app.py
   ```

6. **Test the API:**
   Open a browser or use a tool like cURL/Postman and navigate to:
   ```
   http://localhost:5000/
   ```
   You should see a JSON response stating `"API is running"` and the database connection status.
