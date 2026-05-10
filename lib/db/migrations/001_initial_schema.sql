-- ============================================================
-- RISHI TERMINAL DATABASE SCHEMA
-- Supabase PostgreSQL
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- USERS & AUTH
-- ============================================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  tier TEXT NOT NULL DEFAULT 'seeker' CHECK (tier IN ('seeker', 'student', 'disciple')),
  tier_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Gamification
  xp INTEGER NOT NULL DEFAULT 0,
  level TEXT NOT NULL DEFAULT 'Seeker',
  streak INTEGER NOT NULL DEFAULT 0,
  last_visit TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  total_predictions INTEGER NOT NULL DEFAULT 0,
  correct_predictions INTEGER NOT NULL DEFAULT 0,
  alpha_score NUMERIC(10,2) NOT NULL DEFAULT 0
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_tier ON users(tier);

-- ============================================================
-- PORTFOLIOS
-- ============================================================

CREATE TABLE portfolios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Main Portfolio',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_portfolios_user ON portfolios(user_id);

-- ============================================================
-- HOLDINGS
-- ============================================================

CREATE TABLE holdings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  shares NUMERIC(15,4) NOT NULL,
  avg_price NUMERIC(15,2) NOT NULL,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(portfolio_id, symbol)
);

CREATE INDEX idx_holdings_portfolio ON holdings(portfolio_id);
CREATE INDEX idx_holdings_symbol ON holdings(symbol);

-- ============================================================
-- WATCHLIST
-- ============================================================

CREATE TABLE watchlist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  notes TEXT,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id, symbol)
);

CREATE INDEX idx_watchlist_user ON watchlist(user_id);
CREATE INDEX idx_watchlist_symbol ON watchlist(symbol);

-- ============================================================
-- ALERTS
-- ============================================================

CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('price_above', 'price_below', 'percent_change', 'volume_spike', 'rishi_score')),
  condition_value NUMERIC(15,2) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Additional metadata
  notification_sent BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB
);

CREATE INDEX idx_alerts_user ON alerts(user_id);
CREATE INDEX idx_alerts_symbol ON alerts(symbol);
CREATE INDEX idx_alerts_active ON alerts(is_active) WHERE is_active = TRUE;

-- ============================================================
-- F&O STRATEGIES (saved strategies)
-- ============================================================

CREATE TABLE fno_strategies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  underlying_symbol TEXT NOT NULL,
  strategy_type TEXT NOT NULL,
  legs JSONB NOT NULL, -- Array of {action, type, strike, premium, lots}
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Metadata
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX idx_fno_strategies_user ON fno_strategies(user_id);
CREATE INDEX idx_fno_strategies_symbol ON fno_strategies(underlying_symbol);

-- ============================================================
-- BACKTEST RESULTS
-- ============================================================

CREATE TABLE backtest_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  strategy_id UUID REFERENCES fno_strategies(id) ON DELETE SET NULL,
  symbol TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  
  -- Results
  total_return NUMERIC(10,2) NOT NULL,
  sharpe_ratio NUMERIC(10,4),
  max_drawdown NUMERIC(10,2),
  win_rate NUMERIC(5,2),
  total_trades INTEGER NOT NULL,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Full results JSONB
  results_data JSONB NOT NULL
);

CREATE INDEX idx_backtest_user ON backtest_results(user_id);
CREATE INDEX idx_backtest_strategy ON backtest_results(strategy_id);

-- ============================================================
-- BADGES
-- ============================================================

CREATE TABLE badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id, badge_id)
);

CREATE INDEX idx_badges_user ON badges(user_id);

-- ============================================================
-- PAYMENT TRANSACTIONS
-- ============================================================

CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  razorpay_order_id TEXT UNIQUE,
  razorpay_payment_id TEXT UNIQUE,
  razorpay_signature TEXT,
  
  amount INTEGER NOT NULL, -- in paise
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL CHECK (status IN ('created', 'pending', 'paid', 'failed', 'refunded')),
  
  tier_purchased TEXT NOT NULL,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  
  metadata JSONB
);

CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_transactions_razorpay_order ON transactions(razorpay_order_id);
CREATE INDEX idx_transactions_status ON transactions(status);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE fno_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE backtest_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Users can read their own data
CREATE POLICY users_select ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY users_update ON users FOR UPDATE USING (auth.uid() = id);

-- Portfolios
CREATE POLICY portfolios_select ON portfolios FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY portfolios_insert ON portfolios FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY portfolios_update ON portfolios FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY portfolios_delete ON portfolios FOR DELETE USING (auth.uid() = user_id);

-- Holdings
CREATE POLICY holdings_select ON holdings FOR SELECT USING (
  EXISTS (SELECT 1 FROM portfolios WHERE portfolios.id = holdings.portfolio_id AND portfolios.user_id = auth.uid())
);
CREATE POLICY holdings_insert ON holdings FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM portfolios WHERE portfolios.id = holdings.portfolio_id AND portfolios.user_id = auth.uid())
);
CREATE POLICY holdings_update ON holdings FOR UPDATE USING (
  EXISTS (SELECT 1 FROM portfolios WHERE portfolios.id = holdings.portfolio_id AND portfolios.user_id = auth.uid())
);
CREATE POLICY holdings_delete ON holdings FOR DELETE USING (
  EXISTS (SELECT 1 FROM portfolios WHERE portfolios.id = holdings.portfolio_id AND portfolios.user_id = auth.uid())
);

-- Similar policies for other tables
CREATE POLICY watchlist_select ON watchlist FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY watchlist_insert ON watchlist FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY watchlist_delete ON watchlist FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY alerts_all ON alerts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY fno_strategies_all ON fno_strategies FOR ALL USING (auth.uid() = user_id);
CREATE POLICY backtest_results_all ON backtest_results FOR ALL USING (auth.uid() = user_id);
CREATE POLICY badges_select ON badges FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY transactions_select ON transactions FOR SELECT USING (auth.uid() = user_id);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER portfolios_updated_at BEFORE UPDATE ON portfolios FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER holdings_updated_at BEFORE UPDATE ON holdings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER fno_strategies_updated_at BEFORE UPDATE ON fno_strategies FOR EACH ROW EXECUTE FUNCTION update_updated_at();