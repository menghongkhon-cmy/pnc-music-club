/** Restore PNC team photographs without deleting account, member or message data.
 *  Run with Node 22.5+ while the local server is stopped.
 */
'use strict';
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const projectRoot = path.resolve(__dirname, '..');
const dbPath = path.join(projectRoot, '.private-data', 'pnc-music-club.sqlite');
if (!fs.existsSync(dbPath)) {
  console.error('No local database exists. Start the server to create default PNC photo banners.');
  process.exitCode = 1;
} else {
  let db;
  try {
    db = new DatabaseSync(dbPath, {timeout: 3000});
    db.exec('PRAGMA busy_timeout=3000;');
    const row = db.prepare('SELECT value FROM app_data WHERE key = ?').get('site');
    if (!row) throw new Error('Cannot find app_data.site settings. No changes made.');
    const site = JSON.parse(row.value);
    const stamp = new Date().toISOString().replace(/[-:.TZ]/g,'').slice(0,14);
    const backupPath = path.join(path.dirname(dbPath), `site-before-banner-reset-${stamp}-${crypto.randomBytes(3).toString('hex')}.sqlite`);
    // VACUUM INTO creates a consistent SQLite snapshot, including any WAL changes.
    db.exec(`VACUUM INTO '${backupPath.replace(/'/g, "''")}';`);
    site.globalMedia = {};
    site.pageMedia = {};
    site.heroMedia = {};
    site.banners = {};
    db.prepare('UPDATE app_data SET value=?,updated_at=? WHERE key=?')
      .run(JSON.stringify(site), new Date().toISOString(), 'site');
    console.log('SUCCESS! Original PNC music club banner photos restored on all seven pages.');
    console.log('Database backup:', backupPath);
    console.log('Start the server and refresh the browser with Ctrl+F5.');
  } catch(err) {
    console.error('Could not reset the banner:',err.message);
    process.exitCode=1;
  } finally {
    if (db) db.close();
  }
}
