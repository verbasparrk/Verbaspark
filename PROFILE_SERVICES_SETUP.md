# Profile services setup

Implemented: contact inbox, aggregate analytics, server-rendered share metadata, vCard download, reusable file library, and manually translated profiles. Custom domains are intentionally deferred.

## Existing Supabase project

For configurable contact fields, also run `supabase/migrations/008_contact_fields.sql` once after 006–007. This adds a structured answer snapshot and permits forms without an email field. Previously received messages remain available. The form editor is under **Add content → Contact & links → Contact form**, and **Profile settings → Customize form fields**. One form per profile supports up to 12 fields, with text, long text, email, phone, date, dropdown and checkbox types, optional/required fields, reordering and removal. Republishing applies the new form to visitors; old submissions retain the labels used when they were submitted.

Run **only** `supabase/PROFILE_SERVICES_SETUP.sql` (migrations 006 and 007) in the SQL editor. Do not rerun INITIAL_SETUP.sql on an existing project. The migration creates private inbox and analytics tables plus server-only rate limiting functions. Existing profiles do not collect analytics or accept messages until their owner enables those options and republishes.

## Server configuration

The current static Sites deployment cannot run the Node handlers in `api/`. Deploy the repository to a host supporting those handlers (a Vercel configuration is included), rather than uploading only `dist/`. No deployment account has been connected as part of this change.

Set these environment variables privately in the hosting dashboard, and in `.env.local` for local testing:

- `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`: existing public project settings.
- `SUPABASE_SERVICE_ROLE_KEY`: server-only Supabase service role key. Never put it in a `VITE_` variable or send it in chat.
- `ANALYTICS_HASH_SECRET`: a random secret of at least 32 bytes, generated locally, used for daily one-way network-address hashes.
- `APP_URL`: the application's canonical origin, using HTTPS in production. Use `http://127.0.0.1:5173` locally.

Restart `npm run dev` after changing the environment. Local Vite middleware serves contact/event APIs and, when APP_URL is set, profile HTML with server-rendered metadata. Production `vercel.json` routes `/p/:slug` to the page function and leaves assets/API handlers intact. Verify both `/p/example` and `/p/example?lang=sl` after deployment. Configure Supabase authentication redirects for the new origin.

## Behavior and limits

- Contact messages are stored in **My page → Inbox**, accessible only to their owner, with an email reply link and explicit deletion. This version does not send email notifications. Inputs are bounded; a honeypot and database-backed limits allow five messages per network address/profile/hour and twenty across the platform. For higher traffic add a CAPTCHA and hosting-level bot controls.
- Analytics must be enabled and published. Counts are approximate: views are deduplicated by a daily keyed network-address hash, clicks by card/address for sixty seconds. No cookie, raw IP, message content, full destination URL, or referrer is stored in analytics. Shared networks can undercount visitors. Known bot user agents, DNT/GPC clients, previews, and authenticated owner visits are excluded. Anonymous owner visits cannot be recognized. Rate keys expire and are pruned on subsequent activity. Daily aggregate reports cover 7, 30, or 90 days.
- Link metadata is in the initial HTML response, not just client-side tags. Cover images can be uploaded in Profile settings or supplied as permanent public HTTPS URLs. Uploaded covers stay private until publication and are served from a stable `/api/cover?slug=...` endpoint. Social services may cache old metadata.
- The file library lists the signed-in owner's existing uploads from both private buckets, including retained files not used in the current draft, and shows their total size. It also permits reuse of files already present in a local draft. Upload through normal content cards. Deletion is not offered to avoid breaking published or recoverable content.
- Translation languages: English, Slovenian, German, Italian, Croatian. Owners write per-card translations, including titles, descriptions, subtitles, and button labels. Empty translations fall back to the original content. Form labels are available in English and Slovenian; other languages currently use English form labels. The original page remains editable. Public visitors choose languages using a selector and `?lang=` links.
- vCards escape special characters, use UTF-8 with CRLF, and fold long lines. The visitor downloads a `.vcf` file that their phone can import.
- Standalone HTML exports retain the vCard, but online contact submission and the language selector require the hosted application. The exported form displays an explanatory message and never submits visitor details as URL parameters.

## Release checks

Run unit, browser, and mocked cloud tests. Then use a configured staging project to send a message, view it only as the owner, collect anonymous activity, exclude an authenticated owner visit, inspect page-source Open Graph metadata, import a vCard, reuse an uploaded file, and switch languages. Live activation is incomplete until migration, server environment, and deployment are configured.
### Inbox statuses and new-message badge

After migration 008, run `supabase/migrations/009_inbox_status.sql` in the Supabase SQL Editor. It adds New / Read / Closed statuses; existing messages start as New. Owners can update only the status column, and only on their own messages. No new environment variables are needed.

Messages shows a status filter and a Reply link that opens the user's email application with the sender and subject filled in. Opening the inbox does not mark all messages as read: change a message's status explicitly. The new-message badge refreshes when signing in, returning to the tab, every minute while visible, and after changing or deleting a message.
