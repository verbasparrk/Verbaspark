# Deploy Verbaspark on Vercel

The production site is [verbaspark.vercel.app](https://verbaspark.vercel.app), in the Vercel project `verbaspark2/verbaspark`. CLI deployment works, but the GitHub repository is not yet connected to Vercel, so a GitHub push alone does not deploy changes. Vercel must build the repository itself so the `api/` functions and `vercel.json` routes are included; uploading only `dist/` does not enable contact forms, analytics, or server-rendered sharing previews.

1. In the [Vercel project's Git settings](https://vercel.com/verbaspark2/verbaspark/settings/git), connect `verbasparrk/Verbaspark`. If the repository is unavailable, grant the Vercel GitHub App access to it in GitHub's **Settings → Applications → Installed GitHub Apps**. After authorization, `vercel git connect --yes` can also connect the already-linked local project. The included `vercel.json` runs `npm run build` and serves `dist/`.
2. In [Vercel Production environment variables](https://vercel.com/verbaspark2/verbaspark/settings/environment-variables), verify the following values. The project URL, publishable key, analytics secret, and canonical URL have been configured. **The service-role key still needs to be added** before contact submissions and analytics can work. Set the same values for **Preview** only if previews should use the same Supabase project. A separate Supabase project is safer for testing contact messages and analytics.

   | Variable | Value |
   | --- | --- |
   | `VITE_SUPABASE_URL` | Supabase project URL |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable or legacy anon key |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key, server-side only |
   | `ANALYTICS_HASH_SECRET` | Random secret with at least 32 bytes of entropy |
   | `APP_URL` | `https://verbaspark.vercel.app` |

   Generate the analytics secret locally with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. Store it directly in Vercel; never commit it or put the service-role key in a `VITE_` variable. If the production hostname is not known until the first deploy, add `APP_URL` afterward and redeploy.
3. In Supabase **Authentication → URL Configuration**, set **Site URL** to `https://verbaspark.vercel.app` and add `https://verbaspark.vercel.app/**` as a redirect URL. Keep the local redirect URL if you still develop locally.
4. Verify the deployed home page, email sign-in, public route `/p/<username>`, and the published profile's sharing preview. With a test profile that has contact and analytics enabled, submit a message, inspect it in the owner's Inbox, and check that visit/click counts update. A preview deployment may need its own `APP_URL` and redirect URL if it uses a different hostname.

GitHub runs unit, browser, mocked-cloud tests and a production build on every push to `main` and on pull requests. Those checks validate the code but do not replace the live Supabase/Vercel verification above. Once the GitHub repository is connected in Vercel, new commits deploy automatically.
