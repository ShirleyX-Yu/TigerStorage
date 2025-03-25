from database import get_db_connection

def test_insert():

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO sellers (seller_id, name, email) VALUES (1, 'John Doe', 'john@example.com')"

            )


            cur.execute(
                "INSERT INTO storage_listings (seller_id, title, description, location, square_ft, amount, available_from, available_to) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING listing_id",
                (1, "Test Storage", "A test listing", "123 Test St", 500, 1000, "2024-04-01", "2024-12-01")
            )

            listing_id = cur.fetchone()[0]
            conn.commit()

            print(f"Inserted test listing with ID: {listing_id}")


if __name__ == "__main__":
    test_insert()