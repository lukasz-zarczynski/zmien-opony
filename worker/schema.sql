-- Season Alert subscribers. Only the push endpoint and a rounded location (~25 km grid cell) are stored.
CREATE TABLE IF NOT EXISTS subscriptions (
  endpoint TEXT PRIMARY KEY,
  lat REAL NOT NULL,
  lon REAL NOT NULL,
  notified_season TEXT,  -- Season already alerted (or already YES at sign-up), e.g. "2026-winter"
  pending_season TEXT,   -- Season whose alert is due but not yet delivered
  checked_on TEXT,       -- UTC date (YYYY-MM-DD) the cell was last evaluated
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS subscriptions_cell ON subscriptions (lat, lon);
CREATE INDEX IF NOT EXISTS subscriptions_pending ON subscriptions (pending_season);
