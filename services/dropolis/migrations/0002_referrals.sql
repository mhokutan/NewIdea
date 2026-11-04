-- Friend invites (founder approved 2026-11-04). The server is the ledger: the game only shows what it returns.
-- Invitee: 10 gems once on redeem. Inviter: 20 gems + 500 coins when that friend finishes chapter 1, claimed later.
create table referral_codes (
  user_id text primary key references users(id) on delete cascade,
  code text not null unique,
  created_at text not null
);

-- One row per invited player (a player redeems at most one code).
create table referrals (
  invitee_id text primary key references users(id) on delete cascade,
  inviter_id text not null references users(id) on delete cascade,
  code text not null,
  redeemed_at text not null,
  chapter1_at text
);
create index referrals_inviter on referrals(inviter_id);

-- Earned invite rewards, one per invitee and milestone; claimed_at set once.
create table referral_rewards (
  id text primary key,
  inviter_id text not null references users(id) on delete cascade,
  invitee_id text references users(id) on delete set null,
  milestone text not null,
  coins integer not null,
  gems integer not null,
  created_at text not null,
  claimed_at text
);
create unique index referral_rewards_once on referral_rewards(invitee_id, milestone);
create index referral_rewards_inviter on referral_rewards(inviter_id, claimed_at);

-- Devices that already redeemed a code (SHA-256 of the device id, kept after account deletion against abuse).
create table referral_devices (
  device_hash text primary key,
  redeemed_at text not null
);

-- Every grant (who got what, because of whom, when). Ids are cleared when an account is deleted; amounts stay.
create table referral_ledger (
  id integer primary key autoincrement,
  at text not null,
  kind text not null check (kind in ('redeem_bonus', 'invite_reward')),
  user_id text references users(id) on delete set null,
  other_id text references users(id) on delete set null,
  coins integer not null,
  gems integer not null
);
create index referral_ledger_user on referral_ledger(user_id, kind);
create index referral_ledger_at on referral_ledger(at);
