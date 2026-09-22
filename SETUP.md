# Connect accounts and publishing

For contact forms, analytics and social previews, see [Profile services setup](PROFILE_SERVICES_SETUP.md). Existing projects run only [PROFILE_SERVICES_SETUP.sql](supabase/PROFILE_SERVICES_SETUP.sql), which adds migrations 006–007. These features require server functions; uploading only the static `dist` folder is insufficient.

The editor works locally without configuration. Online features require a Supabase project and web hosting. Basic profiles support static hosting; contact forms, analytics and share metadata also require the server functions described above.

1. For a new Supabase project, run `supabase/INITIAL_SETUP.sql` (migrations 001–005), followed by `supabase/PROFILE_SERVICES_SETUP.sql` (006–007). Existing projects run only migrations not yet applied.
2. Copy `.env.example` to `.env.local`. Set the project URL and **publishable (or legacy anon) key** from Supabase's Connect dialog. Never put a service-role or secret key in a Vite environment variable.
3. In Authentication → URL Configuration, set your deployed Site URL and add your local development URL (`http://127.0.0.1:5173/`) to allowed redirects. Configure an email sender for production. Email sign-in creates an account if necessary.
4. Restart `npm run dev`. Open **Account & publishing**, request a sign-in link, and follow it. Save a private draft, choose a username, and publish. Public URLs are `/p/username`.
5. Build with `npm run build`. For the complete feature set, deploy the repository with its `api` handlers and server environment variables; the included `vercel.json` routes public profiles through server-rendered metadata. Static-only hosting can serve basic profiles using an `/index.html` fallback, but does not enable the new server features. A local `127.0.0.1` link is not accessible to other people.

## Data behavior

- Local recovery saves to IndexedDB (up to six recent versions), with localStorage as a fallback. Older local drafts migrate on opening. If neither store can save, edits stay in memory with a persistent error and a backup download action. Clearing site data still removes local copies.
- Signed-in private drafts autosave after a one-second pause. Writes are serialized; network errors retry after five seconds and reconnection retries immediately. Supabase fetches time out after 25 seconds. Unsent changes survive reload through the local recovery queue.
- A previously existing online draft or a different-account local page requires an explicit choice in **Save & recovery**. Database revision checks pause saving if another device changed the draft; no silent last-writer-wins overwrite. Signing in to a new account does not auto-upload the old account's page.
- Recovery supports recent versions, downloadable JSON backups, and JSON import. Backup download embeds accessible cloud photos. If they cannot be fetched while offline, the page data still downloads with an explicit warning to reconnect for a complete photo backup. Keep backups private: they contain your page and images.
- Loading an online draft replaces the local page as one undoable change. Signing out does not erase this device's local page.
- Publish flushes pending autosaves, then publishes exactly that database revision. A simultaneous edit from another device causes a conflict instead of publishing an unexpected version. Draft updates do not change the published snapshot. A failed username claim can still save the private draft.
- One page and username per account. Username uniqueness is enforced in PostgreSQL. Unpublish removes the public snapshot, preserving the draft.
- Uploaded images are content-addressed in a private storage bucket. Owner policies allow draft access; public reads require a published document reference. Viewer URLs are signed for one hour. Already issued image links remain valid until expiry after unpublishing.
- Images are retained when replaced; orphan cleanup and account deletion UI are future work. Browser uploads are compressed before transfer.

## Verification before opening registration

Local PostgreSQL-compatible tests run all migrations and verify ownership, revision conflicts, idempotent retries and separate publication snapshots. Browser cloud tests exercise the real Supabase client against mocked HTTP responses. These do not validate your remote Supabase deployment. With two test accounts, verify owner isolation, anonymous draft/image restrictions, publish/unpublish, duplicate usernames and email delivery on your final domain.

Run `npm run test:unit`, `npm run test:browser`, and `npm run test:cloud`. The cloud test runner uses temporary test environment values on port 5174 and does not contact a real Supabase project.

Official references: [email OTP](https://supabase.com/docs/reference/javascript/auth-signinwithotp), [storage policies](https://supabase.com/docs/guides/storage/security/access-control).

## Documents and audio storage

Migration 004 creates the private `page-files` bucket with a 20 MiB server-side per-file limit and an explicit document/audio MIME allowlist. Keep the project-wide storage limit at least 20 MiB. Content-hashed objects are stored under the authenticated owner’s ID; only owners can upload/read draft files, and anonymous reads require a reference in that owner’s published snapshot. Signed links expire after one hour; previously issued URLs can remain accessible until then after unpublishing. Reload the public page or load the online draft again to renew access. Changing the private draft does not change published attachments. Replaced files are retained for recovery and published snapshots; automatic cleanup is not implemented. The editor’s 50 MiB per-page upload budget is not an account-level server quota. Monitor total retained storage separately in Supabase. JSON backup import accepts up to 100 MB.

Local SQL tests cover owner isolation and published/unpublished file access; browser cloud tests mock upload, signed access, and export through the real Supabase SDK. Configure and validate these on your actual project before public use.

Media references: [YouTube embedding](https://support.google.com/youtube/answer/171780?hl=en), [Vimeo unlisted embeds](https://help.vimeo.com/hc/en-us/articles/12426470858001-Embedded-player-displays-This-video-does-not-exist-message), [OpenStreetMap embeds](https://wiki.openstreetmap.org/wiki/Export), [Supabase bucket limits](https://supabase.com/docs/guides/storage/uploads/file-limits).
## Embedded maps

Location blocks can show an embedded map immediately, load it on click, or show only navigation. Paste Google Maps **Share → Embed a map → Copy HTML** into the Embed map field; only the allowlisted iframe URL is retained, never the supplied HTML. OpenStreetMap embed URLs also work. Coordinate entry remains available under Advanced. Editing an address clears the previous embed and coordinates to avoid showing the old location.

For automatic map display from an address, enable Google Maps Embed API and set `VITE_GOOGLE_MAPS_EMBED_KEY`, then restart the development server/rebuild the deployment. This browser-visible key must be restricted to Maps Embed API and approved website referrers. Exported address-generated Google maps also need their hosting domain approved; copied Share embeds do not use this application key. No Google project or key has been provisioned here. See [Google Maps Embed setup](https://developers.google.com/maps/documentation/embed/quickstart). The public Nominatim search service is not used.
## Hidden blocks and publication

Apply `005_hidden_blocks.sql` after migration 004 before publishing pages with hidden blocks. It updates the publication function to filter hidden blocks out of the public JSON while preserving their private draft copies, and filters any already-published hidden cards. Storage policies then automatically stop allowing new public signed URLs for attachments referenced only by hidden blocks. Already-issued signed URLs retain their normal expiry. Local preview and HTML exports filter hidden blocks independently; JSON backups intentionally retain them.
