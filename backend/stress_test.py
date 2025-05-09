import os
import time
import random
from datetime import datetime, timedelta
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

username = os.getenv('CAS_USERNAME')
password = os.getenv('CAS_PASSWORD')

# Configuration
url = "https://tigerstorage-backend.onrender.com/lender-dashboard"  # Replace with your actual lender dashboard URL
num_listings = 10  # Number of listings to create in each request
total_iterations = 5  # Total number of requests to send

# Set up Chrome options
chrome_options = Options()
chrome_options.add_argument("--headless")  # Run in headless mode (no GUI)
chrome_options.add_argument("--no-sandbox")
chrome_options.add_argument("--disable-dev-shm-usage")

# Create a new instance of the Chrome driver
service = Service('/opt/homebrew/bin/chromedriver')  # Update with your path to chromedriver
driver = webdriver.Chrome(service=service, options=chrome_options)

# Function to create a listing
def create_listing(index):
    driver.get(url)
    time.sleep(2)  # Wait for the page to load

    # Debugging output
    print("Current URL:", driver.current_url)
    print("Page Source:", driver.page_source)

    # Click on "I am a space lender" button
    try:
        lender_button = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'I am a space lender')]"))
        )
        lender_button.click()
        print("Clicked on 'I am a space lender' button.")
        time.sleep(2)  # Wait for the CAS login page to load
    except Exception as e:
        print(f"Error finding 'I am a space lender' button: {e}")
        return  # Exit the function if the button is not found

    # Now handle CAS login
    try:
        # Wait for the CAS login page to load
        WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located((By.NAME, 'username'))  # Adjust based on the actual input name
        )

        # Enter CAS credentials
        username = os.getenv('CAS_USERNAME')  # Replace with your CAS username
        password = os.getenv('CAS_PASSWORD')  # Replace with your CAS password
        print(f"Logging in with username: {username}")
        
        driver.find_element(By.NAME, 'username').send_keys(username)
        driver.find_element(By.NAME, 'password').send_keys(password)
        driver.find_element(By.NAME, 'submit').click()  # Adjust the selector as needed

        time.sleep(2)  # Wait for the lender dashboard to load after login
        print("Logged in successfully.")
    except Exception as e:
        print(f"Error during CAS login: {e}")
        return  # Exit the function if login fails

    # Wait for the "Add Storage Space" button to be clickable
    try:
        add_storage_button = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Add Storage Space')]"))
        )
        add_storage_button.click()
        print("Clicked on 'Add Storage Space' button.")
    except Exception as e:
        print(f"Error finding 'Add Storage Space' button: {e}")
        print("Current URL:", driver.current_url)
        print("Page Source:", driver.page_source)
        return  # Exit the function if the button is not found

    time.sleep(2)  # Wait for the modal to open

    # Fill out the Create Listing form
    title = f"Stress Test Storage {index + 1}"
    cost = 10.00
    sq_ft = 10
    latitude = 40.3481639 + (index * 0.001)
    longitude = -74.6621893 + (index * 0.001)
    description = "A description of the listing."
    image_url = "https://res.cloudinary.com/ddsxhjlvh/image/upload/v1746723021/lfjhm2tkubxofqnbu0d2.jpg"
    owner_id = f"ct{index + 1:04d}"
    address = "Hamilton Hall, University Place, Princeton, Mercer County, New Jersey, 08540, United States"
    start_date = "2024-01-01"
    end_date = "2024-12-31"

    # Fill in the form fields
    driver.find_element(By.NAME, "title").send_keys(title)
    driver.find_element(By.NAME, "cost").send_keys(str(cost))
    driver.find_element(By.NAME, "sq_ft").send_keys(str(sq_ft))
    driver.find_element(By.NAME, "latitude").send_keys(str(latitude))
    driver.find_element(By.NAME, "longitude").send_keys(str(longitude))
    driver.find_element(By.NAME, "description").send_keys(description)
    driver.find_element(By.NAME, "image_url").send_keys(image_url)
    driver.find_element(By.NAME, "owner_id").send_keys(owner_id)
    driver.find_element(By.NAME, "address").send_keys(address)
    driver.find_element(By.NAME, "start_date").send_keys(start_date)
    driver.find_element(By.NAME, "end_date").send_keys(end_date)

    # Submit the form
    driver.find_element(By.XPATH, "//button[contains(text(), 'Create Listing')]").click()
    print("Submitted the Create Listing form.")
    time.sleep(2)  # Wait for the submission to process

# Main function to simulate multiple users
def simulate_users(num_users):
    for i in range(num_users):
        create_listing(i)

# Function to log in with CAS
def login_with_cas(driver, username, password):
    driver.get('https://fed.princeton.edu/cas/login')  # Replace with your CAS login URL
    time.sleep(2)  # Wait for the page to load

    # Fill in the username and passwords fields
    driver.find_element(By.NAME, 'username').send_keys(username)
    driver.find_element(By.NAME, 'password').send_keys(password)
    driver.find_element(By.NAME, 'submit').click()  # Adjust the selector as needed

    time.sleep(2)  # Wait for login to complete

# Main execution
if __name__ == "__main__":
    username = os.getenv('CAS_USERNAME')  # Replace with your CAS username
    password = os.getenv('CAS_PASSWORD')  # Replace with your CAS password

    login_with_cas(driver, username, password)

    # Loop to create multiple listings
    for i in range(total_iterations * num_listings):
        create_listing(i)

    driver.quit()  # Close the browser