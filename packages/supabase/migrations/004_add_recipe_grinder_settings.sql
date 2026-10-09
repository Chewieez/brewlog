-- Migration 004: Add grinder_settings to recipes table
ALTER TABLE public.recipes 
ADD COLUMN IF NOT EXISTS grinder_settings JSONB NOT NULL DEFAULT '[]'::jsonb;
