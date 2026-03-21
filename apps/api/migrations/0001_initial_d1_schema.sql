PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  user_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS brokers (
  id TEXT PRIMARY KEY,
  broker TEXT NOT NULL,
  currency TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_brokers_user_id ON brokers(user_id);

CREATE TABLE IF NOT EXISTS stocks (
  id TEXT PRIMARY KEY,
  symbol TEXT NOT NULL,
  symbol_hash TEXT NOT NULL,
  currency TEXT NOT NULL,
  average_price TEXT,
  stocks_quantity TEXT,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  UNIQUE(user_id, symbol_hash)
);

CREATE INDEX IF NOT EXISTS idx_stocks_user_id ON stocks(user_id);

CREATE TABLE IF NOT EXISTS snapshots (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  symbol_hash TEXT NOT NULL,
  currency TEXT NOT NULL,
  close_price TEXT NOT NULL,
  day_change TEXT NOT NULL,
  day_change_percent TEXT NOT NULL,
  trading_date TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  fx_usdbrl TEXT,
  fx_brlusd TEXT,
  total_value_usd TEXT,
  total_value_brl TEXT,
  UNIQUE(user_id, symbol_hash, trading_date)
);

CREATE INDEX IF NOT EXISTS idx_snapshots_user_date_symbol ON snapshots(user_id, trading_date DESC, symbol_hash ASC);

CREATE TABLE IF NOT EXISTS credit_cards (
  id TEXT PRIMARY KEY,
  bank TEXT NOT NULL,
  bank_hash TEXT NOT NULL,
  date TEXT NOT NULL,
  date_month TEXT NOT NULL,
  currency TEXT NOT NULL,
  value TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  UNIQUE(user_id, bank_hash, date_month)
);

CREATE INDEX IF NOT EXISTS idx_credit_cards_user_id ON credit_cards(user_id);

CREATE TABLE IF NOT EXISTS btg_dividends (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  lancamento TEXT NOT NULL,
  ticker TEXT NOT NULL,
  valor REAL NOT NULL,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(user_id, date, lancamento, ticker, valor)
);

CREATE INDEX IF NOT EXISTS idx_btg_dividends_user_id ON btg_dividends(user_id);

CREATE TABLE IF NOT EXISTS encrypted_dividends (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  encrypted_data TEXT NOT NULL,
  salt TEXT NOT NULL,
  iv TEXT NOT NULL,
  hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(user_id, hash)
);

CREATE INDEX IF NOT EXISTS idx_encrypted_dividends_user_id ON encrypted_dividends(user_id);

CREATE TABLE IF NOT EXISTS total_value_brokers (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  date_month TEXT NOT NULL,
  currency TEXT NOT NULL,
  total_value_in_usd TEXT,
  total_value_in_brl TEXT,
  broker_id TEXT NOT NULL,
  broker_name TEXT NOT NULL,
  broker_currency TEXT NOT NULL,
  broker_user_id TEXT,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  UNIQUE(user_id, broker_id, date_month)
);

CREATE INDEX IF NOT EXISTS idx_total_value_brokers_user_id ON total_value_brokers(user_id);