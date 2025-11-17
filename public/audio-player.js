document.addEventListener('DOMContentLoaded', function() {
    const audioPlayerContainer = document.getElementById('audioPlayerContainer');
    const playAllBtn = document.getElementById('playAllBtn');
    const stopAllBtn = document.getElementById('stopAllBtn');

    let audioElements = new Map(); // Store audio elements by filename
    let audioTracks = []; // Store track data

    // Function to detect track type and return icon
    function getTrackIcon(filename) {
        const lower = filename.toLowerCase();
        
        if (lower.includes('guitar') || lower.includes('gtr') || lower.includes('acoustic') || lower.includes('elec')) {
            return { icon: '🎸', type: 'Guitar', color: '#e53e3e' };
        }
        if (lower.includes('drum') || lower.includes('kit') || lower.includes('percussion') || lower.includes('snare') || lower.includes('kick')) {
            return { icon: '🥁', type: 'Drums', color: '#d69e2e' };
        }
        if (lower.includes('keyboard') || lower.includes('piano') || lower.includes('keys') || lower.includes('synth')) {
            return { icon: '🎹', type: 'Keyboard', color: '#805ad5' };
        }
        if (lower.includes('bass')) {
            return { icon: '🎸', type: 'Bass', color: '#2c5282' };
        }
        if (lower.includes('vocal') || lower.includes('voice') || lower.includes('sing')) {
            return { icon: '🎤', type: 'Vocals', color: '#c53030' };
        }
        if (lower.includes('violin') || lower.includes('viola') || lower.includes('cello')) {
            return { icon: '🎻', type: 'Strings', color: '#b7791f' };
        }
        if (lower.includes('trumpet') || lower.includes('sax') || lower.includes('horn') || lower.includes('brass')) {
            return { icon: '🎺', type: 'Brass', color: '#d69e2e' };
        }
        if (lower.includes('analog') || lower.includes('session')) {
            return { icon: '🎚️', type: 'Session', color: '#38a169' };
        }
        
        return { icon: '🎵', type: 'Audio', color: '#667eea' };
    }

    // Load audio files
    loadAudioFiles();

    async function loadAudioFiles() {
        try {
            const response = await fetch('/api/get-audio.php');
            const data = await response.json();

            if (data.success) {
                displayAudioTracks(data.audioFiles);
                audioTracks = data.audioFiles;
            } else {
                showError(data.error || 'Failed to load audio files');
            }
        } catch (error) {
            console.error('Error:', error);
            showError('Network error. Please try again.');
        }
    }

    function displayAudioTracks(audioFiles) {
        audioPlayerContainer.innerHTML = '';

        if (audioFiles.length === 0) {
            audioPlayerContainer.innerHTML = `
                <div class="empty-state">
                    <h3>No audio files found</h3>
                    <p>Add audio files (.mp3, .wav, .ogg, etc.) to the media folder to see them here.</p>
                </div>
            `;
            return;
        }

        audioFiles.forEach((audioFile, index) => {
            const trackDiv = document.createElement('div');
            trackDiv.className = 'audio-track';
            trackDiv.id = `track-${index}`;
            
            // Encode filename for URL (handles spaces and special characters)
            const encodedFilename = encodeURIComponent(audioFile.filename);
            const audioUrl = `/mp3/${encodedFilename}`;
            const sizeMB = (audioFile.size / (1024 * 1024)).toFixed(2);
            const modifiedDate = new Date(audioFile.modified * 1000).toLocaleDateString();
            
            // Get track icon and type
            const trackInfo = getTrackIcon(audioFile.filename);
            
            // Escape HTML for display
            const escapedFilename = audioFile.filename
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;');
            const escapedDescription = (audioFile.description || 'No description')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;');
            
            trackDiv.innerHTML = `
                <div class="track-icon" style="background: ${trackInfo.color}20; border: 2px solid ${trackInfo.color};">
                    <span style="font-size: 32px;">${trackInfo.icon}</span>
                    <span class="track-type-label">${trackInfo.type}</span>
                </div>
                <div class="track-controls">
                    <button class="play-pause-btn" id="play-pause-${index}" data-filename="${escapedFilename}" title="Play/Pause">
                        <span class="play-icon">▶️</span>
                        <span class="pause-icon" style="display: none;">⏸️</span>
                    </button>
                    <label class="loop-toggle" title="Loop">
                        <input type="checkbox" id="loop-${index}" data-filename="${escapedFilename}" checked>
                        <span class="loop-label">🔁</span>
                    </label>
                    <span class="status-indicator stopped" id="status-${index}"></span>
                </div>
                <div class="track-info">
                    <div class="track-title" title="${escapedFilename}">${escapedFilename}</div>
                    <div class="track-description">${escapedDescription}</div>
                    <div class="track-meta">${sizeMB} MB • ${modifiedDate}</div>
                </div>
                <div class="volume-control">
                    <input 
                        type="range" 
                        class="volume-slider" 
                        id="volume-${index}" 
                        min="0" 
                        max="100" 
                        value="100"
                        data-filename="${escapedFilename}"
                    >
                    <span class="volume-value" id="volume-value-${index}">100%</span>
                </div>
            `;

            // Create audio element
            const audio = new Audio();
            audio.loop = true; // Default to loop
            audio.volume = 1.0;
            audio.preload = 'auto';
            
            // Set the source after creating the element
            audio.src = audioUrl;
            
            // Store both original and encoded filename
            audioElements.set(audioFile.filename, {
                element: audio,
                trackDiv: trackDiv,
                index: index,
                encodedUrl: audioUrl,
                originalFilename: audioFile.filename,
                isPlaying: false
            });
            
            // Log for debugging
            console.log(`Created audio element for: ${audioFile.filename}`, `URL: ${audioUrl}`);

            // Setup event listeners
            const playPauseBtn = trackDiv.querySelector(`#play-pause-${index}`);
            const loopToggle = trackDiv.querySelector(`#loop-${index}`);
            const volumeSlider = trackDiv.querySelector(`#volume-${index}`);
            const volumeValue = trackDiv.querySelector(`#volume-value-${index}`);
            const statusIndicator = trackDiv.querySelector(`#status-${index}`);
            const playIcon = playPauseBtn.querySelector('.play-icon');
            const pauseIcon = playPauseBtn.querySelector('.pause-icon');

            // Play/Pause button
            playPauseBtn.addEventListener('click', function() {
                const filename = this.dataset.filename;
                const audioData = audioElements.get(filename);
                
                if (!audioData) return;
                
                if (audioData.isPlaying) {
                    stopAudio(filename);
                } else {
                    playAudio(filename);
                }
            });

            // Loop toggle
            loopToggle.addEventListener('change', function() {
                const filename = this.dataset.filename;
                const audioData = audioElements.get(filename);
                
                if (audioData) {
                    audioData.element.loop = this.checked;
                    const loopLabel = trackDiv.querySelector(`#loop-${index} + .loop-label`);
                    if (loopLabel) {
                        loopLabel.textContent = this.checked ? '🔁' : '➡️';
                        loopLabel.title = this.checked ? 'Loop: On' : 'Loop: Off (Play Once)';
                    }
                }
            });

            // Volume control
            volumeSlider.addEventListener('input', function() {
                const filename = this.dataset.filename;
                const volume = this.value / 100;
                const audioData = audioElements.get(filename);
                
                if (audioData) {
                    audioData.element.volume = volume;
                    volumeValue.textContent = this.value + '%';
                }
            });

            // Audio event listeners
            audio.addEventListener('play', function() {
                const audioData = audioElements.get(audioFile.filename);
                if (audioData) {
                    audioData.isPlaying = true;
                }
                statusIndicator.classList.remove('stopped');
                statusIndicator.classList.add('playing');
                trackDiv.classList.add('playing');
                playIcon.style.display = 'none';
                pauseIcon.style.display = 'inline';
            });

            audio.addEventListener('pause', function() {
                const audioData = audioElements.get(audioFile.filename);
                if (audioData) {
                    audioData.isPlaying = false;
                }
                statusIndicator.classList.remove('playing');
                statusIndicator.classList.add('stopped');
                trackDiv.classList.remove('playing');
                playIcon.style.display = 'inline';
                pauseIcon.style.display = 'none';
            });

            audio.addEventListener('ended', function() {
                // Only handle if not looping
                if (!audio.loop) {
                    const audioData = audioElements.get(audioFile.filename);
                    if (audioData) {
                        audioData.isPlaying = false;
                    }
                    statusIndicator.classList.remove('playing');
                    statusIndicator.classList.add('stopped');
                    trackDiv.classList.remove('playing');
                    const playIconEl = trackDiv.querySelector(`#play-pause-${index} .play-icon`);
                    const pauseIconEl = trackDiv.querySelector(`#play-pause-${index} .pause-icon`);
                    if (playIconEl) playIconEl.style.display = 'inline';
                    if (pauseIconEl) pauseIconEl.style.display = 'none';
                }
            });

            audio.addEventListener('error', function(e) {
                const error = audio.error;
                let errorMessage = `Error loading ${audioFile.filename}`;
                
                if (error) {
                    switch(error.code) {
                        case error.MEDIA_ERR_ABORTED:
                            errorMessage = `Playback aborted: ${audioFile.filename}`;
                            break;
                        case error.MEDIA_ERR_NETWORK:
                            errorMessage = `Network error: ${audioFile.filename}`;
                            break;
                        case error.MEDIA_ERR_DECODE:
                            errorMessage = `Decode error: ${audioFile.filename}`;
                            break;
                        case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
                            errorMessage = `Format not supported: ${audioFile.filename}`;
                            break;
                        default:
                            errorMessage = `Unknown error: ${audioFile.filename}`;
                    }
                }
                
                console.error('Audio error:', errorMessage, error, e);
                const audioData = audioElements.get(audioFile.filename);
                if (audioData) {
                    audioData.isPlaying = false;
                }
                playIcon.style.display = 'inline';
                pauseIcon.style.display = 'none';
                statusIndicator.classList.remove('playing');
                statusIndicator.classList.add('stopped');
                trackDiv.classList.remove('playing');
                showNotification(errorMessage, 'error');
            });

            // Add load event to check if file loads successfully
            audio.addEventListener('canplaythrough', function() {
                console.log(`Audio loaded successfully: ${audioFile.filename}`);
            });

            audio.addEventListener('loadstart', function() {
                console.log(`Loading audio: ${audioFile.filename} from ${audioUrl}`);
            });

            audio.addEventListener('loadeddata', function() {
                console.log(`Audio data loaded: ${audioFile.filename}`);
            });

            audio.addEventListener('stalled', function() {
                console.warn(`Audio stalled: ${audioFile.filename}`);
            });

            audio.addEventListener('suspend', function() {
                console.warn(`Audio loading suspended: ${audioFile.filename}`);
            });

            audioPlayerContainer.appendChild(trackDiv);
        });
    }

    function playAudio(filename) {
        const audioData = audioElements.get(filename);
        if (!audioData) {
            console.error('Audio data not found for:', filename);
            return;
        }

        const audio = audioData.element;
        
        // Check if audio is ready
        if (audio.readyState === 0) {
            // Audio not loaded yet, wait for it
            audio.addEventListener('canplay', function onCanPlay() {
                audio.removeEventListener('canplay', onCanPlay);
                playAudioFile(audio, audioData, filename);
            }, { once: true });
            
            // Also handle errors during loading
            audio.addEventListener('error', function onError() {
                audio.removeEventListener('error', onError);
                const playPauseBtn = audioData.trackDiv.querySelector(`#play-pause-${audioData.index}`);
                if (playPauseBtn) {
                    const playIcon = playPauseBtn.querySelector('.play-icon');
                    const pauseIcon = playPauseBtn.querySelector('.pause-icon');
                    if (playIcon) playIcon.style.display = 'inline';
                    if (pauseIcon) pauseIcon.style.display = 'none';
                }
                audioData.isPlaying = false;
            }, { once: true });
        } else {
            playAudioFile(audio, audioData, filename);
        }
    }

    function playAudioFile(audio, audioData, filename) {
        // Play the audio
        const playPromise = audio.play();
        
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.error('Play error:', error);
                let errorMsg = `Error playing ${filename}`;
                
                if (error.name === 'NotAllowedError') {
                    errorMsg = `Autoplay blocked. Please interact with the page first.`;
                } else if (error.name === 'NotSupportedError') {
                    errorMsg = `Audio format not supported: ${filename}`;
                }
                
                showNotification(errorMsg, 'error');
                // Reset play button
                const playPauseBtn = audioData.trackDiv.querySelector(`#play-pause-${audioData.index}`);
                if (playPauseBtn) {
                    const playIcon = playPauseBtn.querySelector('.play-icon');
                    const pauseIcon = playPauseBtn.querySelector('.pause-icon');
                    if (playIcon) playIcon.style.display = 'inline';
                    if (pauseIcon) pauseIcon.style.display = 'none';
                }
                audioData.isPlaying = false;
            });
        }
    }

    function stopAudio(filename) {
        const audioData = audioElements.get(filename);
        if (!audioData) return;

        const audio = audioData.element;
        audio.pause();
        audio.currentTime = 0; // Reset to beginning
    }

    // Global controls
    playAllBtn.addEventListener('click', function() {
        audioElements.forEach((audioData, filename) => {
            if (!audioData.isPlaying) {
                playAudio(filename);
            }
        });
        showNotification('All tracks playing', 'success');
    });

    stopAllBtn.addEventListener('click', function() {
        audioElements.forEach((audioData, filename) => {
            if (audioData.isPlaying) {
                stopAudio(filename);
            }
        });
        showNotification('All tracks stopped', 'info');
    });

    function showError(message) {
        audioPlayerContainer.innerHTML = `
            <div class="empty-state">
                <h3>Error</h3>
                <p>${message}</p>
            </div>
        `;
    }

    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: ${type === 'success' ? '#48bb78' : type === 'error' ? '#f56565' : type === 'warning' ? '#ed8936' : '#4299e1'};
            color: white;
            border-radius: 8px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            animation: slideIn 0.3s ease;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // Cleanup on page unload
    window.addEventListener('beforeunload', function() {
        audioElements.forEach((audioData, filename) => {
            audioData.element.pause();
            audioData.element.src = '';
        });
    });
});

