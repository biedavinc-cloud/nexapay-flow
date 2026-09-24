-- Phase 1 of the Base44 -> Neon/Cloudflare migration: the `users` table backing auth.
-- Run this against your Neon database before deploying, e.g.:
--   psql "$DATABASE_URL" -f migrations/0001_users.sql

create extension if not exists pgcrypto;

create table if not exists users (
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

create index if not exists users_tenant_id_idx on users (tenant_id);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists users_set_updated_at on users;
create trigger users_set_updated_at
  before update on users
  for each row execute function set_updated_at();
