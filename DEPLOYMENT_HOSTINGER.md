# Hostinger Git Deployment Setup

## Issue: Authentication Error

If you're getting:
```
fatal: could not read Username for 'https://github.com': No such device or address
```

## Solution Options

### Option 1: Make Repository Public (Easiest) ⭐ Recommended

1. Go to: https://github.com/JustinHolm/lyriclift/settings
2. Scroll down to **"Danger Zone"**
3. Click **"Change visibility"**
4. Select **"Change to public"**
5. Confirm the change

**Then in Hostinger:**
- Use repository URL: `https://github.com/JustinHolm/lyriclift.git`
- No authentication needed for public repos

### Option 2: Use SSH Authentication

1. **Generate SSH Key** (if you don't have one):
   ```bash
   ssh-keygen -t rsa -b 4096 -C "[email protected]"
   ```

2. **Copy your public key**:
   ```bash
   cat ~/.ssh/id_rsa.pub
   ```

3. **Add to GitHub**:
   - Go to: https://github.com/settings/keys
   - Click "New SSH key"
   - Paste your public key
   - Save

4. **In Hostinger deployment settings**:
   - Use SSH URL: `[email protected]:JustinHolm/lyriclift.git`
   - Or add your SSH private key to Hostinger's deployment settings

### Option 3: Use Personal Access Token

1. **Create GitHub Personal Access Token**:
   - Go to: https://github.com/settings/tokens
   - Click "Generate new token (classic)"
   - Select scopes: `repo` (full control of private repositories)
   - Generate and copy the token

2. **In Hostinger deployment settings**:
   - Repository URL: `https://github.com/JustinHolm/lyriclift.git`
   - Username: Your GitHub username
   - Password: Your Personal Access Token (not your GitHub password)

## Recommended: Make Repository Public

Since this is a web application (not sensitive source code), making it public is the simplest solution and allows:
- Easy deployment
- Open source collaboration
- No authentication hassles

The `config.php` file with your API key is already excluded from git, so your secrets are safe.

