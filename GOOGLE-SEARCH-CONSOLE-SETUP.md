# PNC Music Club — Google Search Console & SEO Setup

The site has 7 public pages. `admin.html` and `/api/` are excluded from the sitemap; admin also sends `noindex`.

## 1. Configure your public domain

Use the real public HTTPS address of your website, NOT `localhost:4173`, and NOT the `your-pnc-music-club-domain.example` placeholder.

**For Node.js hosting (recommended for this admin-powered site)**

- In your hosting provider, set `SITE_URL=https://your-real-domain.com` as an environment variable (replace with your domain), then restart the server. A live sitemap and robots.txt are generated automatically at `/sitemap.xml` and `/robots.txt`, and canonical/Open Graph tags use your domain.
- Alternatively, run `node configure-seo.mjs https://your-real-domain.com` from this folder. This writes `.seo-config.json` used by the Node server and also updates the downloadable static files.
- Run `npm.cmd start` from PowerShell on Windows. Open `http://localhost:4173` locally for testing, but Search Console cannot verify a localhost site.

**For static hosting (no private admin features):** run `node configure-seo.mjs https://your-real-domain.com` before uploading the entire folder's public HTML/assets. This generates correct absolute URLs in sitemap.xml, robots.txt and canonical/Open Graph tags. A static host cannot run the admin/database features.

## 2. Get the verification file from Google Search Console

1. Visit https://search.google.com/search-console
2. Add property → choose **URL prefix** and enter the exact public URL with `https://`.
3. Select **HTML file** verification method and download the **specific file Google provides** (typically `googleXXXXXXXX.html`).
4. Put that original, unchanged file in this same folder as `index.html` and `server.js`.
5. Deploy/restart your site and verify it is publicly accessible at `https://your-real-domain.com/googleXXXXXXXX.html`. Do not sign in, and do not redirect to an unrelated URL.
6. Click **Verify** in Search Console. Leave the file on your site permanently.

**Important:** Nobody can generate your personal Google verification HTML file without the exact token/file supplied to your Google account. A placeholder HTML file will NOT verify the site. This project intentionally does not include a fake `googleXXXXXXXX.html`.

Alternatively, Search Console supports an HTML meta verification tag (paste Google's exact tag into the homepage `<head>`), or a DNS TXT record for a **Domain property**.

## 3. Submit the sitemap

1. Confirm `https://your-real-domain.com/sitemap.xml` shows 7 correct URLs.
2. Confirm `https://your-real-domain.com/robots.txt` references the same sitemap.
3. In Google Search Console → **Sitemaps**, enter `sitemap.xml`, then click **Submit**.
4. Use **URL inspection** to request indexing for your Home page when ready.

## 4. What SEO this ZIP adds

- sitemap.xml for 7 public pages; admin and API excluded.
- robots.txt with sitemap link.
- Unique page titles and descriptions.
- Canonical, Open Graph and Twitter preview meta on public pages.
- WebSite structured data on homepage.
- Admin `noindex` and HTTP X-Robots-Tag.

Indexing is Google's decision; sitemap submission and verification do not guarantee a search ranking or immediate indexing.

## 5. Important site privacy and hosting notes

- Use a real domain and HTTPS, not a private IP or localhost.
- Keep `.private-data/` and admin credentials private; backups and image uploads need persistent storage.
- The verification file must remain at the **site root**, NOT inside `assets/` or `pages/`.
- The `/api/` routes being excluded from robots.txt is not access control; the included server already protects admin APIs.
- If you change domain, re-run `node configure-seo.mjs` or set the new `SITE_URL` environment variable and re-submit your sitemap.
