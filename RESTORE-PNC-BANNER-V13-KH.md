# PNC Music Club V13 — ប្តូរ Banner ពី Developer Wallpaper ទៅ Team Photos

## មូលហេតុ

Website រក្សាទុករូប Developer Wallpaper ក្នុង `.private-data/pnc-music-club.sqlite`។ ពេល Update ZIP វានៅបង្ហាញរូបចាស់ ព្រោះ Database មិនត្រូវបានជំនួស។

## វិធីទី 1 — Admin (ណែនាំ)

1. Run `npm.cmd start` នៅក្នុង folder `pnc-music-club-2027`។
2. បើក `http://localhost:4173/admin.html` (ឬ port ដែល Terminal បង្ហាញ)។
3. Login → **Banners & photos**។
4. ចុច **♬ Restore PNC Music Club Photos — all pages**។
5. Confirm → ចាំមើលសារ success។
6. Open Home → `Ctrl + F5` ដើម្បី Refresh។

នេះ Restore slideshow រូប Team ទាំងប្រាំទាំងប្រាំពីរទំព័រ និងលុបតែ Background/Banner Overrides ដែលបាន save ចាស់។ វាមិនលុប Gmail/Password, Team, Messages, Copy, Images, Gallery ឬ Upload Files ទេ។

## វិធីទី 2 — Terminal (បើចូល Admin មិនបាន)

1. Stop Node server ជាមុន (VS Code Terminal → `Ctrl+C`)។
2. នៅក្នុង Project Folder Run:

```powershell
node .\tools\restore-club-banners.js
npm.cmd start
```

3. បើក Browser → `http://localhost:4173` (ឬ 4174 បើ port កំណត់ផ្សេង) → `Ctrl+F5`។

Script បង្កើត SQLite backup រួចសឹម Reset Background Settings ។ កុំលុប `.private-data`។

## កំណត់ចំណាំ

- រូបដែល Upload ចាស់ត្រូវបានរក្សានៅ `assets/uploads`។
- ប្រសិនបើចង់ Upload Background ថ្មីដោយចេតនា Admin → Background Studio → All 7 pages → Upload → Publish background។
- Backup Database មុន Deploy ទៅ AWS ជានិច្ច។
