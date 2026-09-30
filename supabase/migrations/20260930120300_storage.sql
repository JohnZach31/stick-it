-- =====================================================================
-- Storage: one PRIVATE bucket, "media"
--
-- Paths are opaque (a/<asset-id>/<filename>): media URLs shown to public share viewers must not
-- reveal user or board ids. Access is decided by the `assets` table, not by path secrecy:
--   * upload  - only to a path the server itself issued (create_asset), for a `pending` asset the
--               caller owns, on a board the caller can currently edit. Viewers can't upload.
--   * read    - whoever can_read_asset() (owner, board member, or member of a board using it).
--   * delete  - only your own pending/failed uploads (cleanup). Everything else is removed by the
--               service-role garbage collector, never by a browser.
--   * update  - nobody (no overwriting an existing file).
-- Public share viewers never touch Storage directly: the resolve-share Edge Function hands out
-- short-lived signed URLs for exactly the assets a share includes.
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', false, 52428800, array[
  'image/jpeg','image/png','image/webp','image/gif',
  'audio/webm','audio/mp4','audio/mpeg','audio/ogg','audio/wav','audio/aac','audio/x-m4a',
  'video/mp4','video/webm','video/quicktime'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy media_read on storage.objects for select to authenticated
  using (bucket_id = 'media'
         and exists (select 1 from public.assets a
                      where a.storage_path = name and public.can_read_asset(a.id)));

create policy media_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'media'
              and exists (select 1 from public.assets a
                           where a.storage_path = name
                             and a.owner_id = (select auth.uid())
                             and a.status = 'pending'
                             and a.board_id is not null
                             and public.can_edit_board(a.board_id)));

create policy media_delete on storage.objects for delete to authenticated
  using (bucket_id = 'media'
         and exists (select 1 from public.assets a
                      where a.storage_path = name
                        and a.owner_id = (select auth.uid())
                        and a.status in ('pending', 'failed')));
