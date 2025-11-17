# 🎵 Lyric Lift

**AI-Powered Lyrics Enhancement Platform**

Lyric Lift is a comprehensive web application for songwriters to enhance their lyrics using AI, create video inspirations, practice with audio tracks, and register ownership on the blockchain.

**Website:** [lyriclift.com](https://lyriclift.com)

## ✨ Features

### 🎨 Lyrics Studio
- **Visual Text Highlighting**: Select text directly in the editor and mark it for AI enhancement
- **Rhyme Detection**: AI suggests internal rhymes, end rhymes, and slant rhymes
- **Multiple Alternatives**: Get 5-7 creative alternatives for each marked section
- **Rhyme Scheme Suggestions**: Receive recommendations for rhyme patterns (AABB, ABAB, etc.)
- **Version Control**: Save multiple versions of your songs with notes
- **Author Management**: Track multiple authors/collaborators per song

### 🎬 Video Inspiration
- **Image Search**: Search through your media library for matching images
- **AI Verse Generation**: Generate alternate verses based on selected images and sample lyrics
- **Editable Output**: Edit generated verses directly in the interface

### 🎤 Audio Studio
- **Multi-Track Player**: Loop multiple MP3 tracks simultaneously
- **Individual Controls**: Play/pause, loop toggle, and volume control for each track
- **Lyrics Display**: Large, editable lyrics display with adjustable font size
- **Auto-Scroll**: Automatic scrolling for hands-free singing practice
- **Track Type Detection**: Automatic icon assignment based on track name (guitar, drums, keyboard, etc.)

### ⛓️ Blockchain Registry
- **Ownership Proof**: Register songs to blockchain for permanent ownership records
- **Author Tracking**: View all registered songs with author information
- **Registration History**: See complete blockchain registration details

## 🚀 Quick Start

### Prerequisites
- PHP 7.4 or higher
- Web server (Apache/Nginx) or PHP built-in server
- OpenAI API key ([Get one here](https://platform.openai.com/api-keys))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/JustinHolm/lyriclift.git
   cd lyriclift
   ```

2. **Set up configuration**
   ```bash
   cp config.php.example config.php
   ```
   Edit `config.php` and add your OpenAI API key:
   ```php
   define('OPENAI_API_KEY', 'your-api-key-here');
   ```

3. **Create necessary directories**
   ```bash
   mkdir -p songs blockchain media mp3
   touch songs/.gitkeep blockchain/.gitkeep media/.gitkeep mp3/.gitkeep
   ```

4. **Set permissions** (Linux/Mac)
   ```bash
   chmod 755 songs blockchain media mp3
   ```

5. **Start development server**
   ```bash
   php -S localhost:8000 router.php
   ```

6. **Open in browser**
   ```
   http://localhost:8000
   ```

## 📁 Project Structure

```
lyriclift/
├── api/                    # API endpoints
│   ├── enhance-lyrics.php
│   ├── enhance-with-rhyme.php
│   ├── save-song.php
│   ├── get-songs.php
│   ├── get-song.php
│   ├── delete-song.php
│   ├── search-images.php
│   ├── generate-verses.php
│   ├── get-videos.php
│   ├── get-audio.php
│   └── blockchain-register.php
├── public/                 # Frontend files
│   ├── index.html          # Main lyrics studio
│   ├── video-inspiration.html
│   ├── video-gallery.html
│   ├── audio-player.html
│   ├── audio-studio.html
│   ├── blockchain-registry.html
│   ├── script.js
│   ├── styles.css
│   └── *.js                # Page-specific scripts
├── songs/                  # Saved songs (user data)
├── blockchain/             # Blockchain registrations
├── media/                  # Images and videos
├── mp3/                    # Audio tracks
├── config.php              # Configuration (not in git)
├── config.php.example      # Configuration template
├── router.php              # Development server router (local dev only)
├── index.php               # Production entry point
├── .htaccess               # Apache configuration
└── README.md
```

## 🌐 Deployment

### Hostinger Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions.

**Quick Steps:**
1. Upload all files to your Hostinger hosting
2. Create `config.php` from `config.php.example`
3. Set your OpenAI API key in `config.php`
4. Ensure `.htaccess` is active
5. Set proper folder permissions (755 for directories, 644 for files)

### Environment Variables (Alternative)

Instead of editing `config.php`, you can use environment variables:

```bash
export OPENAI_API_KEY="your-api-key-here"
```

Then in `config.php`:
```php
define('OPENAI_API_KEY', getenv('OPENAI_API_KEY') ?: 'fallback-key');
```

## 🔧 Configuration

### Required Settings

1. **OpenAI API Key**: Required for AI features
   - Get from: https://platform.openai.com/api-keys
   - Add to `config.php` or set as environment variable

2. **Folder Permissions**: 
   - `songs/`, `blockchain/`, `media/`, `mp3/` must be writable (755)

3. **PHP Settings**:
   - `upload_max_filesize` - For media uploads
   - `post_max_size` - For large lyrics
   - `max_execution_time` - For AI processing

## 📝 Usage

### Lyrics Enhancement

**Step-by-step guide:**
1. [ ] Paste your lyrics in the editor
2. [ ] Select text you want to enhance
3. [ ] Click "✨ Mark for Enhancement" (text will be highlighted in yellow)
4. [ ] Repeat for multiple sections (each will be highlighted)
5. [ ] Click "✨ Enhance Lyrics" to get AI suggestions
6. [ ] Review alternatives in dropdowns (includes rhyme type indicators)
7. [ ] Choose your preferred alternative from each dropdown
8. [ ] Click "✅ Apply Selected Lines" to update your lyrics
9. [ ] Continue editing or save your work

### Saving Songs

**Complete workflow:**
1. [ ] Click "💾 Save Current Song" button
2. [ ] Enter song title
3. [ ] Add authors:
   - [ ] Author name (required)
   - [ ] Email (optional)
   - [ ] Role (Primary Writer, Co-Writer, or Contributor)
   - [ ] Add more authors if needed
4. [ ] Check "Register to blockchain" if you want ownership proof
5. [ ] Add version notes (optional)
6. [ ] Choose "Save as new version" or update current version
7. [ ] Click "Save & Register"
8. [ ] Confirm success notification

### Audio Studio

**Using the audio studio:**
1. [ ] Navigate to Audio Studio from main menu
2. [ ] Audio tracks will load automatically from `/mp3` folder
3. [ ] Click play/pause button for each track you want to hear
4. [ ] Toggle loop on/off for each track
5. [ ] Adjust volume slider for each track
6. [ ] Load saved lyrics or paste new lyrics in the display area
7. [ ] Adjust font size slider for comfortable reading
8. [ ] Enable auto-scroll for hands-free practice
9. [ ] Practice singing along with the looped tracks

## 🔐 Security Notes

- **Never commit `config.php`** - It contains your API key
- Use `.gitignore` to exclude sensitive files
- Set proper file permissions on production
- Use HTTPS in production
- Consider rate limiting for API endpoints

## 🛠️ Development

### Local Development

```bash
# Start PHP development server
php -S localhost:8000 router.php

# Or use Apache/Nginx with proper configuration
```

### Testing

- Test all API endpoints
- Verify file uploads work
- Check blockchain registration flow
- Test on different browsers

## 📄 License

[Add your license here]

## 🤝 Contributing

[Add contribution guidelines here]

## 📧 Support

For issues and questions:
- GitHub Issues: https://github.com/JustinHolm/lyriclift/issues
- Website: https://lyriclift.com

## 🙏 Acknowledgments

- Powered by OpenAI GPT-4
- Built with PHP
- Font: Inter (Google Fonts)

---

**Made with ❤️ for songwriters**
