# PNC Music Club V8 — Update the existing AWS EC2 website

This ZIP upgrades your existing website. It **intentionally excludes `.private-data/` (admin account, SQLite database and messages)** and existing files from `assets/uploads/`. The upgrade instructions preserve those two folders on your EC2 server.

## 1. Windows PowerShell — upload the ZIP

Keep `pnc-music-club.pem` on your computer, not inside the website folder or public web server. Replace the path to the downloaded V8 ZIP if it is elsewhere.

```powershell
scp -i "C:\Users\Dell\Desktop\pnc-music-club.pem" "C:\Users\Dell\Downloads\PNC-Music-Club-2027-V8-Background-Studio.zip" ubuntu@13.239.63.145:/home/ubuntu/
```

Run the command above only at a `PS C:\...>` prompt. **Do not run it in Ubuntu.** If your AWS EC2 Public IP changes, replace `13.239.63.145` with the current IPv4 address shown in EC2.

## 2. Ubuntu SSH terminal — back up data and update code

```bash
mkdir -p ~/pnc-v8-release
unzip -oq ~/PNC-Music-Club-2027-V8-Background-Studio.zip -d ~/pnc-v8-release
cd ~/pnc2027/pnc-music-club-2027

# Stop briefly to create a consistent backup of SQLite and media uploads.
sudo systemctl stop pnc-music-club
mkdir -p ~/pnc2027-backups
cp -a .private-data "${HOME}/pnc2027-backups/private-$(date +%Y%m%d-%H%M%S)"
cp -a assets/uploads "${HOME}/pnc2027-backups/uploads-$(date +%Y%m%d-%H%M%S)"

# Copy updated source files WITHOUT deleting the existing DB or uploads.
cp -a ~/pnc-v8-release/pnc-music-club-2027/. ./

sudo systemctl start pnc-music-club
sudo systemctl status pnc-music-club --no-pager
```

**Do not delete your original website directory**, `.private-data`, or `assets/uploads`. The updated files will continue using your existing admin login and existing messages/members.

## 3. Verify the public site and API

```bash
curl -I http://127.0.0.1:4173/index.html
curl -s http://127.0.0.1:4173/api/health
```

On your computer, open the public page at `http://13.239.63.145` while awaiting your final HTTPS domain. The Node app runs continuously through the existing `pnc-music-club` systemd service and your Nginx reverse proxy.

For admin login, use an HTTPS-enabled domain **or a temporary SSH tunnel** from a *Windows* PowerShell window:

```powershell
ssh -i "C:\Users\Dell\Desktop\pnc-music-club.pem" -o ExitOnForwardFailure=yes -N -L 127.0.0.1:5174:127.0.0.1:4173 ubuntu@13.239.63.145
```

Leave that PowerShell window open, and open `http://127.0.0.1:5174/admin.html` in Chrome.

## 4. Change image, GIF or video backgrounds in Admin

1. Log in to the admin dashboard and open **Banners & photos**.
2. In **Page to customize**, choose Home, About, News, Activities, Achievements, Gallery, or Contact.
3. In **Background studio**, select **Page hero / banner** or **Whole page atmosphere**.
4. Click **Upload image / GIF / video**. Accepted: PNG, JPG, WebP (8 MB), animated GIF (15 MB), MP4 / WebM (40 MB).
5. Pick **focus** (top/center/bottom) and adjust **dark overlay** for readability.
6. Click **Publish image changes**. Refresh the public page to see the result.
7. **Restore default** returns to the original photo slider or animated atmosphere; publish to save the reset.

A custom hero background replaces the five-second photo slideshow on that page. Videos automatically play **muted, looped, and inline** where browser settings permit. For visitors who prefer reduced motion, videos do not autoplay.

Uploaded media is served publicly as part of the website. Do not upload private documents, confidential clips, or photos without permission. Large videos may use significant AWS storage/bandwidth; prefer 720p/1080p short compressed clips.

## 5. Troubleshooting

- `404 /admin` / no login: open `/admin.html`, not `/admin`.
- `localhost:5174` stops when PowerShell closes: that URL is a temporary local SSH tunnel, not the public site. Keep the tunnel window open, or configure your own domain + HTTPS.
- `Error 413`: compress the uploaded file and try again.
- A file uploads but isn't visible: click **Publish image changes**, then refresh the website.
- Service not running: `sudo journalctl -u pnc-music-club -n 60 --no-pager`.
- On AWS, protect SSH port 22 with **My IP** rather than `0.0.0.0/0` and use HTTPS for admin logins.
