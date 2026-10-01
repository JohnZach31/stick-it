-- Photo strips (and postcards) are board objects like any other; the only server change they need is that the pictures inside a
-- strip count as that object's assets, so sharing, access checks and the garbage collector see them (a picture used by a strip is
-- never collected, even if the standalone photo it came from is deleted). Everything else is unchanged.
create or replace function public.sync_objects(p_board uuid, p_upserts jsonb default '[]'::jsonb, p_deletes jsonb default '[]'::jsonb)
returns jsonb
language plpgsql set search_path = public as $$
declare
  item    jsonb;
  oid     uuid;
  cur     public.board_objects;
  base    bigint;
  newv    bigint;
  d       jsonb;
  results jsonb := '[]'::jsonb;
  deleted jsonb := '[]'::jsonb;
  delid   uuid;
  n       int;
  roles   text[] := array['primary','attached','poster','cutout'];
  keys    text[] := array['assetId','attachedAssetId','posterAssetId','cutoutAssetId'];
  i       int;
  ref     text;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED' using errcode = '28000'; end if;
  if jsonb_typeof(p_upserts) is distinct from 'array' or jsonb_array_length(p_upserts) > 200
     or jsonb_typeof(p_deletes) is distinct from 'array' or jsonb_array_length(p_deletes) > 500 then
    raise exception 'BAD_REQUEST' using errcode = '22023';
  end if;

  for item in select value from jsonb_array_elements(p_upserts) loop
    oid := null;
    begin
      oid  := (item ->> 'id')::uuid;
      base := nullif(item ->> 'base_version', '')::bigint;
      d    := coalesce(item -> 'data', '{}'::jsonb);

      select * into cur from public.board_objects where id = oid;    -- RLS: only rows on readable boards

      if not found then
        insert into public.board_objects (id, board_id, type, x, y, width, height, rotation, z_index, data)
        values (oid, p_board, item ->> 'type',
                (item ->> 'x')::double precision, (item ->> 'y')::double precision,
                nullif(item ->> 'width', '')::double precision,
                nullif(item ->> 'height', '')::double precision,
                nullif(item ->> 'rotation', '')::double precision,
                coalesce(nullif(item ->> 'z_index', '')::int, 0), d)
        returning version into newv;
      elsif base is null or cur.version <> base then
        results := results || jsonb_build_array(jsonb_build_object(
          'id', oid, 'status', 'conflict', 'version', cur.version,
          'server', jsonb_build_object(
            'id', cur.id, 'board_id', cur.board_id, 'type', cur.type, 'x', cur.x, 'y', cur.y,
            'width', cur.width, 'height', cur.height, 'rotation', cur.rotation, 'z_index', cur.z_index,
            'data', cur.data, 'version', cur.version, 'deleted_at', cur.deleted_at, 'updated_at', cur.updated_at)));
        continue;
      else
        update public.board_objects
           set board_id  = p_board,
               x         = (item ->> 'x')::double precision,
               y         = (item ->> 'y')::double precision,
               width     = nullif(item ->> 'width', '')::double precision,
               height    = nullif(item ->> 'height', '')::double precision,
               rotation  = nullif(item ->> 'rotation', '')::double precision,
               z_index   = coalesce(nullif(item ->> 'z_index', '')::int, 0),
               data      = d,
               deleted_at = null                 -- writing an object brings it back (undo of a delete)
         where id = oid
        returning version into newv;
        get diagnostics n = row_count;
        if n = 0 then                             -- RLS filtered the row: the caller may not edit it
          results := results || jsonb_build_array(jsonb_build_object('id', oid, 'status', 'denied'));
          continue;
        end if;
      end if;

      -- keep the object -> asset references in step with the object's data
      delete from public.object_assets where object_id = oid;
      for i in 1 .. array_length(keys, 1) loop
        ref := d ->> keys[i];
        if ref is not null and ref <> '' then
          insert into public.object_assets (object_id, asset_id, role) values (oid, ref::uuid, roles[i])
          on conflict do nothing;
        end if;
      end loop;

      -- photo strips keep their pictures as data.frames[].assetId: each one is an 'attached' reference, in strip order
      if jsonb_typeof(d -> 'frames') = 'array' then
        i := 0;
        for ref in select f ->> 'assetId' from jsonb_array_elements(d -> 'frames') as f limit 6 loop
          i := i + 1;
          if ref is not null and ref <> '' then
            insert into public.object_assets (object_id, asset_id, role, sort_order) values (oid, ref::uuid, 'attached', i)
            on conflict do nothing;
          end if;
        end loop;
      end if;

      results := results || jsonb_build_array(jsonb_build_object('id', oid, 'status', 'ok', 'version', newv));
    exception
      when insufficient_privilege or unique_violation or foreign_key_violation then
        results := results || jsonb_build_array(jsonb_build_object('id', oid, 'status', 'denied'));
      when check_violation or data_exception or invalid_text_representation or not_null_violation then
        results := results || jsonb_build_array(jsonb_build_object('id', oid, 'status', 'invalid', 'error', sqlerrm));
    end;
  end loop;

  for delid in select value::uuid from jsonb_array_elements_text(p_deletes) loop
    update public.board_objects set deleted_at = now()
     where id = delid and board_id = p_board and deleted_at is null;
    get diagnostics n = row_count;
    if n > 0 then deleted := deleted || to_jsonb(delid); end if;
  end loop;

  return jsonb_build_object('results', results, 'deleted', deleted);
end $$;
