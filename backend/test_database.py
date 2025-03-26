from database import get_db_connection

# simple program to insert dummy data and select all storage_listing data in database

# writing to database
def test_insert():
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO storage_listings (location, cost, cubic_ft, contract_length_months) "
                "VALUES (%s, %s, %s, %s) RETURNING listing_id",
                ("123 Test Str", 100, 500, 3)
            )

            listing_id = cur.fetchone()[0] # correctly inserts storage listing with id 1
            conn.commit() # saves changes permanently in database

            print(f"Inserted test listing with ID: {listing_id}")

# reading to database
def test_select():
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT * FROM storage_listings"
            )

            table = cur.fetchall()
            print(table) # view all data in storage_listings

if __name__ == "__main__":
    test_insert()
    test_select()