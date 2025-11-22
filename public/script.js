document.addEventListener('DOMContentLoaded', function() {
    const lyricsInput = document.getElementById('lyricsInput');
    const enhanceBtn = document.getElementById('enhanceBtn');
    const outputSection = document.getElementById('outputSection');
    const enhancedLyrics = document.getElementById('enhancedLyrics');
    const clearBtn = document.getElementById('clearBtn');
    const markBtn = document.getElementById('markForEnhancementBtn');
    const clearMarksBtn = document.getElementById('clearMarksBtn');

    // ============================================
    // VISUAL HIGHLIGHTING FUNCTIONALITY
    // ============================================
    
    // Update mark button state based on selection
    function updateMarkButtonState() {
        const selection = window.getSelection();
        const hasSelection = selection.toString().trim().length > 0;
        const isInEditor = lyricsInput.contains(selection.anchorNode) || 
                          (selection.anchorNode && lyricsInput.contains(selection.anchorNode.parentNode));
        
        markBtn.disabled = !hasSelection || !isInEditor;
    }
    
    // Listen for selection changes
    lyricsInput.addEventListener('mouseup', updateMarkButtonState);
    lyricsInput.addEventListener('keyup', updateMarkButtonState);
    document.addEventListener('selectionchange', updateMarkButtonState);
    
    // Mark selected text for enhancement
    markBtn.addEventListener('click', function() {
        const selection = window.getSelection();
        
        if (selection.rangeCount === 0 || selection.toString().trim().length === 0) {
            showNotification('Please select some text first!', 'warning');
            return;
        }
        
        const range = selection.getRangeAt(0);
        
        // Check if selection is within the editor
        if (!lyricsInput.contains(range.commonAncestorContainer)) {
            showNotification('Please select text within the lyrics editor', 'warning');
            return;
        }
        
        // Don't mark if already inside a marked element
        let node = range.commonAncestorContainer;
        while (node && node !== lyricsInput) {
            if (node.nodeType === 1 && node.classList && node.classList.contains('marked-for-enhancement')) {
                showNotification('This text is already marked!', 'info');
                return;
            }
            node = node.parentNode;
        }
        
        // Create marked span
        const markedSpan = document.createElement('span');
        markedSpan.className = 'marked-for-enhancement';
        markedSpan.setAttribute('data-marked', 'true');
        
        try {
            range.surroundContents(markedSpan);
            showNotification('Text marked for enhancement! ✨', 'success');
            
            // Clear selection
            selection.removeAllRanges();
            updateMarkButtonState();
        } catch (e) {
            // If surroundContents fails (crosses boundaries), use extractContents
            const contents = range.extractContents();
            markedSpan.appendChild(contents);
            range.insertNode(markedSpan);
            selection.removeAllRanges();
            updateMarkButtonState();
            showNotification('Text marked for enhancement! ✨', 'success');
        }
    });
    
    // Clear all marks
    clearMarksBtn.addEventListener('click', function() {
        const markedElements = lyricsInput.querySelectorAll('.marked-for-enhancement');
        if (markedElements.length === 0) {
            showNotification('No marks to clear!', 'info');
            return;
        }
        
        markedElements.forEach(marked => {
            const parent = marked.parentNode;
            while (marked.firstChild) {
                parent.insertBefore(marked.firstChild, marked);
            }
            parent.removeChild(marked);
            // Normalize to merge adjacent text nodes
            parent.normalize();
        });
        showNotification(`Cleared ${markedElements.length} mark(s)!`, 'success');
    });
    
    // Convert marked text to <insert> tags for API
    function getLyricsWithInsertTags() {
        const editorContent = lyricsInput.cloneNode(true);
        const markedElements = editorContent.querySelectorAll('.marked-for-enhancement');
        
        markedElements.forEach(marked => {
            const text = marked.textContent || marked.innerText;
            const insertTag = document.createTextNode(text + ' <insert>');
            marked.parentNode.replaceChild(insertTag, marked);
        });
        
        return editorContent.textContent || editorContent.innerText || '';
    }
    
    // Handle paste events to preserve formatting
    lyricsInput.addEventListener('paste', function(e) {
        e.preventDefault();
        const text = (e.clipboardData || window.clipboardData).getData('text/plain');
        document.execCommand('insertText', false, text);
    });
    
    // Handle placeholder for contenteditable
    function updatePlaceholder() {
        const text = lyricsInput.textContent || lyricsInput.innerText || '';
        if (text.trim() === '') {
            lyricsInput.classList.add('empty');
        } else {
            lyricsInput.classList.remove('empty');
        }
    }
    
    lyricsInput.addEventListener('input', updatePlaceholder);
    lyricsInput.addEventListener('blur', updatePlaceholder);
    updatePlaceholder();

    // Enhance lyrics button click handler
    enhanceBtn.addEventListener('click', async function() {
        const lyrics = getLyricsWithInsertTags().trim();
        
        if (!lyrics) {
            showNotification('Please enter some lyrics first!', 'error');
            return;
        }

        if (!lyrics.includes('<insert>')) {
            showNotification('No text marked for enhancement. Select text and click "Mark for Enhancement"!', 'warning');
            return;
        }

        // Show loading state
        setLoadingState(enhanceBtn, true);
        
        try {
            // Try enhanced API with rhyme detection first
            let response = await fetch('/api/enhance-with-rhyme.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ lyrics })
            });
            
            // If enhanced API fails, fall back to basic API
            if (!response.ok) {
                response = await fetch('/api/enhance-lyrics.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ lyrics })
                });
            }

            // Check if response is OK before parsing JSON
            if (!response.ok) {
                const errorText = await response.text();
                let errorData;
                try {
                    errorData = JSON.parse(errorText);
                } catch (e) {
                    // Response is not valid JSON - likely config.php output issue
                    showNotification(`Network error (HTTP ${response.status}). Check server configuration.`, 'error');
                    console.error('Invalid JSON response:', errorText.substring(0, 200));
                    setLoadingState(enhanceBtn, false);
                    return;
                }
                const errorMsg = errorData.details || errorData.error || 'Failed to enhance lyrics';
                showNotification(`Error: ${errorMsg}`, 'error');
                setLoadingState(enhanceBtn, false);
                return;
            }

            let data;
            try {
                const responseText = await response.text();
                data = JSON.parse(responseText);
            } catch (e) {
                // JSON parse error - likely config.php output issue
                showNotification('Network error. Invalid response from server. Check server configuration.', 'error');
                console.error('JSON parse error:', e.message);
                setLoadingState(enhanceBtn, false);
                return;
            }

            if (data.success) {
                outputSection.style.display = 'block';
                
                // Check if we have rhyme-enhanced sections
                if (data.sections && data.sections.length > 0) {
                    // Display with rhyme indicators
                    displayLyricsWithRhyme(data.originalLyrics, data.sections);
                    showNotification('Select your preferred alternatives with rhyme suggestions! 🎵', 'success');
                } else if (data.alternatives && !data.fallback) {
                    // Display with dropdowns (basic enhancement)
                    displayLyricsWithDropdowns(data.originalLyrics, data.alternatives);
                    showNotification('Select your preferred alternatives from the dropdowns! 🎵', 'success');
                } else {
                    // Fallback: display as simple text
                    enhancedLyrics.innerHTML = '<div class="fallback-message">' + escapeHtml(data.enhancedLyrics || data.originalLyrics) + '</div>';
                    document.getElementById('finalLyrics').textContent = data.enhancedLyrics || data.originalLyrics;
                    document.getElementById('applySelectionsBtn').style.display = 'none';
                    showNotification('Lyrics enhanced successfully! 🎵', 'success');
                }
                
                // Scroll to output section
                outputSection.scrollIntoView({ behavior: 'smooth' });
            } else {
                // Show detailed error message
                const errorMsg = data.details || data.error || 'Failed to enhance lyrics';
                const errorCode = data.code ? ` (Code: ${data.code})` : '';
                showNotification(errorMsg + errorCode, 'error');
                console.error('API Error:', data);
            }
        } catch (error) {
            console.error('Error:', error);
            showNotification('Network error. Please try again.', 'error');
        } finally {
            setLoadingState(enhanceBtn, false);
        }
    });

    // Clear button click handler
    clearBtn.addEventListener('click', function() {
        lyricsInput.innerHTML = '';
        lyricsInput.textContent = '';
        outputSection.style.display = 'none';
        enhancedLyrics.innerHTML = '';
        document.getElementById('finalLyrics').textContent = '';
        updatePlaceholder();
        showNotification('All content cleared!', 'info');
    });


    // Enter key handler for textarea
    lyricsInput.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.key === 'Enter') {
            enhanceBtn.click();
        }
    });

    // Set loading state for any button
    function setLoadingState(button, isLoading) {
        const btnText = button.querySelector('.btn-text');
        const btnLoading = button.querySelector('.btn-loading');
        
        if (isLoading) {
            button.disabled = true;
            btnText.style.display = 'none';
            btnLoading.style.display = 'flex';
        } else {
            button.disabled = false;
            btnText.style.display = 'inline';
            btnLoading.style.display = 'none';
        }
    }

    // Show notification
    function showNotification(message, type = 'info') {
        // Remove existing notifications
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <span class="notification-message">${message}</span>
            <button class="notification-close">&times;</button>
        `;

        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${getNotificationColor(type)};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1000;
            display: flex;
            align-items: center;
            gap: 15px;
            max-width: 400px;
            animation: slideIn 0.3s ease-out;
        `;

        // Add close button styles
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.style.cssText = `
            background: none;
            border: none;
            color: white;
            font-size: 20px;
            cursor: pointer;
            padding: 0;
            line-height: 1;
        `;

        // Add close functionality
        closeBtn.addEventListener('click', () => {
            notification.remove();
        });

        // Add to page
        document.body.appendChild(notification);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    // Get notification color based on type
    function getNotificationColor(type) {
        switch (type) {
            case 'success': return '#48bb78';
            case 'error': return '#f56565';
            case 'warning': return '#ed8936';
            case 'info': return '#4299e1';
            default: return '#4299e1';
        }
    }

    // Add CSS animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
    `;
    document.head.appendChild(style);

    // Add example lyrics on double-click of placeholder
    lyricsInput.addEventListener('dblclick', function() {
        const text = (this.textContent || this.innerText || '').trim();
        if (text === '') {
            const exampleLyrics = `I'm walking down the street
Looking for something sweet
The sun is shining bright
But my heart feels so tight`;
            this.textContent = exampleLyrics;
            updatePlaceholder();
            showNotification('Example lyrics loaded! Select text and mark for enhancement.', 'info');
        }
    });

    // Add keyboard shortcuts info
    const shortcutsInfo = document.createElement('div');
    shortcutsInfo.innerHTML = `
        <div style="margin-top: 20px; padding: 15px; background: #f0f4ff; border-radius: 8px; border-left: 4px solid #4299e1;">
            <strong>💡 Pro Tips:</strong>
            <ul style="margin: 10px 0 0 20px; color: #4a5568;">
                <li>Use Ctrl+Enter to quickly enhance lyrics</li>
                <li>Double-click the editor to load example lyrics</li>
                <li>Select text and click "Mark for Enhancement" to highlight sections</li>
                <li>You can mark multiple sections - each will be highlighted in yellow</li>
            </ul>
        </div>
    `;
    
    // Insert after the example section
    const exampleSection = document.querySelector('.example-section');
    exampleSection.parentNode.insertBefore(shortcutsInfo, exampleSection.nextSibling);
    
    // ============================================
    // SONG SAVE/LOAD FUNCTIONALITY
    // ============================================
    
    let currentSongId = null;
    const saveSongBtn = document.getElementById('saveSongBtn');
    const loadSongsBtn = document.getElementById('loadSongsBtn');
    const songsList = document.getElementById('songsList');
    const saveSongModal = document.getElementById('saveSongModal');
    const songTitleInput = document.getElementById('songTitleInput');
    const versionNotesInput = document.getElementById('versionNotesInput');
    const saveAsNewVersionCheckbox = document.getElementById('saveAsNewVersionCheckbox');
    const registerBlockchainCheckbox = document.getElementById('registerBlockchainCheckbox');
    const confirmSaveBtn = document.getElementById('confirmSaveBtn');
    const cancelSaveBtn = document.getElementById('cancelSaveBtn');
    const authorsList = document.getElementById('authorsList');
    const addAuthorBtn = document.getElementById('addAuthorBtn');
    const versionHistoryModal = document.getElementById('versionHistoryModal');
    const versionHistoryList = document.getElementById('versionHistoryList');
    const versionHistoryTitle = document.getElementById('versionHistoryTitle');
    const closeVersionHistoryBtn = document.getElementById('closeVersionHistoryBtn');
    const currentVersionInfo = document.getElementById('currentVersionInfo');
    
    // Authors management functionality
    function addAuthorInput() {
        const authorInput = document.createElement('div');
        authorInput.className = 'author-input';
        authorInput.innerHTML = `
            <input type="text" class="author-name" placeholder="Author name" required>
            <input type="email" class="author-email" placeholder="Email (optional)">
            <select class="author-role">
                <option value="primary">Primary Writer</option>
                <option value="co-writer">Co-Writer</option>
                <option value="contributor">Contributor</option>
            </select>
            <button type="button" class="remove-author-btn">×</button>
        `;
        
        const removeBtn = authorInput.querySelector('.remove-author-btn');
        removeBtn.addEventListener('click', function() {
            authorInput.remove();
            updateRemoveButtons();
        });
        
        authorsList.appendChild(authorInput);
        updateRemoveButtons();
    }
    
    function updateRemoveButtons() {
        const authorInputs = authorsList.querySelectorAll('.author-input');
        authorInputs.forEach((input, index) => {
            const removeBtn = input.querySelector('.remove-author-btn');
            removeBtn.style.display = authorInputs.length > 1 ? 'block' : 'none';
        });
    }
    
    function getAuthors() {
        const authors = [];
        const authorInputs = authorsList.querySelectorAll('.author-input');
        authorInputs.forEach(input => {
            const name = input.querySelector('.author-name').value.trim();
            const email = input.querySelector('.author-email').value.trim();
            const role = input.querySelector('.author-role').value;
            
            if (name) {
                authors.push({
                    name: name,
                    email: email || null,
                    role: role
                });
            }
        });
        return authors;
    }
    
    addAuthorBtn.addEventListener('click', addAuthorInput);
    
    // Initialize with one author input
    updateRemoveButtons();
    
    // Save song functionality
    saveSongBtn.addEventListener('click', function() {
        const lyrics = (lyricsInput.textContent || lyricsInput.innerText || '').trim();
        const enhanced = enhancedLyrics.textContent.trim();
        
        if (!lyrics) {
            showNotification('No lyrics to save!', 'warning');
            return;
        }
        
        // Pre-fill title if we have a current song
        if (currentSongId) {
            // Title will be loaded when modal opens
        } else {
            songTitleInput.value = 'Untitled Song';
        }
        
        saveSongModal.style.display = 'flex';
        songTitleInput.focus();
    });
    
    confirmSaveBtn.addEventListener('click', async function() {
        const title = songTitleInput.value.trim() || 'Untitled Song';
        const lyrics = (lyricsInput.textContent || lyricsInput.innerText || '').trim();
        const enhanced = enhancedLyrics.textContent.trim();
        const saveAsNewVersion = saveAsNewVersionCheckbox.checked;
        const versionNotes = versionNotesInput.value.trim();
        const authors = getAuthors();
        const registerBlockchain = registerBlockchainCheckbox.checked;
        
        // Validate at least one author
        if (authors.length === 0) {
            showNotification('Please add at least one author', 'warning');
            return;
        }
        
        // Show loading state
        confirmSaveBtn.disabled = true;
        confirmSaveBtn.textContent = 'Saving...';
        
        try {
            const response = await fetch('/api/save-song.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: currentSongId,
                    title: title,
                    lyrics: lyrics,
                    enhancedLyrics: enhanced,
                    saveAsNewVersion: saveAsNewVersion,
                    versionNotes: versionNotes,
                    authors: authors,
                    registerBlockchain: registerBlockchain
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                currentSongId = data.song.id;
                saveSongModal.style.display = 'none';
                versionNotesInput.value = '';
                
                let message = '';
                if (data.isNewVersion) {
                    message = `Saved as version ${data.currentVersion.version}! 💾`;
                } else {
                    message = 'Song updated! 💾';
                }
                
                if (data.blockchainRegistered) {
                    message += ' ⛓️ Blockchain registered!';
                }
                
                showNotification(message, 'success');
                if (data.isNewVersion) {
                    updateVersionInfo(data.song);
                }
                loadSongs(); // Refresh the list
            } else {
                showNotification(data.error || 'Failed to save song', 'error');
            }
        } catch (error) {
            console.error('Error saving song:', error);
            showNotification('Failed to save song', 'error');
        } finally {
            confirmSaveBtn.disabled = false;
            confirmSaveBtn.textContent = 'Save & Register';
        }
    });
    
    cancelSaveBtn.addEventListener('click', function() {
        saveSongModal.style.display = 'none';
    });
    
    // Close modal when clicking outside
    saveSongModal.addEventListener('click', function(e) {
        if (e.target === saveSongModal) {
            saveSongModal.style.display = 'none';
        }
    });
    
    versionHistoryModal.addEventListener('click', function(e) {
        if (e.target === versionHistoryModal) {
            versionHistoryModal.style.display = 'none';
        }
    });
    
    // Load songs list
    loadSongsBtn.addEventListener('click', function() {
        songsList.style.display = songsList.style.display === 'none' ? 'block' : 'none';
        if (songsList.style.display === 'block') {
            loadSongs();
        }
    });
    
    async function loadSongs() {
        try {
            const response = await fetch('/api/get-songs.php');
            const data = await response.json();
            
            if (data.success) {
                displaySongsList(data.songs);
            } else {
                showNotification('Failed to load songs', 'error');
            }
        } catch (error) {
            console.error('Error loading songs:', error);
            showNotification('Failed to load songs', 'error');
        }
    }
    
    function displaySongsList(songs) {
        if (songs.length === 0) {
            songsList.innerHTML = '<p style="color: #718096; padding: 20px; text-align: center;">No saved songs yet.</p>';
            return;
        }
        
        songsList.innerHTML = songs.map(song => `
            <div class="song-item">
                <div class="song-info">
                    <h4>${escapeHtml(song.title)}</h4>
                    <p class="song-preview">${escapeHtml(song.preview)}</p>
                    <small>
                        ${song.versionCount || 1} version(s) • 
                        Updated: ${new Date(song.updated).toLocaleDateString()}
                    </small>
                </div>
                <div class="song-actions">
                    <button class="load-song-btn" data-id="${song.id}">📝 Load Latest</button>
                    <button class="view-versions-btn" data-id="${song.id}">📚 Versions</button>
                    <button class="delete-song-btn" data-id="${song.id}">🗑️ Delete</button>
                </div>
            </div>
        `).join('');
        
        // Add event listeners
        document.querySelectorAll('.load-song-btn').forEach(btn => {
            btn.addEventListener('click', () => loadSong(btn.dataset.id));
        });
        
        document.querySelectorAll('.view-versions-btn').forEach(btn => {
            btn.addEventListener('click', () => showVersionHistory(btn.dataset.id));
        });
        
        document.querySelectorAll('.delete-song-btn').forEach(btn => {
            btn.addEventListener('click', () => deleteSong(btn.dataset.id));
        });
    }
    
    async function loadSong(songId, versionNumber = null) {
        try {
            const url = versionNumber 
                ? `/api/get-song.php?id=${songId}&version=${versionNumber}`
                : `/api/get-song.php?id=${songId}`;
                
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.success) {
                const song = data.song;
                const version = data.version || data.currentVersion;
                
                if (!version) {
                    showNotification('No version data found', 'error');
                    return;
                }
                
                currentSongId = song.id;
                lyricsInput.innerHTML = escapeHtml(version.lyrics);
                lyricsInput.textContent = version.lyrics;
                updatePlaceholder();
                songTitleInput.value = song.title;
                
                if (version.enhancedLyrics) {
                    // For saved songs, display enhanced lyrics as text
                    enhancedLyrics.innerHTML = '<div class="fallback-message">' + escapeHtml(version.enhancedLyrics) + '</div>';
                    document.getElementById('finalLyrics').textContent = version.enhancedLyrics;
                    document.getElementById('applySelectionsBtn').style.display = 'none';
                    outputSection.style.display = 'block';
                } else {
                    outputSection.style.display = 'none';
                }
                
                updateVersionInfo(song);
                
                showNotification(`Loaded version ${version.version}! 📝`, 'success');
                songsList.style.display = 'none';
            } else {
                showNotification(data.error || 'Failed to load song', 'error');
            }
        } catch (error) {
            console.error('Error loading song:', error);
            showNotification('Failed to load song', 'error');
        }
    }
    
    function updateVersionInfo(song) {
        if (song && song.versions && song.versions.length > 0) {
            currentVersionInfo.textContent = `Version ${song.currentVersion} of ${song.versions.length}`;
            currentVersionInfo.style.display = 'inline-block';
        } else {
            currentVersionInfo.style.display = 'none';
        }
    }
    
    async function showVersionHistory(songId) {
        try {
            const response = await fetch(`/api/get-song.php?id=${songId}`);
            const data = await response.json();
            
            if (data.success) {
                const song = data.song;
                versionHistoryTitle.textContent = song.title;
                
                // Display versions (newest first)
                const versions = [...song.versions].reverse();
                versionHistoryList.innerHTML = versions.map(version => `
                    <div class="version-item">
                        <div class="version-header">
                            <h4>Version ${version.version}</h4>
                            <small>${new Date(version.created).toLocaleString()}</small>
                        </div>
                        ${version.notes ? `<p class="version-notes">${escapeHtml(version.notes)}</p>` : ''}
                        <p class="version-preview">${escapeHtml(version.lyrics.substring(0, 150))}...</p>
                        <div class="version-actions">
                            <button class="load-version-btn" data-id="${songId}" data-version="${version.version}">
                                📝 Load This Version
                            </button>
                        </div>
                    </div>
                `).join('');
                
                // Add load version listeners
                document.querySelectorAll('.load-version-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        loadSong(btn.dataset.id, parseInt(btn.dataset.version));
                        versionHistoryModal.style.display = 'none';
                    });
                });
                
                versionHistoryModal.style.display = 'flex';
            } else {
                showNotification(data.error || 'Failed to load version history', 'error');
            }
        } catch (error) {
            console.error('Error loading version history:', error);
            showNotification('Failed to load version history', 'error');
        }
    }
    
    async function deleteSong(songId) {
        if (!confirm('Are you sure you want to delete this song? This cannot be undone.')) {
            return;
        }
        
        try {
            const response = await fetch('/api/delete-song.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: songId })
            });
            
            const data = await response.json();
            
            if (data.success) {
                if (currentSongId === songId) {
                    currentSongId = null;
                    currentVersionInfo.style.display = 'none';
                }
                showNotification('Song deleted', 'success');
                loadSongs();
            } else {
                showNotification(data.error || 'Failed to delete song', 'error');
            }
        } catch (error) {
            console.error('Error deleting song:', error);
            showNotification('Failed to delete song', 'error');
        }
    }
    
    // Display lyrics with interactive dropdowns - replaces highlights in editor
    function displayLyricsWithDropdowns(originalLyrics, alternatives) {
        const originalLines = originalLyrics.split('\n');
        const finalLyricsDiv = document.getElementById('finalLyrics');
        const applyBtn = document.getElementById('applySelectionsBtn');
        
        // Create a map to match alternatives with marked sections
        // We need to match alternatives to the marked spans in the editor
        const markedSpans = lyricsInput.querySelectorAll('.marked-for-enhancement');
        
        if (markedSpans.length === 0) {
            // Fallback: show in output section if no marks found
            showNotification('No marked sections found. Using fallback display.', 'warning');
            return;
        }
        
        // Match alternatives to marked spans by text similarity
        // Create a copy of alternatives array to track which ones are used
        const availableAlternatives = [...alternatives];
        
        markedSpans.forEach((markedSpan) => {
            const originalText = (markedSpan.textContent || markedSpan.innerText || '').trim();
            
            // Find best matching alternative
            let bestMatch = null;
            let bestMatchIndex = -1;
            let bestScore = 0;
            
            availableAlternatives.forEach((altData, altIndex) => {
                if (altData && altData.alternatives && altData.alternatives.length > 0) {
                    // Check the original line from the API response
                    const apiOriginal = (altData.original || '').trim().replace(/<insert>.*/i, '').trim();
                    
                    // Try multiple matching strategies
                    let score = 0;
                    
                    // Strategy 1: Check if marked text is in the API original
                    if (apiOriginal.toLowerCase().includes(originalText.toLowerCase())) {
                        score = originalText.length * 2; // Higher weight
                    }
                    // Strategy 2: Check if API original contains marked text
                    else if (originalText.toLowerCase().includes(apiOriginal.toLowerCase().substring(0, Math.min(originalText.length, apiOriginal.length)))) {
                        score = Math.min(originalText.length, apiOriginal.length);
                    }
                    // Strategy 3: Check if any alternative contains the marked text
                    else {
                        altData.alternatives.forEach(alt => {
                            if (alt.toLowerCase().includes(originalText.toLowerCase())) {
                                score = originalText.length;
                            }
                        });
                    }
                    
                    if (score > bestScore) {
                        bestScore = score;
                        bestMatch = altData;
                        bestMatchIndex = altIndex;
                    }
                }
            });
            
            // If no match found, use first available alternative
            if (!bestMatch && availableAlternatives.length > 0) {
                bestMatch = availableAlternatives[0];
                bestMatchIndex = 0;
            }
            
            if (bestMatch && bestMatch.alternatives && bestMatch.alternatives.length > 0) {
                // Get the full line context - split editor content by lines and find the line with marked text
                const editorText = lyricsInput.textContent || lyricsInput.innerText || '';
                const lines = editorText.split('\n');
                let fullLineText = '';
                
                // Find which line contains the marked text
                for (let line of lines) {
                    if (line.includes(originalText)) {
                        fullLineText = line.trim();
                        break;
                    }
                }
                
                // Fallback: if we couldn't find it in lines, use the marked span's parent text
                if (!fullLineText) {
                    fullLineText = (markedSpan.parentNode.textContent || '').trim();
                }
                
                // Get what comes before the marked text in the line
                const markedIndex = fullLineText.indexOf(originalText);
                const beforeText = markedIndex >= 0 ? fullLineText.substring(0, markedIndex).trim() : '';
                const afterText = markedIndex >= 0 ? fullLineText.substring(markedIndex + originalText.length).trim() : '';
                
                // Create dropdown to replace the marked span
                const dropdown = document.createElement('select');
                dropdown.className = 'alternative-dropdown-inline';
                dropdown.setAttribute('data-original-text', originalText);
                
                // Add options - extract just the NEW completion part
                const defaultOption = document.createElement('option');
                defaultOption.value = '';
                defaultOption.textContent = '-- Choose alternative --';
                dropdown.appendChild(defaultOption);
                
                // Add option to keep the original lyric
                const keepOriginalOption = document.createElement('option');
                keepOriginalOption.value = originalText;
                keepOriginalOption.textContent = '✓ Keep original: "' + originalText + '"';
                keepOriginalOption.style.fontStyle = 'italic';
                dropdown.appendChild(keepOriginalOption);
                
                // Use the API's original field to understand the structure
                // bestMatch.original is like "I'm walking down the street <insert>"
                const apiOriginal = (bestMatch.original || '').replace(/<insert>.*/i, '').trim();
                const apiOriginalLower = apiOriginal.toLowerCase();
                
                bestMatch.alternatives.forEach((alt, altIndex) => {
                    const option = document.createElement('option');
                    
                    // The API alternative is a full line like "I'm walking down the street where dreams come alive"
                    // The API original (without <insert>) is like "I'm walking down the street"
                    // We need to extract just "where dreams come alive" (what comes after the API original)
                    
                    let completionText = '';
                    const altLower = alt.toLowerCase();
                    
                    // Strategy 1: Use API original to find where to extract from
                    if (apiOriginal && altLower.startsWith(apiOriginalLower)) {
                        // Perfect! The alternative starts with the API original, extract what comes after
                        completionText = alt.substring(apiOriginal.length).trim();
                    }
                    // Strategy 2: Find the marked text in the alternative
                    else {
                        const originalLower = originalText.toLowerCase();
                        const markedPos = altLower.indexOf(originalLower);
                        
                        if (markedPos >= 0) {
                            // Extract everything after the marked text
                            completionText = alt.substring(markedPos + originalText.length).trim();
                            
                            // If there's text before the marked text, verify the context matches
                            if (beforeText && completionText) {
                                const beforeLower = beforeText.toLowerCase();
                                // If the alternative should start with beforeText + originalText
                                const expectedStart = (beforeText + ' ' + originalText).toLowerCase();
                                if (!altLower.startsWith(expectedStart)) {
                                    // The context doesn't match perfectly, but we still have a completion
                                    // Keep the completionText as is
                                }
                            }
                        } else {
                            // Fallback: use the whole alternative (shouldn't happen often)
                            completionText = alt;
                        }
                    }
                    
                    // Clean up: remove any leading/trailing punctuation that might be duplicated
                    completionText = completionText.trim();
                    
                    // If completion is empty or same as original, show a placeholder
                    if (!completionText || completionText === originalText || completionText === apiOriginal) {
                        completionText = '...';
                    }
                    
                    // Store the full replacement: original marked text + new completion
                    const fullReplacement = originalText + (completionText && completionText !== '...' ? ' ' + completionText : '');
                    option.value = fullReplacement;
                    option.textContent = completionText;
                    
                    if (altIndex === 0) {
                        option.selected = true;
                    }
                    dropdown.appendChild(option);
                });
                
                // Replace marked span with dropdown
                const parent = markedSpan.parentNode;
                parent.replaceChild(dropdown, markedSpan);
                
                // When dropdown changes, replace with selected text
                dropdown.addEventListener('change', function() {
                    if (this.value) {
                        const isOriginal = this.value === originalText;
                        const textNode = document.createTextNode(this.value);
                        parent.replaceChild(textNode, this);
                        
                        if (isOriginal) {
                            showNotification('Original lyric kept ✓', 'info');
                        } else {
                            showNotification('Alternative applied! ✨', 'success');
                        }
                        
                        // Update final lyrics preview
                        updateFinalLyricsPreview();
                    }
                });
                
                // Remove from available alternatives so it's not used again
                if (bestMatchIndex >= 0) {
                    availableAlternatives.splice(bestMatchIndex, 1);
                }
            }
        });
        
        // Update final lyrics preview
        function updateFinalLyricsPreview() {
            const currentText = lyricsInput.textContent || lyricsInput.innerText || '';
            finalLyricsDiv.textContent = currentText;
        }
        
        // Initial preview
        updateFinalLyricsPreview();
        
        // Show preview section
        outputSection.style.display = 'block';
        applyBtn.style.display = 'none'; // No need for apply button since replacements happen directly
    }
    
    // Apply selections button
    const applySelectionsBtn = document.getElementById('applySelectionsBtn');
    if (applySelectionsBtn) {
        applySelectionsBtn.addEventListener('click', function() {
            const finalLyrics = document.getElementById('finalLyrics').textContent;
            lyricsInput.textContent = finalLyrics;
            lyricsInput.innerHTML = escapeHtml(finalLyrics);
            updatePlaceholder();
            showNotification('Selected lines applied to input! ✨', 'success');
        });
    }
    
    // Display lyrics with rhyme indicators
    function displayLyricsWithRhyme(originalLyrics, sections) {
        const markedSpans = lyricsInput.querySelectorAll('.marked-for-enhancement');
        const finalLyricsDiv = document.getElementById('finalLyrics');
        const applyBtn = document.getElementById('applySelectionsBtn');
        
        if (markedSpans.length === 0) {
            showNotification('No marked sections found.', 'warning');
            return;
        }
        
        // Match sections to marked spans
        markedSpans.forEach((markedSpan, index) => {
            const originalText = (markedSpan.textContent || markedSpan.innerText || '').trim();
            const section = sections[index] || sections[0];
            
            if (!section || !section.alternatives) return;
            
            // Create dropdown with rhyme indicators
            const dropdown = document.createElement('select');
            dropdown.className = 'alternative-dropdown-inline';
            dropdown.setAttribute('data-original-text', originalText);
            
            // Add default option
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = '-- Choose alternative --';
            dropdown.appendChild(defaultOption);
            
            // Add "Keep original" option
            const keepOriginalOption = document.createElement('option');
            keepOriginalOption.value = originalText;
            keepOriginalOption.textContent = '✓ Keep original: "' + originalText + '"';
            keepOriginalOption.style.fontStyle = 'italic';
            dropdown.appendChild(keepOriginalOption);
            
            // Add alternatives with rhyme info
            section.alternatives.forEach(alt => {
                const option = document.createElement('option');
                option.value = alt.text || alt;
                
                let label = alt.text || alt;
                if (alt.rhymeType) {
                    label += ` [${alt.rhymeType} rhyme]`;
                }
                if (alt.rhymeNote) {
                    label += ` - ${alt.rhymeNote}`;
                }
                
                option.textContent = label;
                option.dataset.rhymeType = alt.rhymeType || '';
                option.dataset.syllables = alt.syllables || '';
                dropdown.appendChild(option);
            });
            
            // Create rhyme scheme indicator
            const rhymeIndicator = document.createElement('div');
            rhymeIndicator.className = 'rhyme-indicator';
            rhymeIndicator.style.cssText = 'font-size: 0.85rem; color: #667eea; margin-top: 4px; font-style: italic;';
            if (section.suggestions) {
                rhymeIndicator.textContent = `💡 Suggested: ${section.suggestions.rhymeScheme || 'N/A'} • ${section.suggestions.meter || ''}`;
            }
            
            // Replace marked span with dropdown
            const parent = markedSpan.parentNode;
            parent.replaceChild(dropdown, markedSpan);
            parent.insertBefore(rhymeIndicator, dropdown.nextSibling);
            
            // Handle dropdown change
            dropdown.addEventListener('change', function() {
                if (this.value) {
                    const isOriginal = this.value === originalText;
                    const textNode = document.createTextNode(this.value);
                    parent.replaceChild(textNode, this);
                    rhymeIndicator.remove();
                    
                    if (isOriginal) {
                        showNotification('Original lyric kept ✓', 'info');
                    } else {
                        const selectedOption = this.options[this.selectedIndex];
                        const rhymeType = selectedOption.dataset.rhymeType;
                        if (rhymeType) {
                            showNotification(`Alternative applied! ✨ (${rhymeType} rhyme)`, 'success');
                        } else {
                            showNotification('Alternative applied! ✨', 'success');
                        }
                    }
                    
                    updateFinalLyricsPreview();
                }
            });
        });
        
        applyBtn.style.display = 'inline-block';
        updateFinalLyricsPreview();
    }
    
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Clear button should also clear current song
    const originalClearBtn = clearBtn.onclick;
    clearBtn.addEventListener('click', function() {
        currentSongId = null;
        currentVersionInfo.style.display = 'none';
    });
}); 