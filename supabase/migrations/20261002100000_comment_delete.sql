-- Who may delete a comment. Enforced here, in the database, not only by hiding a button.
--   * the author deletes their own comment (while they can still read the board)
--   * the board's owner can delete any comment on that board (moderation), but can never rewrite someone else's words
--   * editors, viewers, strangers and signed-out callers cannot delete other people's comments
-- A deleted comment stays as a row (deleted_at is set) so counts and realtime stay simple; it can not be brought back through the API.

create function public.comments_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then return new; end if;                                     -- maintenance / service paths
  if new.board_id is distinct from old.board_id or new.object_id is distinct from old.object_id
     or new.author_id is distinct from old.author_id or new.created_at is distinct from old.created_at then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if old.deleted_at is not null and new.deleted_at is distinct from old.deleted_at then
    raise exception 'FORBIDDEN' using errcode = '42501';                      -- a deleted comment stays deleted
  end if;
  if old.author_id is not distinct from uid then
    if not public.can_read_board(old.board_id) then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  else
    if not public.is_board_owner(old.board_id) then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
    if new.body is distinct from old.body then raise exception 'FORBIDDEN' using errcode = '42501'; end if;       -- moderation removes, it never edits
  end if;
  return new;
end $$;
create trigger comments_guard before update on public.comments
  for each row execute function public.comments_guard();
revoke all on function public.comments_guard() from public, anon, authenticated;

-- The one call the app uses. Same answer whether the comment is missing, already deleted or not yours to see (nothing to enumerate).
create function public.delete_comment(p_comment uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  c   public.comments;
begin
  if uid is null then raise exception 'NOT_AUTHENTICATED' using errcode = '28000'; end if;
  select * into c from public.comments where id = p_comment;
  if not found or c.deleted_at is not null or not public.can_read_board(c.board_id) then return; end if;
  if c.author_id is distinct from uid and not public.is_board_owner(c.board_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  update public.comments set deleted_at = now() where id = p_comment;
end $$;
revoke all on function public.delete_comment(uuid) from public, anon, authenticated;
grant execute on function public.delete_comment(uuid) to authenticated;
