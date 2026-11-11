-- =====================================================================
-- EliteBiker Ride, 11. 11. 2026
-- Pozvánka odkazom sa uplatní vždy: kód z odkazu sa pri registrácii uloží k účtu
-- a keď si nový biker vyplní meno, server ho hneď spojí do partie s tým, kto ho pozval.
-- (Doteraz kód žil len v prehliadači a stratil sa napríklad pri prechode
--  z Instagramu do Safari alebo pri appke pridanej na plochu iPhonu.)
-- =====================================================================

create or replace function private.redeem_invite_for(p_user uuid, p_code text) returns json
language plpgsql security definer set search_path = public as $$
declare
  i  invites;
  r  rides;
  me uuid := p_user;
begin
  if me is null or p_code is null then return json_build_object('ok', false, 'reason', 'expired'); end if;
  select * into i from invites where code = p_code;
  if not found or i.expires_at <= now() then
    return json_build_object('ok', false, 'reason', 'expired');
  end if;
  if i.inviter = me then
    return json_build_object('ok', false, 'reason', 'self', 'ride_id', i.ride_id);
  end if;
  update friendships set status = 'accepted'
   where (requester = i.inviter and addressee = me) or (requester = me and addressee = i.inviter);
  if not found then
    insert into friendships (requester, addressee, status) values (i.inviter, me, 'accepted') on conflict do nothing;
  end if;
  if i.ride_id is not null then
    select * into r from rides where id = i.ride_id;
    if not found or r.ends_at <= now() then
      return json_build_object('ok', true, 'inviter', i.inviter, 'ride_id', null, 'reason', 'ride_ended');
    end if;
    if r.visibility = 'private' and i.inviter <> r.host then
      return json_build_object('ok', true, 'inviter', i.inviter, 'ride_id', null, 'reason', 'private');
    end if;
    insert into ride_audience (ride_id, user_id, invited_by) values (r.id, me, i.inviter) on conflict do nothing;
    if r.max_people is not null and (select count(*) from ride_participants where ride_id = r.id and user_id <> me) >= r.max_people then
      return json_build_object('ok', true, 'inviter', i.inviter, 'ride_id', r.id, 'reason', 'full');
    end if;
    insert into ride_participants (ride_id, user_id) values (r.id, me) on conflict do nothing;
  end if;
  return json_build_object('ok', true, 'inviter', i.inviter, 'ride_id', i.ride_id);
end $$;
revoke all on function private.redeem_invite_for(uuid, text) from public, anon, authenticated;

create or replace function public.redeem_invite(p_code text) returns json
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Nie si prihlásený.'; end if;
  perform private.hit('redeem', 30, interval '1 hour');
  return private.redeem_invite_for(auth.uid(), p_code);
end $$;

-- keď si nový biker prvýkrát vyplní meno, uplatní sa pozvánka uložená pri registrácii
create or replace function private.profile_invite() returns trigger
language plpgsql security definer set search_path = '' as $$
declare c text;
begin
  if old.display_name is null and new.display_name is not null then
    select u.raw_user_meta_data ->> 'pozvanka' into c from auth.users u where u.id = new.id;
    if c ~ '^[A-Za-z0-9_-]{6,40}$' then
      begin
        perform private.redeem_invite_for(new.id, c);
      exception when others then
        raise warning 'profile_invite: %', sqlerrm;
      end;
    end if;
  end if;
  return null;
end $$;
create trigger profile_invite after update of display_name on public.profiles
  for each row execute function private.profile_invite();
