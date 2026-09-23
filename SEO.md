# Search visibility and performance

The marketing home page is `/`, the private editor is `/editor/`, and published profiles are `/p/<username>`. Three fictional, non-indexable examples live under `/examples/`. The editor and examples declare `noindex`; the home page and public profiles can be indexed.

Published profiles return their visible text, links, and image descriptions in the first HTML response, even before JavaScript runs. Each page has a title, description, canonical URL, Open Graph and Twitter preview, and `ProfilePage` structured data. Translations use `?lang=<code>` with self-canonical URLs and reciprocal `hreflang` links. Uploaded images referenced by published cards have crawlable `/api/image` URLs. Hidden cards and private drafts never enter this HTML. Owners can check **Profile settings → Search & link preview → Keep this profile out of search results** and publish again to add `noindex` and remove the page from the sitemap. Unpublishing returns 404.

The dynamic `/sitemap.xml` lists the marketing home page and indexable published profiles, including language variants. `/robots.txt` points to it. A sitemap helps discovery, but does not guarantee indexing or higher rankings. The sitemap currently reads up to 10,000 profiles; add sitemap shards before reaching that size.

## Connect Google Search Console

1. Add a **URL-prefix property** for `https://verbaspark.vercel.app/` in [Google Search Console](https://search.google.com/search-console). A Vercel subdomain is not owned at the DNS level, so use the **HTML tag** verification option.
2. Copy only the verification tag's `content` value into a Vercel Production environment variable named `GOOGLE_SITE_VERIFICATION`. The build injects `<meta name="google-site-verification">` into the public home page. This value is intended to be public; keep access to Search Console in your own Google account. Redeploy after changing the variable.
3. Verify the property. Submit `https://verbaspark.vercel.app/sitemap.xml` in **Sitemaps**. After publishing a real profile, use **URL Inspection → Test live URL** on the profile and one translated URL. Check the rendered HTML, canonical URL, image access, and indexing status.
4. Check **Page indexing**, **Search results**, and **Core Web Vitals** periodically. Use [PageSpeed Insights](https://pagespeed.web.dev/) on the home page and representative public profiles, especially on mobile. Test [structured data](https://search.google.com/test/rich-results) on a published profile. Field data needs real visits and may not appear immediately.

The home page is static and ships no application JavaScript. On mobile, check Largest Contentful Paint, Interaction to Next Paint, and Cumulative Layout Shift using [Google's Web Vitals guidance](https://web.dev/articles/vitals). Do not infer search ranking from a Lighthouse score: content quality, discoverable links, and page experience matter together. All three fictional example pages say they are examples and use `noindex` to avoid misleading search results.

When moving to a custom domain, update `APP_URL`, the home page canonical and Open Graph URLs, `robots.txt`, and the Search Console property together. Redirect old public URLs to the new domain so only one canonical host remains.
