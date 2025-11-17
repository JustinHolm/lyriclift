# 🚀 Deployment Guide - Lyric Lift

This guide covers deploying Lyric Lift to **Hostinger** (or similar shared hosting).

## 📋 Pre-Deployment Checklist

- [ ] OpenAI API key ready
- [ ] Domain configured (lyriclift.com)
- [ ] SSL certificate active (HTTPS)
- [ ] PHP 7.4+ available
- [ ] File upload permissions configured

## 🔧 Step-by-Step Deployment

### 1. Prepare Files for Upload

**Files to Upload:**
- All files from the repository EXCEPT:
  - `config.php` (create this on server)
  - `songs/` folder contents (user data)
  - `blockchain/` folder contents (user data)
  - `media/` folder contents (user uploads)
  - `mp3/` folder contents (user uploads)
  - `.git/` folder
  - `router.php` (only needed for local development)

**Keep folder structure:**
```
public_html/
├── api/
├── public/
├── songs/          (create empty)
├── blockchain/     (create empty)
├── media/          (create empty)
├── mp3/            (create empty)
├── config.php      (create from template)
├── router.php
├── .htaccess
└── index.php       (if using)
```

### 2. Upload Files via FTP/SFTP

**Using FileZilla or similar:**
1. Connect to your Hostinger FTP
2. Navigate to `public_html/` (or your domain root)
3. Upload all files maintaining folder structure
4. Ensure `.htaccess` is uploaded (it's a hidden file)

**Using cPanel File Manager:**
1. Log into cPanel
2. Open File Manager
3. Navigate to `public_html/`
4. Upload files via zip and extract, or upload individually

### 3. Create Configuration File

1. In cPanel File Manager, navigate to your domain root
2. Create new file: `config.php`
3. Copy content from `config.php.example`
4. Edit and add your OpenAI API key:

```php
<?php
define('OPENAI_API_KEY', 'sk-proj-your-actual-api-key-here');
// ... rest of config
```

**⚠️ IMPORTANT:** Never commit `config.php` to git!

### 4. Create Required Directories

Create these folders in your domain root:
- `songs/`
- `blockchain/`
- `media/`
- `mp3/`

**Using cPanel:**
1. File Manager → Create New Folder
2. Name: `songs`, `blockchain`, `media`, `mp3`
3. Repeat for each folder

### 5. Set Folder Permissions

**Using cPanel File Manager:**
1. Right-click each folder → Change Permissions
2. Set to `755` (rwxr-xr-x) for:
   - `songs/`
   - `blockchain/`
   - `media/`
   - `mp3/`

**Using FTP:**
```bash
chmod 755 songs blockchain media mp3
```

### 6. Configure .htaccess

Ensure `.htaccess` is in your domain root and contains:

```apache
# Enable rewrite engine
RewriteEngine On

# Protect sensitive folders
RewriteRule ^songs/ - [F,L]
RewriteRule ^blockchain/ - [F,L]

# Allow media and mp3 access
RewriteRule ^media/ - [L]
RewriteRule ^mp3/ - [L]

# Route API requests
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^api/(.*)$ api/$1 [L]

# Route public assets
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^public/(.*)$ public/$1 [L]

# Default route to index.html
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ public/index.html [L]
```

### 7. Configure PHP Settings

**In cPanel:**
1. Go to "Select PHP Version" or "MultiPHP INI Editor"
2. Set PHP version to 7.4 or higher
3. Adjust these settings:

```ini
upload_max_filesize = 50M
post_max_size = 50M
max_execution_time = 300
memory_limit = 256M
```

### 8. Test Your Deployment

**Test Checklist:**
- [ ] **Visit your domain:** https://lyriclift.com
- [ ] **Test main page:** Should load Lyrics Studio
- [ ] **Test navigation:** All menu items work
- [ ] **Test API health:** https://lyriclift.com/api/health.php returns JSON
- [ ] **Test API endpoints:** Try enhancing some lyrics
- [ ] **Test file uploads:** Upload an image to media folder
- [ ] **Test saving:** Save a test song
- [ ] **Test loading:** Load a saved song
- [ ] **Test audio studio:** Load audio files
- [ ] **Check console:** Open browser DevTools (F12), check for errors
- [ ] **Test on mobile:** Verify responsive design works

### 9. SSL Certificate (HTTPS)

**Hostinger usually provides free SSL:**
1. In cPanel, find "SSL/TLS Status"
2. Enable SSL for your domain
3. Force HTTPS redirect in `.htaccess`:

```apache
# Force HTTPS
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
```

### 10. Domain Configuration

**If using subdomain or subfolder:**
- Update `BASE_URL` in `config.php` if needed
- Adjust `.htaccess` paths accordingly

## 🔍 Troubleshooting

### API Errors

**"Failed to connect to OpenAI API"**
- Check API key in `config.php`
- Verify API key is valid and has credits
- Check PHP cURL is enabled
- Check SSL certificates (may need to disable verification for local dev only)

### File Upload Issues

**"Permission denied"**
- Check folder permissions (should be 755)
- Check PHP `upload_max_filesize` setting
- Verify folder exists and is writable

### 404 Errors

**"Page not found"**
- Check `.htaccess` is present and active
- Verify Apache mod_rewrite is enabled
- Check file paths are correct
- Try accessing files directly: `https://lyriclift.com/public/index.html`

### CORS Errors

**"Access-Control-Allow-Origin"**
- Check API headers in `api/*.php` files
- Verify domain is correct
- Check server CORS settings

### Path Issues

**"Assets not loading"**
- Check asset paths in HTML files
- Verify `public/` folder structure
- Check browser console for 404 errors

## 🔐 Security Checklist

- [ ] `config.php` is not in git
- [ ] API key is secure (not in public files)
- [ ] `.htaccess` protects sensitive folders
- [ ] HTTPS is enabled
- [ ] File permissions are correct (755 for folders, 644 for files)
- [ ] Error reporting is disabled in production (`display_errors = 0`)
- [ ] Sensitive folders (`songs/`, `blockchain/`) are protected

## 📊 Post-Deployment

### Monitor

**Error Logs:**
- [ ] Check cPanel → Error Log
- [ ] Look for PHP errors
- [ ] Check for file permission errors
- [ ] Monitor API errors

**Feature Testing:**
- [ ] Lyrics enhancement works
- [ ] Save/load songs works
- [ ] Image search works
- [ ] Video gallery loads
- [ ] Audio player works
- [ ] Blockchain registration works
- [ ] All navigation links work

**Performance Monitoring:**
- [ ] Check page load times
- [ ] Monitor API response times
- [ ] Check server resources (CPU, memory)
- [ ] Monitor OpenAI API usage/costs

### Maintenance

**Regular Backups:**
- [ ] Backup `songs/` folder (weekly/monthly)
- [ ] Backup `blockchain/` folder (weekly/monthly)
- [ ] Backup `config.php` (when changed)
- [ ] Backup `media/` folder if important files exist
- [ ] Store backups off-server

**Update Dependencies:**
- [ ] Keep PHP updated (check Hostinger for updates)
- [ ] Monitor OpenAI API changes
- [ ] Update code from GitHub regularly
- [ ] Test updates in staging before production

**Monitor Usage:**
- [ ] Track OpenAI API usage/costs (daily/weekly)
- [ ] Monitor storage usage
- [ ] Check server resource usage
- [ ] Review error logs regularly

## 🆘 Support

**If you encounter issues, follow this checklist:**

1. **Check Error Logs:**
   - [ ] Open Hostinger cPanel → Error Log
   - [ ] Look for PHP fatal errors
   - [ ] Check for file path errors
   - [ ] Note any permission errors

2. **Enable Debugging:**
   - [ ] Edit `config.php`: Set `display_errors = 1`
   - [ ] Refresh the page to see error messages
   - [ ] **Remember to set back to 0 after debugging!**

3. **Browser Debugging:**
   - [ ] Open browser DevTools (F12)
   - [ ] Check Console tab for JavaScript errors
   - [ ] Check Network tab for failed requests
   - [ ] Look for 404 or 500 errors

4. **File Verification:**
   - [ ] Verify all files uploaded correctly
   - [ ] Check `config.php` exists and has API key
   - [ ] Verify `.htaccess` is present
   - [ ] Check folder permissions (755 for folders, 644 for files)

5. **API Testing:**
   - [ ] Test: https://lyriclift.com/api/test.php
   - [ ] Test: https://lyriclift.com/api/health.php
   - [ ] Test individual API endpoints
   - [ ] Verify API key is valid and has credits

## 📝 Notes

- **Development vs Production:** The `router.php` file is only needed for local development with PHP's built-in server. On Hostinger, Apache handles routing via `.htaccess`.

- **File Structure:** Hostinger typically uses `public_html/` as the web root. Adjust paths if your setup differs.

- **Database:** This application uses file-based storage (JSON files). For production with many users, consider migrating to a database.

---

**Deployed successfully?** 🎉 Your site should now be live at https://lyriclift.com!
