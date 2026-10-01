-- Premium cosmetics. A note's cosmetic lives in board_objects.data ->> 'cosmetic'. "soup" (Alphabet Soup) is a Premium extra:
-- only an account on the premium plan may SET it (insert, or change from something else). Reading is never restricted, so a free
-- viewer, a collaborator or a share link always shows a soup note made by a Premium owner; a downgraded owner keeps what exists
-- and can still edit its words, but cannot add new ones. No payment is built: the plan column is changed only by the service role.
create function public.board_objects_premium_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  p   text;
begin
  if uid is null then return new; end if;                           -- maintenance / service paths
  if (new.data ->> 'cosmetic') in ('soup')
     and (tg_op = 'INSERT' or (old.data ->> 'cosmetic') is distinct from (new.data ->> 'cosmetic')) then
    select pr.plan into p from public.profiles pr where pr.id = uid;
    if coalesce(p, 'free') <> 'premium' then
      raise exception 'PREMIUM_REQUIRED' using errcode = 'check_violation';
    end if;
  end if;
  return new;
end $$;
create trigger board_objects_premium before insert or update on public.board_objects
  for each row execute function public.board_objects_premium_guard();
revoke all on function public.board_objects_premium_guard() from public, anon, authenticated;
