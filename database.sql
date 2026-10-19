-- Execute no SQL Editor do Supabase.
create extension if not exists pgcrypto;

create table if not exists public.admin_users (
    user_id uuid primary key references auth.users(id) on delete cascade,
    created_at timestamptz not null default now()
);

create or replace function public.is_dn_admin()
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$ select exists (select 1 from public.admin_users where user_id = auth.uid()); $$;

create table if not exists public.portfolio (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    style text not null,
    size text not null default '',
    body_part text not null default '',
    image_url text not null,
    is_published boolean not null default true,
    sort_order integer not null default 0,
    created_at timestamptz not null default now()
);
alter table public.portfolio add column if not exists description text not null default '';

create table if not exists public.availability (
    date date primary key,
    is_available boolean not null,
    updated_at timestamptz not null default now()
);

create table if not exists public.profile (
    id integer primary key default 1 check (id = 1),
    display_name text not null default 'Duda Neves',
    bio text not null default '',
    photo_url text not null default '',
    updated_at timestamptz not null default now()
);
insert into public.profile (id) values (1) on conflict (id) do nothing;

insert into public.portfolio (title, style, size, body_part, image_url, sort_order)
select v.title, v.style, v.size, v.body_part, v.image_url, v.sort_order
from (values
  ('Jesus Cristo','Realismo','25 cm','Braço','assets/img1.jpg',10),
  ('Leoa e Filhotes','Fine line','20 cm','Braço','assets/img2.jpg',20),
  ('São Miguel Arcanjo','Realismo','22 cm','Panturrilha','assets/img3.jpg',30),
  ('Flores e Borboletas','Fine Line','35 cm','Braço','assets/img4.jpg',40),
  ('Naruto e Kurama','Anime','22 cm','Braço','assets/img5.jpg',50),
  ('Floral','Fine Line','25 cm','Costela','assets/img6.jpg',60),
  ('Kanji Amor (Ai)','Caligrafia Oriental','8 cm','Cintura','assets/img7.jpg',70),
  ('Raízes Orgânicas','Blackwork','20 cm','Pescoço','assets/img8.jpg',80)
) as v(title, style, size, body_part, image_url, sort_order)
where not exists (select 1 from public.portfolio p where p.title = v.title);

create table if not exists public.orders (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    phone text not null,
    style text not null,
    size_cm integer not null,
    body_part text not null,
    preferred_date date not null,
    idea text not null default '',
    status text not null default 'novo' check (status in ('novo','em_conversa','confirmado','recusado','concluido')),
    created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;
alter table public.portfolio enable row level security;
alter table public.availability enable row level security;
alter table public.profile enable row level security;
alter table public.orders enable row level security;

drop policy if exists "admin can read own membership" on public.admin_users;
create policy "admin can read own membership" on public.admin_users for select to authenticated using (user_id = auth.uid());

drop policy if exists "published portfolio is public" on public.portfolio;
create policy "published portfolio is public" on public.portfolio for select to anon, authenticated using (is_published or public.is_dn_admin());
drop policy if exists "admins manage portfolio" on public.portfolio;
create policy "admins manage portfolio" on public.portfolio for all to authenticated using (public.is_dn_admin()) with check (public.is_dn_admin());

drop policy if exists "availability is public" on public.availability;
create policy "availability is public" on public.availability for select to anon, authenticated using (true);
drop policy if exists "admins manage availability" on public.availability;
create policy "admins manage availability" on public.availability for all to authenticated using (public.is_dn_admin()) with check (public.is_dn_admin());

drop policy if exists "profile is public" on public.profile;
create policy "profile is public" on public.profile for select to anon, authenticated using (true);
drop policy if exists "admins manage profile" on public.profile;
create policy "admins manage profile" on public.profile for all to authenticated using (public.is_dn_admin()) with check (public.is_dn_admin());

drop policy if exists "visitors can submit requests" on public.orders;
create policy "visitors can submit requests" on public.orders for insert to anon, authenticated with check (status = 'novo');
drop policy if exists "admins read requests" on public.orders;
create policy "admins read requests" on public.orders for select to authenticated using (public.is_dn_admin());
drop policy if exists "admins update requests" on public.orders;
create policy "admins update requests" on public.orders for update to authenticated using (public.is_dn_admin()) with check (public.is_dn_admin());
drop policy if exists "admins delete requests" on public.orders;
create policy "admins delete requests" on public.orders for delete to authenticated using (public.is_dn_admin());

grant select on public.portfolio, public.availability, public.profile to anon, authenticated;
grant insert, update, delete on public.portfolio, public.availability, public.profile to authenticated;
grant insert on public.orders to anon, authenticated;
grant select, update, delete on public.orders to authenticated;
grant select on public.admin_users to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tattoo-portfolio', 'tattoo-portfolio', true, 8388608, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
drop policy if exists "portfolio images are public" on storage.objects;
create policy "portfolio images are public" on storage.objects for select to anon, authenticated using (bucket_id = 'tattoo-portfolio');
drop policy if exists "admins upload portfolio images" on storage.objects;
create policy "admins upload portfolio images" on storage.objects for insert to authenticated with check (bucket_id = 'tattoo-portfolio' and public.is_dn_admin());
drop policy if exists "admins update portfolio images" on storage.objects;
create policy "admins update portfolio images" on storage.objects for update to authenticated using (bucket_id = 'tattoo-portfolio' and public.is_dn_admin()) with check (bucket_id = 'tattoo-portfolio' and public.is_dn_admin());
drop policy if exists "admins delete portfolio images" on storage.objects;
create policy "admins delete portfolio images" on storage.objects for delete to authenticated using (bucket_id = 'tattoo-portfolio' and public.is_dn_admin());

