-- Migration 003: Add Session Version Column
-- Description: Adds session_version integer column to users for instant multi-device token revocation

ALTER TABLE users ADD COLUMN IF NOT EXISTS session_version INT DEFAULT 1;
