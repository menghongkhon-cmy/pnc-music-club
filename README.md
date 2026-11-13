## V8 — Hero & background studio update

- Redesigned Home banner: readable headline/glass panel, improved buttons and photo placement, mobile layout, stable animation, redesigned marquee.
- Admin → Banners & photos → Background studio: upload per-page hero **PNG/JPG/WebP/GIF/MP4/WebM** or whole-page atmosphere media; adjust overlay/focus, preview, publish or restore default.
- Videos stream with byte-range support and no third-party dependencies. Authenticated upload checks MIME, file signatures and size caps.
- Existing photo slides, team generations, feedback inbox, editor and SEO remain.
- **Production upgrade:** follow `DEPLOY-AWS-V8-KH.md` and keep `.private-data` and `assets/uploads` from your existing server. Neither contains seeded data in this release ZIP.

---

# PNC Music Club — Website + Creative Admin Studio (V7)

A public-facing, responsive seven-page **website** built with HTML, CSS and JavaScript, plus a private Node.js/SQLite administration area. Members and visitors do not need accounts.

## Start on Windows

1. Extract this ZIP.
2. Install **Node.js 22.5+** (Node 22 LTS or a later supported release).
3. Open the extracted `pnc-music-club` folder.
4. Double-click `START-WEBSITE.bat`, **or** open a terminal in this folder and run:

   ```powershell
   npm.cmd start
   ```

   **Windows PowerShell note:** Use `npm.cmd start` to avoid PowerShell execution-policy errors. Run this command **inside the extracted `pnc-music-club` folder**, where `package.json` exists.

5. Visit **http://localhost:4173/** to see the website.
6. Visit **http://localhost:4173/admin.html** to manage it.

**First-time admin setup:** The server prints a **one-time setup code** in the terminal. Copy it into the admin setup form, then choose your own admin email and a password of 12+ characters. There is **no default admin password**.

## What the admin can manage

| Tab | Editable content |
|---|---|
| Website editor | Club name, header tagline, announcement, official email, social links, page headings/descriptions and ordinary section paragraphs/headings on all seven pages |
| Banners & photos | Upload logo, upload/reorder/remove banner slides on any page; replace pictures in cards, sections and gallery |
| Website editor → Animated background | Enable/disable atmospheric motion, switch among Aurora, Starfield, Minimal and Nebula; choose intensity, headline motion (Cinematic / Floating / Neon Glow) and tempo (Dreamy / Balanced / Energetic) |
| Team profiles | Update current generation's **1 leader and 5 members**, names, roles, biographies, portraits, social links, archived generations |
| Inbox | View, filter, reply by email, annotate, archive or remove visitor chat/contact messages |

**How publishing works:** Upload a picture, set fields, then click **Publish / Save website**. Changes persist in the SQLite database and are visible to all visitors the next time they load a page. Team profiles are published separately using **Save team changes**. Changes are not exported manually.

### Site is still a regular website

The public pages are ordinary HTML/CSS/JS pages. The private admin, saved image uploads, shared website edits and message inbox require the included Node.js server. **Opening `index.html` as a local file or deploying to static-only hosting cannot save edits for every visitor.**

## New in Version 7

- **Public homepage + all six inner pages:** Staggered headline entrances, luminous accent typography and dynamic banner lettering that replays as each photograph changes (5-second slideshow).
- **Admin login:** Redesigned two-column creative studio, rotating vinyl record, equalizer bars, floating starlight and moving gradient glow.
- **Admin dashboard:** Creative-studio header, refreshed management navigation, updated cards, polished controls and animated preview.
- **Admin → Website editor → Motion & atmosphere:** New Nebula style, three headline entrances, three animation speeds, live preview + Replay button. Press **Save website** to publish.
- All effects automatically respect visitors’ **Reduce Motion** preference.
- No new libraries, accounts, or external APIs were required. Existing admin data and website edits are preserved when you upgrade the code; back up `.private-data/` and `assets/uploads/` first.

## Important deployment notes

- Use a Node.js host that runs **Node 22.5+**, supports HTTPS and **persistent storage**.
- Set the start command to `npm start` (or `node server.js`), and allow the server to listen on `PORT` (defaults to 4173).
- **Persist and back up both** `.private-data/` (SQLite messages/admin/content/team info) **and** `assets/uploads/` (uploaded images). On ephemeral hosting, these files can disappear after a redeploy.
- Never upload `.private-data/` to a public web directory; the included server blocks access to it.
- Admin sessions expire after 8 hours or on server restart. Passwords are hashed using scrypt; HTTP-only cookies are used for sessions.
- Only upload photos and personal information with members' permission.
- For a public site, configure HTTPS and your domain before collecting messages; maintain server and OS updates.

## Folder structure

```
pnc-music-club/
├── index.html               # Home
├── pages/                   # About, News, Activities, Achievements, Gallery, Contact
├── admin.html               # Private login & content administration
├── server.js                # Built-in Node HTTP + SQLite server
├── assets/
│   ├── css/                 # Public website + admin + motion styling
│   ├── js/                  # Public interactions, admin editor, team data
│   ├── img/                 # Default PNC Music Club assets
│   └── uploads/             # Admin-uploaded photos (created when needed)
├── .private-data/           # Private database (created on first run)
├── START-WEBSITE.bat        # Windows launcher
└── README.md
```

No npm packages or API keys are required.


## Google Search Console & SEO

See `GOOGLE-SEARCH-CONSOLE-SETUP.md` for sitemap, robots.txt and Search Console HTML-file verification instructions. The Node server generates live URLs from the public domain; set `SITE_URL` in production.


## V9: 3D music card and unified browser title

- The six inner-page hero cards now have CSS 3D glass, vinyl, sound equalizer and pointer tilt with reduced-motion support.
- The browser tab displays **PNC Music Club** on all seven public pages. The original page-specific `<title>` remains in the HTML response to preserve basic SEO information; JavaScript updates the visible tab name.
- JavaScript smooths normal page-to-page navigations; HTML pages, forms, admin, search and all server APIs remain separate/functional.
- New files: `assets/css/experience-v9.css` and `assets/js/experience-v9.js`.
- Changes in the admin-controlled logo also update the new 3D music card.

### Local preview
From the folder containing `package.json`, run `npm.cmd start` on Windows or `npm start` on Ubuntu. Open `http://localhost:4173/pages/contact.html` or `http://localhost:4173/pages/about.html`.

### Updating an AWS EC2 install
Make backups of `.private-data` and `assets/uploads` on the server first. Upload and extract this package; copy its website files over your existing project (without deleting those directories). Restart the `pnc-music-club` systemd service. Use HTTPS for public admin logins.
