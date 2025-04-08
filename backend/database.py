import os
import psycopg2
from dotenv import load_dotenv

def get_db_connection():
    """Get a fresh database connection"""
    try:
        # Load environment variables from .env file
        load_dotenv()
        
        # Get database URL from environment variable
        database_url = os.environ.get("DATABASE_URL")
        if not database_url:
            print("Error: DATABASE_URL environment variable is not set")
            return None
            
        print(f"DEBUG: Connecting to database with URL: {database_url}")
        conn = psycopg2.connect(database_url)
        return conn
    except Exception as e:
        print(f"Database connection error: {e}")
        return None