-- Store reviews for all founder apps (founder request 2026-11-09), shown on promovote.com/admin/yorumlar.
-- Apple: public customer reviews feed per country (no key). Google: monthly reviews CSV in the Play reports bucket.
-- No reviewer names or devices are stored: only stars, text, version, country or language, and dates.
create table if not exists store_reviews (
  store text not null,            -- 'app_store' | 'google_play'
  review_id text not null,
  product_id text not null,
  country text,                   -- App Store country (us, tr...) or Google review language (en, tr...)
  rating integer not null,
  title text,
  body text,
  version text,
  reviewed_at text not null,      -- ISO time
  reply text,                     -- developer reply (Google only)
  collected_at text not null,
  primary key (store, review_id)
);
create index if not exists store_reviews_product on store_reviews (product_id, reviewed_at);
