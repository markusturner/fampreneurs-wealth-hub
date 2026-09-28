create extension if not exists pgcrypto;

-- Store a random 32-byte key in the Vault (only if not already present)
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'asset_inventory_ssn_key') then
    perform vault.create_secret(encode(gen_random_bytes(32), 'hex'), 'asset_inventory_ssn_key');
  end if;
end $$;

create or replace function public.encrypt_ssn(p_value text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key text;
begin
  if p_value is null or btrim(p_value) = '' then
    return p_value;
  end if;
  if p_value like 'enc:%' then
    return p_value;
  end if;
  select decrypted_secret into v_key from vault.decrypted_secrets where name = 'asset_inventory_ssn_key' limit 1;
  if v_key is null then
    raise exception 'encryption key missing';
  end if;
  return 'enc:' || encode(pgp_sym_encrypt(p_value, v_key), 'base64');
end;
$$;

create or replace function public.decrypt_ssn(p_value text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key text;
begin
  if p_value is null or p_value not like 'enc:%' then
    return p_value;
  end if;
  select decrypted_secret into v_key from vault.decrypted_secrets where name = 'asset_inventory_ssn_key' limit 1;
  if v_key is null then
    return p_value;
  end if;
  begin
    return pgp_sym_decrypt(decode(substring(p_value from 5), 'base64'), v_key);
  exception when others then
    return p_value;
  end;
end;
$$;

revoke all on function public.encrypt_ssn(text) from public;
revoke all on function public.decrypt_ssn(text) from public;
grant execute on function public.encrypt_ssn(text) to authenticated;
grant execute on function public.decrypt_ssn(text) to authenticated;