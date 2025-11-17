# Troubleshooting Guide - Lyric Lift

## HTTP 500 Error

### Issue: `https://lyriclift.com/api/health.php` returns HTTP 500

**Most Common Cause:** Missing `config.php` file

**Solution:**

1. **Create config.php on your server:**
   ```bash
   # Via SSH
   cd public_html  # or your domain root
   cp config.php.example config.php
   ```

   Or via Hostinger File Manager:
   - Navigate to your domain root
   - Copy `config.php.example`
   - Rename to `config.php`

2. **Edit config.php and add your API key:**
   ```php
   define('OPENAI_API_KEY', 'your-actual-api-key-here');
   ```

3. **Set proper permissions:**
   ```bash
   chmod 644 config.php
   ```

4. **Test again:**
   Visit: https://lyriclift.com/api/health.php

### Other Common Issues

#### Issue: "Media folder not found"
- **Solution:** Create the `media/` folder:
  ```bash
  mkdir -p media
  chmod 755 media
  ```

#### Issue: "Permission denied" errors
- **Solution:** Set proper folder permissions:
  ```bash
  chmod 755 songs blockchain media mp3
  chmod 644 *.php
  chmod 644 .htaccess
  ```

#### Issue: 404 errors for pages
- **Solution:** 
  - Verify `.htaccess` file exists in root
  - Check Apache mod_rewrite is enabled
  - Verify file paths are correct

#### Issue: API endpoints not working
- **Solution:**
  - Check `config.php` exists and has valid API key
  - Verify PHP version is 7.4+
  - Check error logs in Hostinger cPanel

## Enable Error Display (Temporary Debugging)

To see actual error messages, temporarily edit `config.php`:

```php
ini_set('display_errors', 1); // Change from 0 to 1
error_reporting(E_ALL);
```

**⚠️ Remember to set back to 0 for production!**

## Check Error Logs

In Hostinger cPanel:
1. Go to "Error Log" or "Logs"
2. Check for PHP errors
3. Look for file path issues or permission errors

## Verify File Structure

Your domain root should have:
```
public_html/
├── api/
│   ├── health.php
│   └── (other API files)
├── public/
│   ├── index.html
│   └── (other frontend files)
├── config.php          ← MUST EXIST
├── config.php.example
├── index.php
├── .htaccess
└── (other folders)
```

## Quick Health Check

After fixing issues, test:
1. https://lyriclift.com/api/health.php - Should return JSON
2. https://lyriclift.com - Should show main page
3. Check browser console (F12) for JavaScript errors

## Still Having Issues?

1. Check Hostinger error logs
2. Verify PHP version (should be 7.4+)
3. Ensure all files uploaded correctly
4. Check file permissions
5. Verify `.htaccess` is active

