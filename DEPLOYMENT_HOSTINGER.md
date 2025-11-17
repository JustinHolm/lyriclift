# Hostinger Git Deployment Setup

## Issue: Authentication Error

If you're getting:
```
fatal: could not read Username for 'https://github.com': No such device or address
```

## Solution Options

### Option 1: Make Repository Public (Easiest) ⭐ Recommended

**Steps:**
1. Go to: https://github.com/JustinHolm/lyriclift/settings
2. Scroll down to **"Danger Zone"**
3. Click **"Change visibility"**
4. Select **"Change to public"**
5. Type repository name to confirm
6. Click "I understand, change repository visibility"

**Then in Hostinger:**
- [ ] Use repository URL: `https://github.com/JustinHolm/lyriclift.git`
- [ ] No authentication needed for public repos
- [ ] Test deployment

### Option 2: Use SSH Authentication

**Steps:**
1. **Generate SSH Key** (if you don't have one):
   ```bash
   ssh-keygen -t rsa -b 4096 -C "[email protected]"
   ```
   - Press Enter to accept default location
   - Set a passphrase (optional but recommended)

2. **Copy your public key**:
   ```bash
   # Linux/Mac
   cat ~/.ssh/id_rsa.pub
   
   # Windows (PowerShell)
   Get-Content ~\.ssh\id_rsa.pub
   ```

3. **Add to GitHub**:
   - [ ] Go to: https://github.com/settings/keys
   - [ ] Click "New SSH key"
   - [ ] Add a title (e.g., "Hostinger Server")
   - [ ] Paste your public key
   - [ ] Click "Add SSH key"

4. **In Hostinger deployment settings**:
   - [ ] Use SSH URL: `[email protected]:JustinHolm/lyriclift.git`
   - [ ] Or add your SSH private key to Hostinger's deployment settings
   - [ ] Test connection

### Option 3: Use Personal Access Token

**Steps:**
1. **Create GitHub Personal Access Token**:
   - [ ] Go to: https://github.com/settings/tokens
   - [ ] Click "Generate new token (classic)"
   - [ ] Give it a name: "Hostinger Deployment"
   - [ ] Select expiration (30 days, 90 days, or no expiration)
   - [ ] Select scopes: Check `repo` (full control of private repositories)
   - [ ] Click "Generate token"
   - [ ] **Copy the token immediately** (you won't see it again!)

2. **In Hostinger deployment settings**:
   - [ ] Repository URL: `https://github.com/JustinHolm/lyriclift.git`
   - [ ] Username: Your GitHub username (`JustinHolm`)
   - [ ] Password: Your Personal Access Token (NOT your GitHub password)
   - [ ] Save settings
   - [ ] Test deployment

## Recommended: Make Repository Public

Since this is a web application (not sensitive source code), making it public is the simplest solution and allows:
- Easy deployment
- Open source collaboration
- No authentication hassles

The `config.php` file with your API key is already excluded from git, so your secrets are safe.

