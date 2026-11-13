@echo off
setlocal
cd /d "%~dp0"
echo =====================================
echo  PNC MUSIC CLUB - SEO CONFIGURATION
echo =====================================
echo.
echo Enter your PUBLIC HTTPS website domain.
echo Example: https://music.yourdomain.com
set /p PNC_SITE_URL=Your website URL: 
echo.
node configure-seo.mjs "%PNC_SITE_URL%"
if errorlevel 1 (
 echo.
 echo SEO setup failed. Check your URL and installed Node.js.
) else (
 echo.
 echo Please upload the updated files to your website.
 echo In Google Search Console use sitemap.xml
 echo To verify ownership, add Google's ORIGINAL verification HTML file in this folder.
)
pause
