import requests
import time
from datetime import datetime, timedelta

# Configuration
url = "https://tigerstorage-backend.onrender.com/api/stress-test/create-listings"  # Updated URL
num_listings = 10  # Number of listings to create in each request
total_iterations = 5  # Total number of requests to send
delay = 1  # Delay between requests in seconds (1 second for OpenStreetMap rate limit)

# Fetch the CSRF token
csrf_response = requests.get("https://tigerstorage-backend.onrender.com/api/csrf-token")
csrf_token = csrf_response.json().get('csrf_token')

# Prepare headers with CSRF token
headers = {
    "Content-Type": "application/json",
    "X-CSRF-Token": csrf_token  # Include the CSRF token here
}

def generate_listing_data(index):
    """Generate dynamic listing data."""
    return {
        "title": f"Stress Test Storage {index + 1}",
        "cost": 10.00,  # Example cost
        "sq_ft": 10,  # Example square feet
        "latitude": 40.3481639 + (index * 0.001),  # Example latitude
        "longitude": -74.6621893 + (index * 0.001),  # Example longitude
        "description": "A description of the listing.",  # Example description
        "image_url": "https://res.cloudinary.com/ddsxhjlvh/image/upload/v1746723021/lfjhm2tkubxofqnbu0d2.jpg",  # Example image URL
        "owner_id": f"ct{index + 1:04d}",  # Example owner_id
        "address": "Hamilton Hall, University Place, Princeton, Mercer County, New Jersey, 08540, United States",  # Example address
        "start_date": (datetime.now() + timedelta(days=1)).isoformat(),  # Start date tomorrow
        "end_date": (datetime.now() + timedelta(days=30)).isoformat(),  # End date in 30 days
        "contract_start_date": None,  # Example contract start date
        "contract_end_date": None,  # Example contract end date
        "remaining_space": 0,  # Example remaining space
        "is_available": False,  # Example availability
        "approved": True,  # Example approval status
        "hall_name": "Hamilton Hall"  # Example hall name
    }

for i in range(total_iterations):
    print(f"Creating listings batch {i + 1}...")
    
    # Generate a list of listings to create
    listings = [generate_listing_data(j) for j in range(num_listings)]
    
    # Send the request to create listings
    response = requests.post(url, json={"listings": listings})
    
    # Print the response from the server
    print(f"Response: {response.status_code} - {response.json()}")
    
    # Wait for the specified delay
    time.sleep(delay)

