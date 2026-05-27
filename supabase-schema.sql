-- ════════════════════════════════════════════════════════
--  盼盼睫研 CRM · Supabase Schema
--  在 Supabase Dashboard > SQL Editor 中執行此檔案
-- ════════════════════════════════════════════════════════

-- 啟用 UUID 擴充
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 1. clients ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clients (
  id          TEXT PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  nickname    TEXT DEFAULT '',
  gender      TEXT DEFAULT '女',
  age         INTEGER,
  phone       TEXT DEFAULT '',
  birthday    DATE,
  overseas    BOOLEAN DEFAULT FALSE,
  location    TEXT DEFAULT '台中',
  source      TEXT DEFAULT '',
  note        TEXT DEFAULT '',
  tags        JSONB DEFAULT '[]',
  services    JSONB DEFAULT '[]',
  line_url    TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. records ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS records (
  id          TEXT PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id   TEXT REFERENCES clients(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  service     TEXT DEFAULT '',
  amount      INTEGER DEFAULT 0,
  note        TEXT DEFAULT '',
  tags        JSONB DEFAULT '[]',
  next_date   DATE,
  payment     TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. coupons ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coupons (
  id          TEXT PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id   TEXT REFERENCES clients(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  description TEXT DEFAULT '',
  amount      INTEGER DEFAULT 0,
  issued      DATE,
  validity    TEXT DEFAULT '1y',
  status      TEXT DEFAULT 'unused',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 4. expenses ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expenses (
  id          TEXT PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  category    TEXT NOT NULL,
  item        TEXT NOT NULL,
  date        DATE NOT NULL,
  amount      INTEGER DEFAULT 0,
  channel     TEXT DEFAULT '',
  note        TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 5. kv_store（config / tagbank / sources / reminded）──
CREATE TABLE IF NOT EXISTS kv_store (
  key         TEXT NOT NULL,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  value       JSONB,
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (key, user_id)
);

-- ════════════════════════════════════════════════════════
--  Row Level Security（重要！確保資料隔離）
-- ════════════════════════════════════════════════════════

ALTER TABLE clients   ENABLE ROW LEVEL SECURITY;
ALTER TABLE records   ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons   ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses  ENABLE ROW LEVEL SECURITY;
ALTER TABLE kv_store  ENABLE ROW LEVEL SECURITY;

-- clients
CREATE POLICY "users see own clients"   ON clients   FOR ALL USING (auth.uid() = user_id);
-- records
CREATE POLICY "users see own records"   ON records   FOR ALL USING (auth.uid() = user_id);
-- coupons
CREATE POLICY "users see own coupons"   ON coupons   FOR ALL USING (auth.uid() = user_id);
-- expenses
CREATE POLICY "users see own expenses"  ON expenses  FOR ALL USING (auth.uid() = user_id);
-- kv_store
CREATE POLICY "users see own kv"        ON kv_store  FOR ALL USING (auth.uid() = user_id);

-- ════════════════════════════════════════════════════════
--  updated_at 自動更新 trigger
-- ════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_clients_updated
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ════════════════════════════════════════════════════════
--  Indexes（加速查詢）
-- ════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_clients_user   ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_records_client ON records(client_id);
CREATE INDEX IF NOT EXISTS idx_records_date   ON records(date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_cat   ON expenses(category);
