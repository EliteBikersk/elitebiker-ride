-- =====================================================================
-- EliteBiker Ride – 11. 11. 2026
-- Organizátor môže jazdu po vytvorení upraviť (čas, stretko, trasa, popis…).
-- =====================================================================
create or replace function private.ride_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.host := coalesce(auth.uid(), new.host);
    new.created_at := now();
    if new.starts_at < now() - interval '15 minutes' then
      raise exception 'Jazda nemôže začínať v minulosti.' using errcode = '22023';
    end if;
    if new.starts_at > now() + interval '400 days' then
      raise exception 'Jazdu môžeš naplánovať najviac rok dopredu.' using errcode = '22023';
    end if;
    if new.ends_at - new.starts_at < interval '30 minutes' or new.ends_at - new.starts_at > interval '32 days' then
      raise exception 'Jazda musí trvať od 30 minút do 31 dní.' using errcode = '22023';
    end if;
    perform private.hit('ride', 15, interval '1 day');
  else
    new.id := old.id; new.host := old.host; new.created_at := old.created_at;
    if old.ends_at < now() then
      raise exception 'Skončenú jazdu už nemôžeš upraviť.' using errcode = '22023';
    end if;
    if new.starts_at is distinct from old.starts_at or new.ends_at is distinct from old.ends_at then
      if new.starts_at is distinct from old.starts_at and new.starts_at < now() - interval '15 minutes' then
        raise exception 'Jazda nemôže začínať v minulosti.' using errcode = '22023';
      end if;
      if new.starts_at > now() + interval '400 days' then
        raise exception 'Jazdu môžeš naplánovať najviac rok dopredu.' using errcode = '22023';
      end if;
      if new.ends_at - new.starts_at < interval '30 minutes' or new.ends_at - new.starts_at > interval '32 days' then
        raise exception 'Jazda musí trvať od 30 minút do 31 dní.' using errcode = '22023';
      end if;
    end if;
    if new.max_people is not null and new.max_people is distinct from old.max_people
       and new.max_people < (select count(*) from public.ride_participants p where p.ride_id = new.id) then
      raise exception 'Na jazdu sa už prihlásilo viac ľudí, ako je nový limit.' using errcode = '22023';
    end if;
    -- iný čas alebo miesto: počasie sa skontroluje odznova
    if new.starts_at is distinct from old.starts_at or new.ends_at is distinct from old.ends_at
       or new.meet_lat is distinct from old.meet_lat or new.meet_lng is distinct from old.meet_lng then
      delete from public.ride_weather_alerts w where w.ride_id = new.id;
    end if;
    if auth.uid() is not null then perform private.hit('ride_edit', 60, interval '1 hour'); end if;
  end if;
  if new.visibility = 'public' and (tg_op = 'INSERT' or old.visibility <> 'public')
     and (select count(*) from public.rides r where r.host = new.host and r.visibility = 'public' and r.ends_at > now() and r.id <> new.id) >= 5 then
    raise exception 'Naraz môžeš mať najviac 5 verejných jázd.' using errcode = 'P0001';
  end if;
  new.allow_invites := new.visibility <> 'private';
  return new;
end $$;

grant update (title, note, max_people, link_url, visibility, type, starts_at, ends_at, meet_lat, meet_lng, meet_label,
              route, distance_km, elevation_m, pace, trails) on public.rides to authenticated;
