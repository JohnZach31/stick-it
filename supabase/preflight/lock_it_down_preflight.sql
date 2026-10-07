-- READ-ONLY. Safe to run in the Supabase SQL Editor before and after applying 20261009100000_lock_it_down.sql. It changes nothing.
-- Run it BEFORE the migration and again AFTER: the "members" result must be identical, and every invitation must still be listed.

-- 1. who is on each board right now
select b.name as board, m.role, (u.is_anonymous is true) as guest, m.created_at as joined, left(m.user_id::text, 8) as who
from public.board_members m
join public.boards b on b.id = m.board_id
left join auth.users u on u.id = m.user_id
order by b.name, m.role, m.created_at;

-- 2. every invitation link that exists (nothing here shows a token; only a hash is stored)
select b.name as board, i.role, coalesce(i.email, '(anyone with the link)') as for_whom, i.created_at, i.expires_at, i.accepted_at,
       left(i.accepted_by::text, 8) as last_user, i.uses
from public.board_invites i
join public.boards b on b.id = i.board_id
order by b.name, i.created_at;

-- 3. head count per board (compare before / after)
select b.name as board, count(*) as people
from public.board_members m join public.boards b on b.id = m.board_id
group by b.name order by b.name;
