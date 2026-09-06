-- Migration 002: Align SCA Cupping Attributes with Official Standard (10 Attributes)
-- Adds flavor, uniformity, and clean_cup columns to public.tasting_logs.
-- Preserves clarity for backward compatibility and populates clean_cup from clarity where available.

ALTER TABLE public.tasting_logs
  ADD COLUMN IF NOT EXISTS flavor NUMERIC(3,1) NOT NULL DEFAULT 7.5,
  ADD COLUMN IF NOT EXISTS uniformity NUMERIC(3,1) NOT NULL DEFAULT 10.0,
  ADD COLUMN IF NOT EXISTS clean_cup NUMERIC(3,1) NOT NULL DEFAULT 10.0;

-- Backfill clean_cup with existing clarity score if clarity was customized
UPDATE public.tasting_logs
  SET clean_cup = clarity
  WHERE clarity IS NOT NULL AND clean_cup = 10.0;
