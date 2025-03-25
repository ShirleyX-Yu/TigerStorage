-- Create sellers table
-- CREATE TABLE sellers (
--     seller_id BIGSERIAL PRIMARY KEY,
--     name VARCHAR(255) NOT NULL,
--     password VARCHAR(255) NOT NULL,
--     email VARCHAR(255) UNIQUE NOT NULL,
--     phone VARCHAR(20),
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- -- Create buyers table
-- CREATE TABLE buyers (
--     buyer_id BIGSERIAL PRIMARY KEY,
--     name VARCHAR(255) NOT NULL,
--     password VARCHAR(255) NOT NULL,
--     email VARCHAR(255) UNIQUE NOT NULL,
--     phone VARCHAR(20),
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- Create storage listings table
CREATE TABLE storage_listings (
    listing_id BIGSERIAL PRIMARY KEY,
    -- seller_id BIGINT REFERENCES sellers(seller_id) ON DELETE CASCADE, add later
    -- title VARCHAR(255) NOT NULL,
    -- description TEXT,
    location TEXT,
    cost BIGINT,
    cubic_ft BIGINT,
    contract_length VARCHAR(255)
    -- is_available BOOLEAN DEFAULT TRUE
    -- available_from DATE, maybe add later
    -- available_to DATE, maybe add later
    -- created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create buyer requests table
-- CREATE TABLE buyer_requests (
--     request_id BIGSERIAL PRIMARY KEY,
--     listing_id BIGINT REFERENCES storage_listings(listing_id) ON DELETE CASCADE,
--     seller_id BIGINT REFERENCES sellers(seller_id) ON DELETE CASCADE,
--     buyer_id BIGINT REFERENCES buyers(buyer_id) ON DELETE CASCADE,
--     status VARCHAR(50) DEFAULT 'pending',
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );
