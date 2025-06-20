-- Create magic_links table for secure magic link management
CREATE TABLE IF NOT EXISTS magic_links (
    id SERIAL PRIMARY KEY,
    quote_id VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    token_id UUID NOT NULL UNIQUE, -- JWT jti claim
    token_hash VARCHAR(64) NOT NULL UNIQUE, -- SHA256 hash of the actual token
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMP WITH TIME ZONE NULL,
    
    -- Indexes for performance
    INDEX idx_magic_links_quote_id (quote_id),
    INDEX idx_magic_links_email (email),
    INDEX idx_magic_links_token_hash (token_hash),
    INDEX idx_magic_links_expires_at (expires_at),
    INDEX idx_magic_links_used (used),
    
    -- Foreign key constraint (if MasterCustomer table allows it)
    -- FOREIGN KEY (quote_id) REFERENCES MasterCustomer(quote_id) ON DELETE CASCADE
);

-- Create a partial index for active (unused and not expired) tokens
CREATE INDEX IF NOT EXISTS idx_magic_links_active 
ON magic_links (quote_id, email) 
WHERE used = FALSE AND expires_at > NOW();

-- Add row level security (optional - if using Supabase RLS)
-- ALTER TABLE magic_links ENABLE ROW LEVEL SECURITY;

-- Cleanup function to remove expired tokens (run via cron job)
CREATE OR REPLACE FUNCTION cleanup_expired_magic_links() 
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM magic_links 
    WHERE expires_at < NOW() - INTERVAL '7 days'; -- Keep for 7 days after expiry for audit
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Comment on table
COMMENT ON TABLE magic_links IS 'Stores secure magic link tokens for quote access with expiration and usage tracking';
COMMENT ON COLUMN magic_links.token_hash IS 'SHA256 hash of the JWT token for secure lookup without storing the actual token';
COMMENT ON COLUMN magic_links.token_id IS 'Unique identifier from JWT jti claim for token revocation';
COMMENT ON COLUMN magic_links.used IS 'Flag to prevent token reuse - tokens are single-use by default'; 