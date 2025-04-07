import os
import psycopg2
import dotenv

# Load environment variables
dotenv.load_dotenv()

def get_db_connection():
    """Get a fresh database connection"""
    try:
        conn_string = os.environ.get("DATABASE_URL")
        print(f"Connecting with: {conn_string[:20]}...")
        return psycopg2.connect(conn_string)
    except Exception as e:
        print(f"Database connection error: {e}")
        return None

def test_connection():
    print("Testing database connection...")
    conn = get_db_connection()
    
    if not conn:
        print("Failed to connect to database!")
        return
    
    print("Successfully connected to database!")
    
    try:
        with conn.cursor() as cur:
            # Check if the table exists
            cur.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'storage_listings'
                )
            """)
            table_exists = cur.fetchone()[0]
            print(f"Table 'storage_listings' exists: {table_exists}")
            
            if table_exists:
                # Get table columns
                cur.execute("""
                    SELECT column_name FROM information_schema.columns 
                    WHERE table_name = 'storage_listings' 
                    ORDER BY ordinal_position;
                """)
                columns = [col[0] for col in cur.fetchall()]
                print(f"Table columns: {columns}")
                
                # Get all listings
                cur.execute("SELECT * FROM storage_listings;")
                listings = cur.fetchall()
                print(f"Found {len(listings)} listings")
                
                # Get column names from cursor description
                column_names = [desc[0] for desc in cur.description]
                print(f"Column names from query: {column_names}")
                
                # Print the first listing if available
                if listings:
                    print("\nFirst listing:")
                    first_listing = {}
                    for i, col_name in enumerate(column_names):
                        first_listing[col_name] = listings[0][i]
                    
                    for key, value in first_listing.items():
                        print(f"  {key}: {value}")
    finally:
        conn.close()
        print("Database connection closed")

if __name__ == "__main__":
    test_connection()
