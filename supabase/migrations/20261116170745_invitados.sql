create table public.invitados (
  id bigint generated always as identity primary key,
  nombre text not null constraint invitados_nombre_length check (char_length(btrim(nombre)) between 2 and 80),
  telefono text not null constraint invitados_telefono_length check (char_length(btrim(telefono)) between 7 and 20),
  email text not null constraint invitados_email_shape check (
    position('@' in email) > 1
    and char_length(email) <= 120
  ),
  creado timestamptz not null default now()
);

create unique index invitados_email_lower_idx on public.invitados (lower(email));

alter table public.invitados enable row level security;

create policy "guests can register"
on public.invitados
for insert
to anon, authenticated
with check (true);
