import os
import psycopg2
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# PostgreSQL connection
conn = psycopg2.connect(os.getenv("DATABASE_URL"))

# API to create a new listing
@app.route('/api/listings', methods=['POST'])
def create_listing():
    try:
        data = request.get_json()
        print('Received JSON data:', data)
        
        location = data.get('location')
        cost = data.get('cost')
        cubic_feet = data.get('cubicFeet')
        contract_length = data.get('contractLength')
        
        print('Parsed values:', {
            'location': location,
            'cost': cost,
            'cubic_feet': cubic_feet,
            'contract_length': contract_length
        })

        # Convert data to correct types
        cost = float(cost) if cost else 0
        cubic_feet = int(cubic_feet) if cubic_feet else 0
        contract_length = int(contract_length) if contract_length else 0

        # Insert into database
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO storage_listings (location, cost, cubic_ft, contract_length_months)
                VALUES (%s, %s, %s, %s) RETURNING listing_id;
            """, (location, cost, cubic_feet, contract_length))
            listing_id = cur.fetchone()[0]
            conn.commit()

        return jsonify({"message": "Listing created successfully!", "listing_id": listing_id}), 201

    except Exception as e:
        print("Error creating listing:", str(e))
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

# API to get all listings
@app.route('/api/listings', methods=['GET'])
def get_listings():
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT listing_id, location, cost, cubic_ft, contract_length_months FROM storage_listings;")
            listings = cur.fetchall()

        # Convert data to JSON-friendly format
        formatted_listings = [
            {"id": row[0], "location": row[1], "cost": row[2], "cubic_feet": row[3], "contract_length_months": row[4]}
            for row in listings
        ]

        return jsonify(formatted_listings), 200

    except Exception as e:
        print("Error:", e)
        return jsonify({"error": "Failed to fetch listings"}), 500

# Start server
if __name__ == '__main__':
    app.run(debug=True, port=5000)