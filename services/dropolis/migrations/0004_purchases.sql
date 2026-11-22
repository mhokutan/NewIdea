-- dropolis-db, migration 0004 (owner decision 2026-11-21, Dropolis 1.1): in-app purchase ledger.
-- NOT applied on the live database yet: the owner applies it with
--   npx wrangler d1 migrations apply dropolis-db --remote
-- One row per store purchase. transaction_id is the ledger key, unique per platform: iOS the Apple transactionId,
-- Android the Google Play purchaseToken (unique per purchase; the order id is kept in order_id).
-- client_transaction_id is what the game sent and is echoed back. restored = 1: stored without gems (a one time item
-- the player already had, or a transaction whose first owner deleted the account); not new revenue.
-- price_usd: catalog list price before store fees (0 for sandbox and promo codes, null while the price is unknown).
create table purchases (
  id integer primary key autoincrement,
  platform text not null check (platform in ('ios', 'android')),
  transaction_id text not null,
  client_transaction_id text not null,
  order_id text,
  original_transaction_id text,
  user_id text not null references users(id) on delete cascade,
  product_id text not null,
  gems integer not null,
  items text not null,
  sandbox integer not null default 0,
  status text not null default 'granted' check (status in ('granted', 'refunded')),
  price_usd real,
  restored integer not null default 0,
  install_id text,
  created_at text not null,
  refunded_at text,
  unique (platform, transaction_id)
);
create index purchases_user on purchases(user_id, status);
create index purchases_created on purchases(created_at);
create index purchases_original on purchases(original_transaction_id) where original_transaction_id is not null;

-- Deleted accounts: anonymous totals kept for accounting (no user id, no transaction id).
create table purchase_deleted_totals (
  day text not null,
  platform text not null,
  product_id text not null,
  sandbox integer not null,
  is_test integer not null,
  purchases integer not null,
  gems integer not null,
  usd real not null,
  primary key (day, platform, product_id, sandbox, is_test)
);

-- Deleted accounts: SHA-256 of each transaction key, so a recreated account can restore the item but gets no gems.
create table purchase_tombstones (
  tx_hash text primary key,
  created_at text not null
);
