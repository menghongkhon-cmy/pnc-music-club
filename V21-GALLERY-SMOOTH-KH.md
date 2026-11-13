# PNC Music Club V21 — Gallery + Performance (ខ្មែរ)

## មានអ្វីថ្មី?
- Admin → Banners & Photos → **More club memories**: Upload multiple photos at once, add captions, set Community/Instruments/Rhythm, reorder, replace, remove, and Publish gallery.
- Gallery keeps the nine original photos, plus up to 120 extra photos from Admin.
- Image uploads are resized/compressed asynchronously to reduce browser freezing.
- Heavy duplicate ambient effects are disabled. Layout, existing banners, backgrounds, and all seven page designs remain unchanged.

## Test on Windows / VS Code
1. Extract pnc-music-club-2027.zip.
2. Open the `pnc-music-club-2027` folder in VS Code.
3. Run `npm.cmd install` then `npm.cmd start`.
4. Go to `http://localhost:4173/admin.html` (or the port printed in Terminal).
5. After signing in, open Banners & Photos → More club memories.
6. Select multiple photos, give each a caption/category, click Publish gallery.
7. Open `http://localhost:4173/pages/gallery.html` and try categories and full-screen photo lightbox.

## AWS upgrade: preserve existing data
- Stop `pnc-music-club` service before copying files.
- Back up `.private-data` and `assets/uploads`, which contain accounts, messages, members and uploaded media.
- This ZIP deliberately excludes private database and user-uploaded files.
- Do NOT overwrite the live `.private-data` with a new local database.
- Copy application source from the updated ZIP; restart your systemd service and verify all seven pages plus Admin.

## Notes
- New photos are stored as `galleryItems` in the existing site database JSON, with no SQL schema migration.
- Photos are uploaded to `assets/uploads` and are not removed from disk when unpublished.
- Existing Gallery nine photos and their replacements still work.
