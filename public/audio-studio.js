document.addEventListener('DOMContentLoaded', function() {
    const audioTracksContainer = document.getElementById('audioTracksContainer');
    const lyricsDisplay = document.getElementById('lyricsDisplay');
    const loadLyricsBtn = document.getElementById('loadLyricsBtn');
    const pasteLyricsBtn = document.getElementById('pasteLyricsBtn');
    const lyricsSearch = document.getElementById('lyricsSearch');
    const savedSongsList = document.getElementById('savedSongsList');
    const fontSizeSlider = document.getElementById('fontSizeSlider');
    const fontSizeValue = document.getElementById('fontSizeValue');
    const autoScrollCheckbox = document.getElementById('autoScrollCheckbox');
    const clearLyricsBtn = document.getElementById('clearLyricsBtn');

    let audioElements = new Map();
    let audioTracks = [];
    let autoScrollInterval = null;
    let trackOrder = []; // Store custom track order

    // Load saved track order from localStorage
    function loadTrackOrder() {
        const saved = localStorage.getItem('audioTrackOrder');
        if (saved) {
            try {
                trackOrder = JSON.parse(saved);
            } catch (e) {
                trackOrder = [];
            }
        }
    }

    // Save track order to localStorage
    function saveTrackOrder() {
        localStorage.setItem('audioTrackOrder', JSON.stringify(trackOrder));
    }

    // Apply saved order to tracks
    function applyTrackOrder(tracks) {
        if (trackOrder.length === 0) {
            return tracks;
        }
        
        // Create a map for quick lookup
        const trackMap = new Map(tracks.map(t => [t.filename, t]));
        
        // Build ordered array
        const ordered = [];
        const used = new Set();
        
        // Add tracks in saved order
        for (const filename of trackOrder) {
            if (trackMap.has(filename)) {
                ordered.push(trackMap.get(filename));
                used.add(filename);
            }
        }
        
        // Add any new tracks not in saved order
        for (const track of tracks) {
            if (!used.has(track.filename)) {
                ordered.push(track);
            }
        }
        
        return ordered;
    }

    // Track type detection
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
    async function loadAudioFiles() {
        try {
            const response = await fetch('/api/get-audio.php');
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('API Error:', response.status, errorText);
                audioTracksContainer.innerHTML = `<p style="text-align: center; color: #e53e3e;">Error loading audio files (HTTP ${response.status}).<br><small>Check console for details.</small></p>`;
                return;
            }
            
            const data = await response.json();

            if (data.success && data.audioFiles && data.audioFiles.length > 0) {
                // Load saved order and apply it
                loadTrackOrder();
                const orderedTracks = applyTrackOrder(data.audioFiles);
                audioTracks = orderedTracks;
                displayAudioTracks(orderedTracks);
            } else if (data.error) {
                console.error('API returned error:', data.error);
                audioTracksContainer.innerHTML = `<p style="text-align: center; color: #e53e3e;">Error: ${data.error}</p>`;
            } else {
                audioTracksContainer.innerHTML = '<p style="text-align: center; color: #718096;">No audio files found in /mp3 folder.</p>';
            }
        } catch (error) {
            console.error('Error loading audio files:', error);
            audioTracksContainer.innerHTML = `<p style="text-align: center; color: #e53e3e;">Error loading audio files.<br><small>${error.message}</small></p>`;
        }
    }

    function displayAudioTracks(tracks) {
        audioTracksContainer.innerHTML = '';
        
        tracks.forEach((track, index) => {
            const trackInfo = getTrackIcon(track.filename);
            const escapedFilename = encodeURIComponent(track.filename);
            const audioUrl = `/mp3/${escapedFilename}`;
            
            const trackDiv = document.createElement('div');
            trackDiv.className = 'audio-track';
            trackDiv.id = `track-${index}`;
            trackDiv.draggable = true;
            trackDiv.dataset.index = index;
            trackDiv.dataset.filename = track.filename;
            
            trackDiv.innerHTML = `
                <div class="track-header">
                    <div class="drag-handle" title="Drag to reorder">
                        ⋮⋮
                    </div>
                    <div class="track-icon-small" style="background: ${trackInfo.color}20; border: 2px solid ${trackInfo.color};">
                        ${trackInfo.icon}
                    </div>
                    <div class="track-name" title="${track.filename}">${track.filename}</div>
                    <div class="track-controls-small">
                        <button class="play-pause-btn-small" id="play-pause-${index}" data-filename="${escapedFilename}">
                            <span class="play-icon">▶️</span>
                            <span class="pause-icon" style="display: none;">⏸️</span>
                        </button>
                        <label class="loop-toggle-small">
                            <input type="checkbox" id="loop-${index}" data-filename="${escapedFilename}" checked>
                            <span>🔁</span>
                        </label>
                        <div class="volume-control-small">
                            <input type="range" class="volume-slider" id="volume-${index}" min="0" max="100" value="100" data-filename="${escapedFilename}">
                            <span class="volume-value" id="volume-value-${index}">100%</span>
                        </div>
                    </div>
                </div>
            `;
            
            audioTracksContainer.appendChild(trackDiv);
            
            // Create audio element
            const audio = new Audio();
            audio.loop = true;
            audio.volume = 1.0;
            audio.preload = 'auto';
            audio.src = audioUrl;
            
            const audioData = {
                audio: audio,
                filename: track.filename,
                index: index,
                trackDiv: trackDiv,
                isPlaying: false,
                isLooping: true
            };
            
            audioElements.set(track.filename, audioData);
            
            // Drag and drop handlers
            trackDiv.addEventListener('dragstart', function(e) {
                // Don't drag if clicking on controls
                if (e.target.closest('.play-pause-btn-small, .loop-toggle-small, .volume-slider, .track-controls-small')) {
                    e.preventDefault();
                    return false;
                }
                
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', index.toString());
                this.classList.add('dragging');
            });
            
            trackDiv.addEventListener('dragend', function(e) {
                this.classList.remove('dragging');
                // Remove all drag-over classes
                document.querySelectorAll('.audio-track').forEach(t => t.classList.remove('drag-over'));
            });
            
            trackDiv.addEventListener('dragover', function(e) {
                // Don't allow drop on controls
                if (e.target.closest('.play-pause-btn-small, .loop-toggle-small, .volume-slider, .track-controls-small')) {
                    return;
                }
                
                if (e.preventDefault) {
                    e.preventDefault();
                }
                e.dataTransfer.dropEffect = 'move';
                this.classList.add('drag-over');
                return false;
            });
            
            trackDiv.addEventListener('dragleave', function(e) {
                // Only remove drag-over if we're actually leaving the track
                const rect = this.getBoundingClientRect();
                const x = e.clientX;
                const y = e.clientY;
                if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
                    this.classList.remove('drag-over');
                }
            });
            
            trackDiv.addEventListener('drop', function(e) {
                // Don't allow drop on controls
                if (e.target.closest('.play-pause-btn-small, .loop-toggle-small, .volume-slider, .track-controls-small')) {
                    return;
                }
                
                if (e.stopPropagation) {
                    e.stopPropagation();
                }
                
                const draggedIndex = parseInt(e.dataTransfer.getData('text/plain'));
                const dropIndex = index;
                
                if (!isNaN(draggedIndex) && draggedIndex !== dropIndex) {
                    // Swap tracks in array
                    [audioTracks[draggedIndex], audioTracks[dropIndex]] = [audioTracks[dropIndex], audioTracks[draggedIndex]];
                    
                    // Update track order array
                    trackOrder = audioTracks.map(t => t.filename);
                    saveTrackOrder();
                    
                    // Re-render tracks
                    displayAudioTracks(audioTracks);
                    
                    showNotification('Track order updated!', 'success');
                }
                
                this.classList.remove('drag-over');
                return false;
            });
            
            // Play/Pause button
            const playPauseBtn = trackDiv.querySelector(`#play-pause-${index}`);
            playPauseBtn.addEventListener('click', function() {
                toggleAudio(audioData);
            });
            
            // Loop toggle
            const loopCheckbox = trackDiv.querySelector(`#loop-${index}`);
            loopCheckbox.addEventListener('change', function() {
                audio.loop = this.checked;
                audioData.isLooping = this.checked;
            });
            
            // Volume control
            const volumeSlider = trackDiv.querySelector(`#volume-${index}`);
            const volumeValue = trackDiv.querySelector(`#volume-value-${index}`);
            volumeSlider.addEventListener('input', function() {
                const volume = this.value / 100;
                audio.volume = volume;
                volumeValue.textContent = this.value + '%';
            });
        });
    }

    function toggleAudio(audioData) {
        const { audio, trackDiv, isPlaying } = audioData;
        const playPauseBtn = trackDiv.querySelector(`#play-pause-${audioData.index}`);
        const playIcon = playPauseBtn.querySelector('.play-icon');
        const pauseIcon = playPauseBtn.querySelector('.pause-icon');
        
        if (isPlaying) {
            audio.pause();
            audioData.isPlaying = false;
            trackDiv.classList.remove('playing');
            playIcon.style.display = 'inline';
            pauseIcon.style.display = 'none';
        } else {
            const playPromise = audio.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    audioData.isPlaying = true;
                    trackDiv.classList.add('playing');
                    playIcon.style.display = 'none';
                    pauseIcon.style.display = 'inline';
                }).catch(error => {
                    console.error('Play error:', error);
                    showNotification('Error playing audio. Please interact with the page first.', 'error');
                });
            }
        }
    }

    // Lyrics management
    async function loadSavedSongs() {
        try {
            const response = await fetch('/api/get-songs.php');
            const data = await response.json();
            
            if (data.success && data.songs && data.songs.length > 0) {
                displaySavedSongs(data.songs);
                savedSongsList.style.display = 'block';
            } else {
                showNotification('No saved songs found', 'info');
            }
        } catch (error) {
            console.error('Error loading songs:', error);
            showNotification('Error loading saved songs', 'error');
        }
    }

    function displaySavedSongs(songs) {
        savedSongsList.innerHTML = '';
        
        songs.forEach(song => {
            const songItem = document.createElement('div');
            songItem.className = 'saved-song-item';
            songItem.innerHTML = `
                <div class="saved-song-title">${song.title}</div>
                <div class="saved-song-preview">${(song.preview || '').substring(0, 60)}...</div>
            `;
            
            songItem.addEventListener('click', async function() {
                await loadSong(song.id);
                savedSongsList.style.display = 'none';
            });
            
            savedSongsList.appendChild(songItem);
        });
    }

    async function loadSong(songId) {
        try {
            const response = await fetch(`/api/get-song.php?id=${songId}`);
            const data = await response.json();
            
            if (data.success && data.currentVersion) {
                lyricsDisplay.textContent = data.currentVersion.lyrics || '';
                showNotification('Lyrics loaded!', 'success');
            }
        } catch (error) {
            console.error('Error loading song:', error);
            showNotification('Error loading song', 'error');
        }
    }

    // Search functionality
    lyricsSearch.addEventListener('input', async function() {
        const query = this.value.trim().toLowerCase();
        
        if (query.length < 2) {
            savedSongsList.style.display = 'none';
            return;
        }
        
        try {
            const response = await fetch('/api/get-songs.php');
            const data = await response.json();
            
            if (data.success && data.songs) {
                const filtered = data.songs.filter(song => 
                    song.title.toLowerCase().includes(query) ||
                    (song.preview && song.preview.toLowerCase().includes(query))
                );
                
                if (filtered.length > 0) {
                    displaySavedSongs(filtered);
                    savedSongsList.style.display = 'block';
                } else {
                    savedSongsList.style.display = 'none';
                }
            }
        } catch (error) {
            console.error('Search error:', error);
        }
    });

    // Paste lyrics
    pasteLyricsBtn.addEventListener('click', function() {
        lyricsDisplay.focus();
        showNotification('Paste your lyrics into the display area', 'info');
    });

    // Font size control
    fontSizeSlider.addEventListener('input', function() {
        const size = this.value;
        lyricsDisplay.style.fontSize = size + 'px';
        fontSizeValue.textContent = size + 'px';
    });

    // Auto-scroll
    autoScrollCheckbox.addEventListener('change', function() {
        if (this.checked) {
            startAutoScroll();
        } else {
            stopAutoScroll();
        }
    });

    function startAutoScroll() {
        stopAutoScroll();
        autoScrollInterval = setInterval(() => {
            if (lyricsDisplay.scrollTop < lyricsDisplay.scrollHeight - lyricsDisplay.clientHeight) {
                lyricsDisplay.scrollTop += 2;
            } else {
                lyricsDisplay.scrollTop = 0; // Loop back to top
            }
        }, 100);
    }

    function stopAutoScroll() {
        if (autoScrollInterval) {
            clearInterval(autoScrollInterval);
            autoScrollInterval = null;
        }
    }

    // Clear lyrics
    clearLyricsBtn.addEventListener('click', function() {
        if (confirm('Clear all lyrics?')) {
            lyricsDisplay.textContent = '';
            stopAutoScroll();
        }
    });

    // Notification function
    function showNotification(message, type = 'info') {
        // Simple notification - you can enhance this
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: ${type === 'error' ? '#e53e3e' : type === 'success' ? '#38a169' : '#667eea'};
            color: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 10000;
            font-weight: 500;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    // Initialize
    loadAudioFiles();
    loadLyricsBtn.addEventListener('click', loadSavedSongs);
});

