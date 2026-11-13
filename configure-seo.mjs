#!/usr/bin/env node
// Run: node configure-seo.mjs https://YOUR-REAL-DOMAIN.com
// Generates a valid sitemap, robots.txt and absolute canonical/social meta tags.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.dirname(fileURLToPath(import.meta.url));
const pages = [
  ['index.html','/'],
  ['pages/about.html','/pages/about.html'],
  ['pages/news.html','/pages/news.html'],
  ['pages/activities.html','/pages/activities.html'],
  ['pages/achievements.html','/pages/achievements.html'],
  ['pages/gallery.html','/pages/gallery.html'],
  ['pages/contact.html','/pages/contact.html'],
];
function siteOrigin(input) {
  if (!input) throw new Error('Provide your domain. Example: node configure-seo.mjs https://music.example.com');
  const url = new URL(input);
  if (url.username || url.password || url.search || url.hash || url.pathname !== '/' ||
      (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost','127.0.0.1'].includes(url.hostname)))) {
    throw new Error('Enter your website root address (HTTPS), with no path/query/username.');
  }
  return url.origin;
}
const htmlEscape = s => String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
const xmlEscape = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
function pageSEO(origin,route,title,description){
  const href=origin+route;
  const social=origin+'/assets/img/team-1.webp';
  const schema = route === '/' ? JSON.stringify({'@context':'https://schema.org','@type':'WebSite',name:'PNC Music Club',url:origin+'/',description, inLanguage:'en'}) : null;
  const elements = [
    `<link rel="canonical" href="${htmlEscape(href)}"/>`,
    `<meta property="og:type" content="website"/>`,
    `<meta property="og:site_name" content="PNC Music Club"/>`,
    `<meta property="og:title" content="${htmlEscape(title)}"/>`,
    `<meta property="og:description" content="${htmlEscape(description)}"/>`,
    `<meta property="og:url" content="${htmlEscape(href)}"/>`,
    `<meta property="og:image" content="${htmlEscape(social)}"/>`,
    `<meta property="og:image:alt" content="PNC Music Club student team"/>`,
    `<meta name="twitter:card" content="summary_large_image"/>`,
  ];
  if(schema) elements.push(`<script type="application/ld+json">${schema.replace(/</g,'\\u003c')}</script>`);
  return elements.join('\n');
}
function writeFiles(origin) {
  const lines=['<?xml version="1.0" encoding="UTF-8"?>','<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'];
  for (const [file,route] of pages) {
    const target=path.join(root,file);
    let html=fs.readFileSync(target,'utf8');
    const title=html.match(/<title>([\s\S]*?)<\/title>/i)?.[1].replace(/&amp;/g,'&') || 'PNC Music Club';
    const description=html.match(/<meta\s+content="([^"]+)"\s+name="description"/i)?.[1] || '';
    const re=/<!-- PNC_SEO_START -->[\s\S]*?<!-- PNC_SEO_END -->/;
    if (!re.test(html)) throw new Error(`SEO markers missing: ${file}`);
    html=html.replace(re,`<!-- PNC_SEO_START -->\n${pageSEO(origin,route,title,description)}\n<!-- PNC_SEO_END -->`);
    fs.writeFileSync(target,html);
    lines.push(`  <url><loc>${xmlEscape(origin+route)}</loc></url>`);
  }
  lines.push('</urlset>');
  fs.writeFileSync(path.join(root,'sitemap.xml'),lines.join('\n')+'\n');
  fs.writeFileSync(path.join(root,'robots.txt'),`User-agent: *\nAllow: /\nDisallow: /admin.html\nDisallow: /api/\nDisallow: /.private-data/\n\nSitemap: ${origin}/sitemap.xml\n`);
  fs.writeFileSync(path.join(root,'.seo-config.json'),JSON.stringify({siteUrl:origin},null,2)+'\n');
}
try {
  const origin=siteOrigin(process.argv[2]);
  writeFiles(origin);
  console.log(`Success! SEO files configured for: ${origin}`);
  console.log('Upload/redeploy the site. Search Console sitemap path: sitemap.xml');
  console.log('For Google HTML file verification, put the UNCHANGED file from Google beside index.html.');
} catch (err) { console.error('SEO setup error:',err.message); process.exitCode=1; }
