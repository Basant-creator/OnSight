import os
from flask import Flask, jsonify
from dotenv import load_dotenv
from config.db import get_db_connection

# Load environment variables
load_dotenv()

def create_app():
    app = Flask(__name__)

    # Initialize Database Connection
    db = get_db_connection()
    if db is None:
        print("WARNING: Starting application without database connection!")
    app.config["db"] = db

    @app.route("/", methods=["GET"])
    def index():
        db_status = "Connected" if app.config.get("db") is not None else "Disconnected"
        return jsonify({
            "message": "API is running",
            "database_status": db_status
        }), 200

    return app

if __name__ == "__main__":
    app = create_app()
    port = int(os.getenv("PORT", 5000))
    debug_mode = os.getenv("DEBUG", "True").lower() == "true"
    
    app.run(host="0.0.0.0", port=port, debug=debug_mode)
