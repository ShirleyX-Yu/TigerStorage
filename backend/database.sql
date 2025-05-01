-- Create storage listings table
CREATE TABLE storage_listings (
    listing_id BIGSERIAL PRIMARY KEY,
    location TEXT,
    hall_name VARCHAR(100),
    cost BIGINT,
    cubic_ft BIGINT,
    description TEXT,
    latitude FLOAT,
    longitude FLOAT,
    start_date DATE,
    end_date DATE,
    image_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    address VARCHAR(255),
    owner_id VARCHAR(255),
    remaining_volume BIGINT,
    is_available BOOLEAN DEFAULT TRUE
    is_approved BOOLEAN DEFAULT TRUE
);

-- Create reservation_requests table
CREATE TABLE IF NOT EXISTS reservation_requests (
    request_id BIGSERIAL PRIMARY KEY,
    listing_id BIGINT REFERENCES storage_listings(listing_id) ON DELETE CASCADE,
    renter_username VARCHAR(255) NOT NULL,
    requested_volume FLOAT NOT NULL,
    approved_volume FLOAT,
    status VARCHAR(32) NOT NULL CHECK (status IN (
        'pending', 'approved_full', 'approved_partial', 'rejected', 'cancelled_by_renter', 'expired'
    )),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE listing_reports (
    report_id BIGSERIAL PRIMARY KEY,
    listing_id BIGINT NOT NULL,
    lender_id VARCHAR(255),
    renter_id VARCHAR(255),
    reason VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'pending',
    FOREIGN KEY (listing_id) REFERENCES storage_listings(listing_id) ON DELETE CASCADE
);