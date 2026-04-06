import os
from dotenv import load_dotenv
from pymongo import MongoClient
import certifi

load_dotenv()
uri = os.getenv('MONGO_URI')
print('URI:', uri)
try:
    client = MongoClient(uri, serverSelectionTimeoutMS=5000, tlsCAFile=certifi.where())
    client.admin.command('ping')
    print('SUCCESS')
except Exception as e:
    print('ERROR:', type(e).__name__, str(e))
