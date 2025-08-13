-- Initial database setup for LANKA UI
-- This file is used by Docker Compose to initialize the PostgreSQL database

-- Create database if it doesn't exist (handled by POSTGRES_DB env var)

-- Create application user if needed
-- DO $$
-- BEGIN
--     IF NOT EXISTS (SELECT FROM pg_catalog.pg_user WHERE usename = 'lanka_app') THEN
--         CREATE USER lanka_app WITH ENCRYPTED PASSWORD 'change_in_production';
--     END IF;
-- END
-- $$;

-- Create schemas for different modules
CREATE SCHEMA IF NOT EXISTS requirements;
CREATE SCHEMA IF NOT EXISTS architecture; 
CREATE SCHEMA IF NOT EXISTS development;
CREATE SCHEMA IF NOT EXISTS analytics;
CREATE SCHEMA IF NOT EXISTS auth;

-- Grant permissions
-- GRANT USAGE ON SCHEMA requirements TO lanka_app;
-- GRANT USAGE ON SCHEMA architecture TO lanka_app;
-- GRANT USAGE ON SCHEMA development TO lanka_app;
-- GRANT USAGE ON SCHEMA analytics TO lanka_app;
-- GRANT USAGE ON SCHEMA auth TO lanka_app;

-- Enable extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create basic tables for session management (if using PostgreSQL for sessions)
CREATE TABLE IF NOT EXISTS auth.sessions (
    sid VARCHAR(255) PRIMARY KEY,
    sess JSON NOT NULL,
    expire TIMESTAMP(6) NOT NULL
);

-- Create index for session expiration cleanup
CREATE INDEX IF NOT EXISTS sessions_expire_idx ON auth.sessions(expire);

-- Basic user table structure (can be modified based on actual requirements)
CREATE TABLE IF NOT EXISTS auth.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'viewer',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS users_email_idx ON auth.users(email);
CREATE INDEX IF NOT EXISTS users_role_idx ON auth.users(role);
CREATE INDEX IF NOT EXISTS users_active_idx ON auth.users(is_active);

-- Insert default admin user (password: admin123 - change in production!)
INSERT INTO auth.users (email, password_hash, first_name, last_name, role, email_verified)
VALUES ('admin@lanka.com', '$2b$10$rGPdx3xKZLx.qXvEY8F2wu4ycGS7qQj4kcj.aBdL5nF7tNgY8L5eO', 'Admin', 'User', 'admin', true)
ON CONFLICT (email) DO NOTHING;

-- Create notification table for the notification system
CREATE TABLE IF NOT EXISTS analytics.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    data JSONB,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
);

-- Create indexes for notifications
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON analytics.notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_read_idx ON analytics.notifications(read);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON analytics.notifications(created_at);
CREATE INDEX IF NOT EXISTS notifications_expires_at_idx ON analytics.notifications(expires_at);

-- Create cleanup function for expired sessions and notifications
CREATE OR REPLACE FUNCTION cleanup_expired_data()
RETURNS void AS $$
BEGIN
    -- Clean expired sessions
    DELETE FROM auth.sessions WHERE expire < NOW();
    
    -- Clean expired notifications
    DELETE FROM analytics.notifications WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled cleanup (requires pg_cron extension in production)
-- SELECT cron.schedule('cleanup-expired-data', '0 2 * * *', 'SELECT cleanup_expired_data();');