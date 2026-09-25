-- Phase 1 of the Base44 -> Neon/Cloudflare migration: the `nexapay_auth_users`
-- table backing auth. Kept separate from `nexapay_users` (the read-only,
-- one-way syncNeon mirror of the Base44 User entity) so the mirror job never
-- clobbers password hashes / sessions.
-- Run this against your Neon database before deploying, e.g.:
--   psql "$DATABASE_URL" -f migrations/0001_auth_users.sql

create extension if not exists pgcrypto;

create table if not exists nexapay_auth_users (
  id                     uuid primary key default gen_random_uuid(),
  email                  text not null unique,
  password_hash          text,                          -- null for Google-only accounts
  email_verified         boolean not null default false,
  full_name              text,
  country                text,
  city                   text,
  phone                  text,

  role                   text not null default 'user'
                           check (role in ('user', 'admin', 'SUPER_ADMIN', 'TENANT_USER')),
  tenant_id              uuid,
  kyc_status             text not null default 'PENDING_PAYMENT',

  google_id              text unique,

  otp_code_hash          text,
  otp_expires_at         timestamptz,
  otp_attempts           integer not null default 0,

  reset_token_hash       text,
  reset_token_expires_at timestamptz,

  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index if not exists nexapay_auth_users_tenant_id_idx on nexapay_auth_users (tenant_id);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists nexapay_auth_users_set_updated_at on nexapay_auth_users;
create trigger nexapay_auth_users_set_updated_at
  before update on nexapay_auth_users
  for each row execute function set_updated_at();
