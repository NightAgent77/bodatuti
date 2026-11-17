create or replace function public.registrar(p_nombre text, p_telefono text, p_email text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nombre text := btrim(p_nombre);
  v_telefono text := btrim(p_telefono);
  v_email text := lower(btrim(p_email));
  v_digits int := length(regexp_replace(v_telefono, '\D', '', 'g'));
  v_existed boolean;
begin
  if v_nombre is null or char_length(v_nombre) < 2 or char_length(v_nombre) > 80 then
    raise exception 'Escribe tu nombre.';
  end if;
  if v_telefono is null or char_length(v_telefono) > 20 or v_digits < 7 or v_digits > 15 then
    raise exception 'Escribe un teléfono válido.';
  end if;
  if v_email is null or char_length(v_email) > 120 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Escribe un email válido.';
  end if;

  select true into v_existed
  from public.invitados
  where lower(email) = v_email;

  if v_existed then
    update public.invitados
      set nombre = v_nombre,
          telefono = v_telefono
      where lower(email) = v_email;
    return jsonb_build_object('ok', true, 'actualizado', true);
  end if;

  insert into public.invitados (nombre, telefono, email)
  values (v_nombre, v_telefono, v_email);
  return jsonb_build_object('ok', true, 'actualizado', false);
end;
$$;

revoke all on function public.registrar(text, text, text) from public;
grant execute on function public.registrar(text, text, text) to anon, authenticated;
