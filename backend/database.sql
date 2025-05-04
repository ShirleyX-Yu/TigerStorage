-- TigerStorage Database Schema

-- Storage Listings Table
CREATE TABLE IF NOT EXISTS storage_listings (
    listing_id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    address VARCHAR(255),
    cost NUMERIC,
    sq_ft INTEGER,
    description TEXT,
    latitude FLOAT,
    longitude FLOAT,
    start_date DATE,
    end_date DATE,
    image_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    owner_id VARCHAR(255),
    remaining_space INTEGER,
    is_available BOOLEAN DEFAULT TRUE,
    hall_name VARCHAR(255)
);

-- Interested Listings Table
CREATE TABLE IF NOT EXISTS interested_listings (
    interest_id SERIAL PRIMARY KEY,
    listing_id INTEGER REFERENCES storage_listings(listing_id) ON DELETE CASCADE,
    lender_username VARCHAR(255) NOT NULL,
    renter_username VARCHAR(255) NOT NULL,
    square_feet INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'pending',
    UNIQUE(listing_id, renter_username)
);

-- Reservation Requests Table
CREATE TABLE IF NOT EXISTS reservation_requests (
    request_id SERIAL PRIMARY KEY,
    listing_id INTEGER REFERENCES storage_listings(listing_id) ON DELETE CASCADE,
    renter_username VARCHAR(255) NOT NULL,
    requested_space INTEGER NOT NULL,
    approved_space INTEGER,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

-- Reported Listings Table
CREATE TABLE IF NOT EXISTS reported_listings (
    report_id SERIAL PRIMARY KEY,
    listing_id INTEGER REFERENCES storage_listings(listing_id) ON DELETE CASCADE,
    lender_id VARCHAR(255),
    renter_id VARCHAR(255),
    reason TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Lender Reviews Table
CREATE TABLE IF NOT EXISTS lender_reviews (
    review_id SERIAL PRIMARY KEY,
    lender_username VARCHAR(255) NOT NULL,
    renter_username VARCHAR(255) NOT NULL,
    request_id INTEGER REFERENCES reservation_requests(request_id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_storage_listings_owner ON storage_listings(owner_id);
CREATE INDEX IF NOT EXISTS idx_interested_listings_renter ON interested_listings(renter_username);
CREATE INDEX IF NOT EXISTS idx_reservation_requests_renter ON reservation_requests(renter_username);
CREATE INDEX IF NOT EXISTS idx_reported_listings_status ON reported_listings(status);
CREATE INDEX IF NOT EXISTS idx_lender_reviews_lender ON lender_reviews(lender_username);

-- Comments for documentation
COMMENT ON TABLE storage_listings IS 'Stores all storage space listings';
COMMENT ON TABLE interested_listings IS 'Tracks which renters are interested in which listings';
COMMENT ON TABLE reservation_requests IS 'Manages storage space reservation requests';
COMMENT ON TABLE reported_listings IS 'Tracks reported problematic listings';
COMMENT ON TABLE lender_reviews IS 'Stores reviews given by renters to lenders';