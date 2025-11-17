# How to Create config.php on Hostinger

## The Problem
The `config.php` file is missing on your server. This file is excluded from git (for security) and needs to be created manually on the server.

## Solution: Create config.php

### Option 1: Using Hostinger File Manager (Easiest)

1. **Log into Hostinger cPanel**
2. **Open File Manager**
3. **Navigate to your domain root** (usually `public_html/` or your domain folder)
4. **Find `config.php.example`** file
5. **Right-click → Copy**
6. **Rename the copy to `config.php`**
7. **Right-click `config.php` → Edit**
8. **Find this line:**
   ```php
   define('OPENAI_API_KEY', getenv('OPENAI_API_KEY') ?: 'your-api-key-here');
   ```
9. **Replace `'your-api-key-here'` with your actual API key:**
   ```php
   define('OPENAI_API_KEY', getenv('OPENAI_API_KEY') ?: 'sk-proj-your-actual-key-here');
   ```
10. **Save the file**

### Option 2: Using SSH

```bash
# Navigate to your domain root
cd public_html  # or your domain folder

# Copy the example file
cp config.php.example config.php

# Edit the file (use nano, vi, or your preferred editor)
nano config.php

# Find and replace 'your-api-key-here' with your actual API key
# Save and exit (Ctrl+X, then Y, then Enter in nano)
```

### Option 3: Create from Scratch

1. **In File Manager, click "New File"**
2. **Name it: `config.php`**
3. **Paste this content:**

```php
<?php
// config.php - Configuration and environment variables
// NEVER commit this file to git!

// OpenAI API Key
// Get your key from: https://platform.openai.com/api-keys
define('OPENAI_API_KEY', 'sk-proj-your-actual-api-key-here');

// Base paths
define('MEDIA_FOLDER', __DIR__ . '/media');
define('BASE_URL', ''); // Will be auto-detected or set manually

// Error reporting (disable in production)
error_reporting(E_ALL);
ini_set('display_errors', 0); // Set to 1 for debugging, 0 for production

// Helper function to get base URL
function getBaseUrl() {
    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    $script = $_SERVER['SCRIPT_NAME'] ?? '';
    $path = dirname($script);
    return $protocol . '://' . $host . ($path !== '/' ? $path : '');
}
```

4. **Replace `'sk-proj-your-actual-api-key-here'` with your real API key**
5. **Save**

## Verify It Works

After creating `config.php`, test:
- https://lyriclift.com/api/test.php
- Should show: `Config loaded: SUCCESS`
- https://lyriclift.com/api/health.php
- Should show: `"config_file": "exists"`

## File Location

The `config.php` file must be in the **root directory** of your domain, same level as:
- `index.php`
- `.htaccess`
- `api/` folder
- `public/` folder

## Permissions

Set file permissions to **644**:
- In File Manager: Right-click → Change Permissions → 644
- Via SSH: `chmod 644 config.php`

