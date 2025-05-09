# tests/test_app.py
import pytest
from flask import json
from backend.app import app  # Adjust the import based on your app structure

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

def test_index(client):
    """Test the index route."""
    response = client.get('/')
    assert response.status_code == 200
    assert b'<!DOCTYPE html>' in response.data  # Check for HTML content

def test_create_listing(client):
    """Test creating a new listing."""
    response = client.post('/api/listings', json={
        'title': 'Test Listing',
        'cost': 100,
        'description': 'A test listing',
        'latitude': 40.0,
        'longitude': -74.0,
        'start_date': '2023-01-01',
        'end_date': '2023-01-10',
        'squareFeet': 100
    })
    assert response.status_code == 201
    data = json.loads(response.data)
    assert 'listing_id' in data

def test_create_listing_missing_field(client):
    """Test creating a listing with a missing field."""
    response = client.post('/api/listings', json={
        'title': 'Test Listing',
        'cost': 100,
        'description': 'A test listing',
        'latitude': 40.0,
        'longitude': -74.0,
        'start_date': '2023-01-01',
        'end_date': '2023-01-10'
        # Missing squareFeet
    })
    assert response.status_code == 400
    data = json.loads(response.data)
    assert 'error' in data

def test_get_listings(client):
    """Test getting all listings."""
    response = client.get('/api/listings')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert isinstance(data, list)  # Expect a list of listings

def test_get_listing_by_id(client):
    """Test getting a specific listing by ID."""
    # First create a listing to retrieve
    create_response = client.post('/api/listings', json={
        'title': 'Test Listing',
        'cost': 100,
        'description': 'A test listing',
        'latitude': 40.0,
        'longitude': -74.0,
        'start_date': '2023-01-01',
        'end_date': '2023-01-10',
        'squareFeet': 100
    })
    listing_id = json.loads(create_response.data)['listing_id']

    response = client.get(f'/api/listings/{listing_id}')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['id'] == listing_id

def test_get_listing_by_id_not_found(client):
    """Test getting a listing that does not exist."""
    response = client.get('/api/listings/9999')  # Assuming this ID does not exist
    assert response.status_code == 404
    data = json.loads(response.data)
    assert 'error' in data

def test_update_listing(client):
    """Test updating a listing."""
    # Create a listing to update
    create_response = client.post('/api/listings', json={
        'title': 'Test Listing',
        'cost': 100,
        'description': 'A test listing',
        'latitude': 40.0,
        'longitude': -74.0,
        'start_date': '2023-01-01',
        'end_date': '2023-01-10',
        'squareFeet': 100
    })
    listing_id = json.loads(create_response.data)['listing_id']

    # Update the listing
    response = client.put(f'/api/listings/{listing_id}', json={
        'title': 'Updated Listing',
        'cost': 150,
        'description': 'An updated test listing',
        'latitude': 41.0,
        'longitude': -75.0,
        'start_date': '2023-02-01',
        'end_date': '2023-02-10',
        'squareFeet': 120
    })
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['success'] is True

def test_delete_listing(client):
    """Test deleting a listing."""
    # Create a listing to delete
    create_response = client.post('/api/listings', json={
        'title': 'Test Listing',
        'cost': 100,
        'description': 'A test listing',
        'latitude': 40.0,
        'longitude': -74.0,
        'start_date': '2023-01-01',
        'end_date': '2023-01-10',
        'squareFeet': 100
    })
    listing_id = json.loads(create_response.data)['listing_id']

    response = client.delete(f'/api/listings/{listing_id}')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['success'] is True

def test_delete_listing_not_found(client):
    """Test deleting a listing that does not exist."""
    response = client.delete('/api/listings/9999')  # Assuming this ID does not exist
    assert response.status_code == 404
    data = json.loads(response.data)
    assert 'error' in data

def test_upload_file(client):
    """Test file upload."""
    # Note: This test requires a file to be uploaded. You may need to adjust it based on your setup.
    with open('tests/test_image.jpg', 'wb') as f:
        f.write(b'This is a test image file.')

    with open('tests/test_image.jpg', 'rb') as f:
        response = client.post('/api/upload', data={'file': f})
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'url' in data

def test_debug_session(client):
    """Test the debug session endpoint."""
    response = client.get('/api/debug-session')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert 'session_data' in data

# Add more tests for other routes and functionalities...

if __name__ == '__main__':
    pytest.main()