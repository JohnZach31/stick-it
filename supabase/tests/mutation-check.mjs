// Proves the RLS tests have teeth: re-introduces classic security bugs, one at a time, into a
// temporary copy of the migrations and checks that the test suite FAILS for each of them.
//   node mutation-check.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const migDir = path.join(here, '..', 'migrations');

const mutations = [
  ['boards visible to everyone',            '20260930120100_rls.sql',       'using (public.can_read_board(id));\ncreate policy boards_update_owner', 'using (true);\ncreate policy boards_update_owner'],
  ['anon keeps its default table grants',   '20260930120100_rls.sql',       "execute format('revoke all on public.%I from anon, authenticated', t);", "null;"],
  ['plan column writable by users',         '20260930130000_account_settings.sql', 'grant update (display_name, avatar_source, avatar_style, avatar_color, avatar_emoji) on public.profiles to authenticated;', 'grant update on public.profiles to authenticated;'],
  ['avatar_url writable by browsers',       '20260930130000_account_settings.sql', 'grant update (display_name, avatar_source,', 'grant update (display_name, avatar_url, avatar_source,'],
  ['private settings readable by everyone', '20260930130000_account_settings.sql', 'for select to authenticated\n  using (user_id = (select auth.uid()));\ncreate policy profile_settings_insert', 'for select to authenticated\n  using (true);\ncreate policy profile_settings_insert'],
  ['settings table keeps default grants',   '20260930130000_account_settings.sql', 'revoke all on public.profile_settings from anon, authenticated;', 'select 1;'],
  ['clients can purge accounts',            '20260930130000_account_settings.sql', 'grant execute on function public.purge_user_data(uuid) to service_role;', 'grant execute on function public.purge_user_data(uuid) to service_role, authenticated;'],
  ['garbage collector eats live avatars',   '20260930130000_account_settings.sql', '     and not exists (select 1 from public.profiles p where p.avatar_asset_id = a.id)\n', ''],
  ['anyone can adopt any avatar asset',     '20260930130000_account_settings.sql', 'if not found or a.owner_id <> uid or a.kind', 'if not found or a.kind'],
  ['age flag writable by users',            '20260930150000_legal_compliance.sql', 'alter table public.profiles add column age_attested_at timestamptz;', 'alter table public.profiles add column age_attested_at timestamptz;'+'\n'+'grant update (age_attested_at) on public.profiles to authenticated;'],
  ['marketing audience ignores opt-in',     '20260930160000_age_bands.sql', "where s.marketing_opt_in and u.email is not null and p.age_band = 'adult'", "where u.email is not null and p.age_band = 'adult'"],
  ['copyright reports readable by browsers', '20260930150000_legal_compliance.sql', 'revoke all on public.copyright_reports from anon, authenticated;', 'select 1;'],
  ['age gate does nothing',                 '20260930160000_age_bands.sql', 'if not found or p.age_band is null then', 'if false then'],
  ['children skip parental consent',        '20260930160000_age_bands.sql', "if p.age_band = 'child' and p.parental_consent_status <> 'approved' then", 'if false then'],
  ['the age band can be changed later',     '20260930160000_age_bands.sql', 'if p.age_band is not null then return p; end if;', ''],
  ['age_band writable by browsers',         '20260930160000_age_bands.sql', '-- (no client may write any of these: the profiles update grant lists its columns and none of them is on it)', 'grant update (age_band, parental_consent_status) on public.profiles to authenticated;'],
  ['marketing audience includes minors',    '20260930160000_age_bands.sql', "where s.marketing_opt_in and u.email is not null and p.age_band = 'adult'", 'where s.marketing_opt_in and u.email is not null'],
  ['minors can opt in to marketing',        '20260930160000_age_bands.sql', "raise exception 'MARKETING_NOT_ALLOWED' using errcode = 'P0001';", 'null;'],
  ['clients can approve parental consent',  '20260930160000_age_bands.sql', 'grant execute on function public.parental_consent_set(uuid, text, text, text, text), public.abandoned_accounts(interval) to service_role;', 'grant execute on function public.parental_consent_set(uuid, text, text, text, text), public.abandoned_accounts(interval) to service_role, authenticated;'],
  ['consent records readable by browsers',  '20260930160000_age_bands.sql', 'revoke all on public.parental_consents from anon, authenticated;', 'select 1;'],
  ['editors/viewers can update any object', '20260930120100_rls.sql',       'using (public.can_edit_board(board_id)) with check (public.can_edit_board(board_id));\n\n-- ---- assets', 'using (true) with check (true);\n\n-- ---- assets'],
  ['foreign assets can be attached',        '20260930120000_core_schema.sql', 'and (a.owner_id = (select auth.uid()) or a.board_id = o.board_id))', 'and true)'],
  ['anyone can read any asset',             '20260930130000_account_settings.sql', 'select exists (\n    select 1 from public.assets a\n     where a.id = p_asset', 'select true or exists (\n    select 1 from public.assets a\n     where a.id = p_asset'],
  ['uploads to any path allowed',           '20260930130000_account_settings.sql',    "with check (bucket_id = 'media'\n              and exists", "with check (bucket_id = 'media' or exists"],
  ['resolve_share callable by clients',     '20260930120200_functions.sql',  '  public.accept_invite(text)\n  to authenticated;', '  public.accept_invite(text), public.resolve_share(text)\n  to authenticated;'],
  ['board limit off by one',                '20260930120200_functions.sql',  'if have >= lim then', 'if have > lim then'],
  ['viewers may publish shares',            '20260930130000_account_settings.sql',  "if v_role is null or v_role not in ('owner', 'editor') then", "if v_role is null then"],
  ['strip pictures are not registered',     '20261001120000_paper_objects.sql', "from jsonb_array_elements(d -> 'frames') as f limit 6 loop", "from jsonb_array_elements(d -> 'frames') as f limit 0 loop"],
  ['strip pictures lose their order',       '20261001120000_paper_objects.sql', "values (oid, ref::uuid, 'attached', i)", "values (oid, ref::uuid, 'attached', 0)"],
  ['free accounts can make Alphabet Soup',  '20261001130000_premium_cosmetics.sql', "if coalesce(p, 'free') <> 'premium' then", "if false then"],
  ['premium check skipped on update',       '20261001130000_premium_cosmetics.sql', "and (tg_op = 'INSERT' or (old.data ->> 'cosmetic') is distinct from (new.data ->> 'cosmetic')) then", "and tg_op = 'INSERT' then"],
];

let missed = 0;
for (const [name, file, from, to] of mutations) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stickit-mut-'));
  for (const f of fs.readdirSync(migDir)) fs.copyFileSync(path.join(migDir, f), path.join(tmp, f));
  const target = path.join(tmp, file);
  const src = fs.readFileSync(target, 'utf8').split('\r\n').join('\n');   // tolerate CRLF checkouts
  if (!src.includes(from)) { console.log(`?? cannot apply mutation "${name}" (pattern not found)`); missed++; continue; }
  fs.writeFileSync(target, src.replace(from, to));
  const r = spawnSync('node', [path.join(here, 'run-tests.mjs')], { env: { ...process.env, MIG_DIR: tmp }, encoding: 'utf8' });
  const caught = r.status !== 0;
  const which = (r.stdout.match(/FAIL\s+(.+)/) || [])[1] || (r.stderr || r.stdout).split('\n').find(l => l.includes('failed')) || '';
  console.log(`${caught ? 'caught ' : 'MISSED '} ${name}${caught ? `   <- ${which.slice(0, 90)}` : ''}`);
  if (!caught) missed++;
  fs.rmSync(tmp, { recursive: true, force: true });
}
console.log(missed ? `\n${missed} mutation(s) not caught` : '\nall mutations caught');
process.exit(missed ? 1 : 0);
