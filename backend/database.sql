-- Drop existing tables in reverse order of dependencies
DROP TABLE IF EXISTS storage_requests;
DROP TABLE IF EXISTS storage_interests;
DROP TABLE IF EXISTS storage_listings;
DROP TABLE IF EXISTS users;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    netid VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    user_type VARCHAR(20) CHECK (user_type IN ('renter', 'lender')) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create storage listings table
CREATE TABLE IF NOT EXISTS storage_listings (
    listing_id SERIAL PRIMARY KEY,
    owner_id INTEGER REFERENCES users(user_id),
    location VARCHAR(200) NOT NULL,
    total_sq_ft INTEGER NOT NULL,
    cost_per_month DECIMAL(10,2) NOT NULL,
    description TEXT,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_cost CHECK (cost_per_month > 0),
    CONSTRAINT valid_space CHECK (total_sq_ft > 0)
);

-- Create storage interests table
CREATE TABLE IF NOT EXISTS storage_interests (
    interest_id SERIAL PRIMARY KEY,
    listing_id INTEGER REFERENCES storage_listings(listing_id),
    renter_id INTEGER REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(listing_id, renter_id)
);

-- Create storage requests table
CREATE TABLE IF NOT EXISTS storage_requests (
    request_id SERIAL PRIMARY KEY,
    listing_id INTEGER REFERENCES storage_listings(listing_id),
    renter_id INTEGER REFERENCES users(user_id),
    sq_ft_requested INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) CHECK (status IN ('pending', 'active', 'completed', 'cancelled')) DEFAULT 'pending',
    CONSTRAINT valid_sq_ft CHECK (sq_ft_requested > 0)
);

-- Insert mock data
INSERT INTO users (netid, name, user_type) VALUES
    ('dh3163', 'Diya Hundiwala', 'renter'),
    ('lender1', 'Alice Johnson', 'lender'),
    ('lender2', 'Bob Wilson', 'lender'),
    ('renter2', 'Jane Doe', 'renter'),
    ('renter3', 'Charlie Brown', 'renter');

-- Insert mock storage listings
INSERT INTO storage_listings (owner_id, location, total_sq_ft, cost_per_month, description, is_available) VALUES
    ((SELECT user_id FROM users WHERE netid = 'lender1'), 'Princeton University Campus', 200, 75.00, 'Secure storage near campus', true),
    ((SELECT user_id FROM users WHERE netid = 'lender2'), 'Nassau Street Storage', 150, 60.00, 'Climate controlled storage', true);

-- Add some mock interests
INSERT INTO storage_interests (listing_id, renter_id)
SELECT listing_id, (SELECT user_id FROM users WHERE netid = 'dh3163')
FROM storage_listings
WHERE location = 'Princeton University Campus';

-- Add active rentals for dh3163
INSERT INTO storage_requests (listing_id, renter_id, sq_ft_requested, status, created_at)
VALUES
    (1, (SELECT user_id FROM users WHERE netid = 'dh3163'), 50, 'active', CURRENT_TIMESTAMP - INTERVAL '10 days'),
    (2, (SELECT user_id FROM users WHERE netid = 'dh3163'), 75, 'active', CURRENT_TIMESTAMP - INTERVAL '5 days');

-- Add completed rentals for dh3163
INSERT INTO storage_requests (listing_id, renter_id, sq_ft_requested, status, created_at)
VALUES
    (1, (SELECT user_id FROM users WHERE netid = 'dh3163'), 100, 'completed', CURRENT_TIMESTAMP - INTERVAL '90 days'),
    (2, (SELECT user_id FROM users WHERE netid = 'dh3163'), 60, 'completed', CURRENT_TIMESTAMP - INTERVAL '60 days');
