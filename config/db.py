import os
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/practice_exam_db")

def get_db_connection():
    """
    Establish and return a MongoDB connection.
    """
    try:
        # The serverSelectionTimeoutMS ensures it doesn't hang indefinitely if DB is inaccessible
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
        # Attempt to ping the database to verify the connection
        client.admin.command('ping')
        print("Connected to MongoDB successfully!")
        
        # Determine database name from URI or use a default
        db_name = MONGO_URI.split("/")[-1].split("?")[0]
        if not db_name:
            db_name = "practice_exam_db"
            
        db = client[db_name]
        return db
    except ConnectionFailure as e:
        print(f"MongoDB connection failed: {e}")
        return None
    except Exception as e:
        print(f"An error occurred while connecting to MongoDB: {e}")
        return None
