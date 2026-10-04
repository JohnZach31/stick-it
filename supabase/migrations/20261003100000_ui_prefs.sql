-- v0.8.2: per-person interface preferences that follow the account (customised keyboard shortcuts, reading options).
-- One small JSON object, private to its owner like the rest of profile_settings. No secrets belong here; it is capped at 8 kB.
alter table public.profile_settings
  add column ui_prefs jsonb not null default '{}'::jsonb
  check (jsonb_typeof(ui_prefs) = 'object' and pg_column_size(ui_prefs) <= 8192);

grant insert (ui_prefs) on public.profile_settings to authenticated;
grant update (ui_prefs) on public.profile_settings to authenticated;
