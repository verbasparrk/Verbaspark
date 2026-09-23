# Deploy Verbaspark on Vercel

The repository is ready for a Vercel import, but a Vercel project has not been connected yet. Vercel must build the repository itself so the `api/` functions and `vercel.json` routes are included; uploading only `dist/` does not enable contact forms, analytics, or server-rendered sharing previews.

1. In Vercel, choose **Add New → Project**, import the GitHub repository `verbasparrk/Verbaspark`, and leave the root directory at the repository root. The included `vercel.json` runs `npm run build` and serves `dist/`.
2. Before the production deployment, set these Vercel **Production** environment variables. Set the same values for **Preview** only if previews should use the same Supabase project. A separate Supabase project is safer for testing contact messages and analytics.

   | Variable | Value |
   | --- | --- |
   | `VITE_SUPABASE_URL` | Supabase project URL |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable or legacy anon key |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key, server-side only |
   | `ANALYTICS_HASH_SECRET` | Random secret with at least 32 bytes of entropy |
   | `APP_URL` | Canonical production origin, for example `https://your-project.vercel.app` |

   Generate the analytics secret locally with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. Store it directly in Vercel; never commit it or put the service-role key in a `VITE_` variable. If the production hostname is not known until the first deploy, add `APP_URL` afterward and redeploy.
3. In Supabase **Authentication → URL Configuration**, set **Site URL** to the production origin and allow `https://your-project.vercel.app/**` as a redirect URL. Keep the local redirect URL if you still develop locally. Use the actual Vercel hostname, not the example above.
4. Verify the deployed home page, email sign-in, public route `/p/<username>`, and the published profile's sharing preview. With a test profile that has contact and analytics enabled, submit a message, inspect it in the owner's Inbox, and check that visit/click counts update. A preview deployment may need its own `APP_URL` and redirect URL if it uses a different hostname.

GitHub runs unit, browser, mocked-cloud tests and a production build on every push to `main` and on pull requests. Those checks validate the code but do not replace the live Supabase/Vercel verification above. Once the repository is imported, Vercel deploys new commits automatically.
