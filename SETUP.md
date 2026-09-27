# Connect accounts and publishing

## Contact email alerts and page organization

Run [migration 013](supabase/migrations/013_contact_notifications.sql) in the Supabase SQL Editor after migration 012. This creates a private notification outbox. A visitor's enquiry still reaches the owner's Inbox if email delivery fails; enabled alerts are queued and retried. The migration does not enable alerts for existing pages by itself.

To send email, verify a sending domain with [Resend](https://resend.com/docs/dashboard/domains/introduction), then set server-only `RESEND_API_KEY` and `CONTACT_EMAIL_FROM` (for example `Verbaspark <notifications@your-domain.example>`) in Vercel. Set a random `CRON_SECRET` of at least 16 characters for the scheduled retry endpoint, and redeploy. Do not put these values in `VITE_` variables or share them in chat. Under **Profile settings → Contact & analytics**, turn on **Email me when a new enquiry arrives**, save, and publish again. The destination is the email address on the signed-in owner account. Submit a test message from a different browser, then verify both the private Inbox and the email. If the sender is not configured yet, leave the toggle off; messages continue to appear in the Inbox.

New enquiries trigger an immediate delivery attempt. A protected daily Vercel cron job retries failures; on Vercel Hobby, cron can run only once a day and is not precisely timed. The database lease prevents simultaneous workers from claiming the same message. Resend idempotency keys reduce duplicate mail during retries, but an uncertain delivery retried after the provider's 24-hour idempotency window can still produce a duplicate. Eight failed attempts leave the message in the Inbox and mark its email alert as failed. See [Vercel cron limits](https://vercel.com/docs/cron-jobs/usage-and-pricing) and [Resend idempotency](https://resend.com/changelog/idempotency-keys).

In the editor, add **Section heading** from **Blocks → Organize** to group content. For an introduction, project, link, or contact card, use **Feature this as the main action** in its Edit panel. Only one visible action is featured. Save and publish to update the live profile. Public images and files now load from access-checked URLs for the published document, so the first photo does not wait for all other assets to receive signed URLs. Offline HTML export still embeds those assets.

For contact forms, analytics and social previews, see [Profile services setup](PROFILE_SERVICES_SETUP.md). Existing projects run only [PROFILE_SERVICES_SETUP.sql](supabase/PROFILE_SERVICES_SETUP.sql), which adds migrations 006–007. These features require server functions; uploading only the static `dist` folder is insufficient.

The editor works locally without configuration. Online features require a Supabase project and web hosting. Basic profiles support static hosting; contact forms, analytics and share metadata also require the server functions described above.

1. For a new Supabase project, run `supabase/INITIAL_SETUP.sql` (migrations 001–005), followed by `supabase/PROFILE_SERVICES_SETUP.sql` (006–007), then migrations 008–011 in order. Existing projects run only migrations not yet applied.
2. Copy `.env.example` to `.env.local`. Set the project URL and **publishable (or legacy anon) key** from Supabase's Connect dialog. Never put a service-role or secret key in a Vite environment variable.
3. In Authentication → URL Configuration, set your deployed Site URL and add your local editor URL (`http://127.0.0.1:5173/editor/`) to allowed redirects. Configure an email sender for production. Email sign-in creates an account if necessary.
4. Restart `npm run dev`. Open `/editor/`, choose **Account & publishing**, request a sign-in link, and follow it. Save a private draft, choose a username, and publish. Public URLs are `/p/username`.
5. Build with `npm run build`. For the complete feature set, follow [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md) to deploy the repository with its `api` handlers and server environment variables; the included `vercel.json` routes public profiles through server-rendered HTML. Static-only hosting can serve basic profiles using an `/editor/index.html` fallback, but does not enable the new server features. A local `127.0.0.1` link is not accessible to other people.

## Data behavior

- Local recovery saves to IndexedDB (up to six recent versions), with localStorage as a fallback. Older local drafts migrate on opening. If neither store can save, edits stay in memory with a persistent error and a backup download action. Clearing site data still removes local copies.
- Signed-in private drafts autosave after a one-second pause. Writes are serialized; network errors retry after five seconds and reconnection retries immediately. Supabase fetches time out after 25 seconds. Unsent changes survive reload through the local recovery queue.
- A previously existing online draft or a different-account local page requires an explicit choice in **Save & recovery**. Database revision checks pause saving if another device changed the draft; no silent last-writer-wins overwrite. Signing in to a new account does not auto-upload the old account's page.
- Recovery supports recent versions, downloadable JSON backups, and JSON import. Backup download embeds accessible cloud photos. If they cannot be fetched while offline, the page data still downloads with an explicit warning to reconnect for a complete photo backup. Keep backups private: they contain your page and images.
- Loading an online draft replaces the local page as one undoable change. Signing out does not erase this device's local page.
- Publish flushes pending autosaves, then publishes exactly that database revision. A simultaneous edit from another device causes a conflict instead of publishing an unexpected version. Draft updates do not change the published snapshot. A failed username claim can still save the private draft.
- One page and username per account. Username uniqueness is enforced in PostgreSQL. Unpublish removes the public snapshot, preserving the draft.
- Uploaded images are content-addressed in a private storage bucket. Owner policies allow draft access; public reads require a published document reference. Published images use a checked proxy with up to five minutes of cache; oversized images use a five-minute signed link. Private draft image links last one hour. Cached images or issued links may remain accessible briefly after unpublishing.
- Images are retained when replaced. In **Account & publishing → Account & data**, a signed-in owner can download a page backup and request account deletion. Deletion removes both private storage buckets, the Auth user, private draft, published page, Inbox messages and statistics through their database cascade. Local recovery data is cleared on the current device; local copies on other devices must be cleared there. The only administrator account cannot delete itself. An interrupted deletion can be retried; already removed files are skipped.

## Verification before opening registration

Local PostgreSQL-compatible tests run all migrations and verify ownership, revision conflicts, idempotent retries and separate publication snapshots. Browser cloud tests exercise the real Supabase client against mocked HTTP responses. These do not validate your remote Supabase deployment. With two test accounts, verify owner isolation, anonymous draft/image restrictions, publish/unpublish, duplicate usernames and email delivery on your final domain. Verify account deletion only with a disposable non-admin account.

Run `npm run test:unit`, `npm run test:browser`, and `npm run test:cloud`. The cloud test runner uses temporary test environment values on port 5174 and does not contact a real Supabase project.

Official references: [email OTP](https://supabase.com/docs/reference/javascript/auth-signinwithotp), [storage policies](https://supabase.com/docs/guides/storage/security/access-control).

## Documents and audio storage

Migration 004 creates the private `page-files` bucket with a 20 MiB server-side per-file limit and an explicit document/audio MIME allowlist. Keep the project-wide storage limit at least 20 MiB. Content-hashed objects are stored under the authenticated owner’s ID; only owners can upload/read draft files, and anonymous reads require a reference in that owner’s published snapshot. Public file links are checked at request time and redirect to a five-minute signed Storage URL; private draft links last one hour. Issued URLs can remain accessible until expiry after unpublishing. Changing the private draft does not change published attachments. Replaced files are retained for recovery and published snapshots; automatic cleanup is not implemented. The editor’s 50 MiB per-page upload budget is not an account-level server quota. Monitor total retained storage separately in Supabase. JSON backup import accepts up to 100 MB.

Local SQL tests cover owner isolation and published/unpublished file access; browser cloud tests mock upload, signed access, and export through the real Supabase SDK. Configure and validate these on your actual project before public use.

Media references: [YouTube embedding](https://support.google.com/youtube/answer/171780?hl=en), [Vimeo unlisted embeds](https://help.vimeo.com/hc/en-us/articles/12426470858001-Embedded-player-displays-This-video-does-not-exist-message), [OpenStreetMap embeds](https://wiki.openstreetmap.org/wiki/Export), [Supabase bucket limits](https://supabase.com/docs/guides/storage/uploads/file-limits).
## Location maps

In a Location block, start typing an address or city and select a suggestion. This saves the address and coordinates together. Public profiles show a lightweight, non-interactive map preview that opens navigation when tapped. Visitors can still use the separate navigation link. Enter coordinates manually under Advanced if search does not find the location. Existing Google Maps or OpenStreetMap embed codes with recognizable coordinates can still place a pin; the heavy iframe is no longer shown on profiles. Editing the address clears the previous coordinates so an old pin cannot be published under a new address.

Address suggestions use the server-side `/api/geocode` endpoint, which queries [Photon](https://github.com/komoot/photon). This route uses the existing Supabase service role, `ANALYTICS_HASH_SECRET`, and `platform_take_limit` setup. Requests are debounced in the editor, limited per visitor, and successful responses are cached. The public map uses a small set of [OpenStreetMap raster tiles](https://operations.osmfoundation.org/policies/tiles/) with visible attribution and normal browser caching; no Google Maps key is required. The public Photon service has no availability guarantee and may throttle extensive use. Before high traffic or paid plans, move search and tile delivery to a provider with a suitable service agreement. The public Nominatim service is not used for autocomplete.
## Hidden blocks and publication

Apply `005_hidden_blocks.sql` after migration 004 before publishing pages with hidden blocks. It updates the publication function to filter hidden blocks out of the public JSON while preserving their private draft copies, and filters any already-published hidden cards. Storage policies then automatically stop allowing new public signed URLs for attachments referenced only by hidden blocks. Already-issued signed URLs retain their normal expiry. Local preview and HTML exports filter hidden blocks independently; JSON backups intentionally retain them.

## Platform administration

After migrations 001–009, run [010_platform_admin.sql](supabase/migrations/010_platform_admin.sql) once in the Supabase SQL Editor. It adds a private account index, administrator membership, publication restrictions and an audit log. The deployed `/admin/` page uses the existing email-link login and the server-side `SUPABASE_SERVICE_ROLE_KEY`. Add `https://verbaspark.vercel.app/admin/**` to Supabase Authentication → URL Configuration → Redirect URLs.

Assign the first administrator only after that person has signed in to Verbaspark at least once. Run this separately in the SQL Editor, replacing the placeholder with their login email:

```sql
insert into public.platform_admins(user_id)
select id from auth.users where lower(email)=lower('YOUR_ADMIN_EMAIL')
on conflict(user_id) do nothing;
```

The SQL Editor should report one inserted row. If it reports zero, sign in with that address and retry. Do not commit a real administrator email or service-role key to the repository. Open `/admin/` after assignment. Accounts without administrator membership receive HTTP 403 from the API, even if they open the page directly.

Administrators can search accounts and public profiles, see platform totals, restrict publishing, restore access and review the audit log. A restriction hides the public page and blocks republishing, including after the owner unpublishes; the owner's private draft and inbox remain private. Previously issued signed media links can remain valid until their normal one-hour expiry. Restriction actions require a reason. Administrators cannot silently edit another person's content.

## Account deletion

After migration 010, run [011_account_deletion.sql](supabase/migrations/011_account_deletion.sql) once in the Supabase SQL Editor. It redacts the deleted owner's email in moderation history, removes their contact rate-limit records and enables the deletion API. The delete action stays unavailable server-side until this migration is applied. Do not rerun it after success. Keep an administrator account or assign a second administrator before deleting the current one.

The backup contains the current page, embedded photos and files, but does not export Inbox messages or statistics. Download it before deleting the account and keep it private. Already-issued signed media URLs can remain valid until they expire. If removal of any storage object fails, the API stops before deleting the Auth user so the owner can retry.

## Storage, reports and custom domains

After migration 011, run [012_platform_extensions.sql](supabase/migrations/012_platform_extensions.sql) **once** in the Supabase SQL Editor. It adds private visitor reports, owner-specific domain records and a 200 MiB per-account upload quota across `page-images` and `page-files`. The quota is enforced by Storage insert policy, including concurrent upload checks. Until the migration runs, the new service endpoints return an unavailable error; existing publishing continues.

The **File library** shows actual stored bytes and offers explicit cleanup of unreferenced uploads older than 30 days. Cleanup checks the online draft and published snapshot again immediately before removal, and also protects files referenced by the current browser draft. A page stored only on another device but not saved online cannot be seen by the server; save drafts online before cleanup. Removal uses the Supabase Storage API and is permanent. Reopen the library after cleanup to refresh its list.

Visitors can use **Report profile** on a published page. Reports are rate-limited and private; they appear under **Profile reports** in `/admin/`. Administrators can mark them reviewed, dismiss them, or open the existing restriction flow. A report never automatically hides a page.

To enable self-service domains, set `VERCEL_API_TOKEN`, `VERCEL_PROJECT_ID` and `VERCEL_TEAM_ID` in Vercel production environment variables and redeploy. The token must have access to adding, reading, verifying and removing project domains; keep it server-only. Use the Vercel project ID/name for `VERCEL_PROJECT_ID` and the `team_...` ID for `VERCEL_TEAM_ID` (omit for a personal project). A user first publishes a profile, then opens **Account & publishing → Custom domain**, enters one domain or subdomain and follows the DNS/TXT records shown. Each profile gets its own `_verbaspark` TXT challenge so it cannot claim a domain owned by another user of the same Vercel project. **Check connection** activates the domain only once this challenge resolves and Vercel confirms verification and valid DNS. The original `/p/username` link keeps working. Disconnect the domain before moving it elsewhere. The public root on a connected domain serves the profile, while Verbaspark's main root remains the landing page. A connected domain becomes the canonical/share URL; the platform copy is marked `noindex` to avoid duplicate search results.
