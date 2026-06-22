-- ── RandWise Newsletter & Config Tables ─────────────────────────
-- Run this once in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- Creates: newsletter_subscribers, weekly_tips, app_config
-- Sets RLS policies so admin_dashboard.html (anon key) can read/write

-- ── 1. newsletter_subscribers ─────────────────────────────────
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email             text NOT NULL UNIQUE,
  name              text,
  source            text DEFAULT 'website',   -- 'website' | 'app_user_import' | 'manual'
  active            boolean NOT NULL DEFAULT true,
  unsubscribe_token text UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_at        timestamptz NOT NULL DEFAULT now(),
  unsubscribed_at   timestamptz
);

-- Index for fast email lookups
CREATE INDEX IF NOT EXISTS newsletter_subscribers_email_idx
  ON newsletter_subscribers (email);

-- RLS
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Allow anyone to subscribe (needed for landing page sign-up form)
CREATE POLICY "Anyone can subscribe"
  ON newsletter_subscribers FOR INSERT
  WITH CHECK (true);

-- Only authenticated admin reads (anon key reads everything — admin dashboard uses anon key)
-- If you want to restrict further, replace with a service-role check
CREATE POLICY "Anon can read subscribers"
  ON newsletter_subscribers FOR SELECT
  USING (true);

-- Allow anon to update active/unsubscribed_at (for unsubscribe link flow)
CREATE POLICY "Anon can update subscriber status"
  ON newsletter_subscribers FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- ── 2. weekly_tips ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS weekly_tips (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_number int NOT NULL UNIQUE,  -- 1–52
  subject     text NOT NULL,        -- Email subject line
  headline    text NOT NULL,        -- Bold heading in email body
  body        text NOT NULL,        -- Full tip text (plain, newlines preserved)
  cta_text    text DEFAULT 'Open MyRandWise →',
  cta_url     text DEFAULT 'https://myrandwise.co.za',
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE weekly_tips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can read weekly tips"
  ON weekly_tips FOR SELECT
  USING (true);

CREATE POLICY "Anon can insert weekly tips"
  ON weekly_tips FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anon can update weekly tips"
  ON weekly_tips FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- ── 3. app_config ────────────────────────────────────────────
-- Simple key-value store for feature flags (newsletter_enabled, etc.)
CREATE TABLE IF NOT EXISTS app_config (
  key        text PRIMARY KEY,
  value      text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can read app_config"
  ON app_config FOR SELECT
  USING (true);

CREATE POLICY "Anon can upsert app_config"
  ON app_config FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anon can update app_config"
  ON app_config FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Seed newsletter toggle as enabled
INSERT INTO app_config (key, value)
VALUES ('newsletter_enabled', 'true')
ON CONFLICT (key) DO NOTHING;

-- ── Verify ───────────────────────────────────────────────────
SELECT
  table_name,
  (SELECT count(*) FROM information_schema.columns c WHERE c.table_name = t.table_name) AS columns
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN ('newsletter_subscribers', 'weekly_tips', 'app_config')
ORDER BY table_name;
