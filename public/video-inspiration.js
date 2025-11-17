document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const imagesSection = document.getElementById('imagesSection');
    const imagesContainer = document.getElementById('imagesContainer');
    const lyricsInputModal = document.getElementById('lyricsInputModal');
    const sampleLyricsInput = document.getElementById('sampleLyricsInput');
    const selectedImagePreview = document.getElementById('selectedImagePreview');
    const selectedImageDescription = document.getElementById('selectedImageDescription');
    const generateVersesBtn = document.getElementById('generateVersesBtn');
    const cancelLyricsBtn = document.getElementById('cancelLyricsBtn');
    const versesOutput = document.getElementById('versesOutput');
    const versesContainer = document.getElementById('versesContainer');
    
    let selectedImageData = null;

    // Search functionality
    searchBtn.addEventListener('click', handleSearch);
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });

    async function handleSearch() {
        const searchQuery = searchInput.value.trim();
        
        if (!searchQuery) {
            showNotification('Please enter a search query!', 'warning');
            return;
        }

        setLoadingState(searchBtn, true);
        
        try {
            const response = await fetch('/api/search-images.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ query: searchQuery })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}: ${response.statusText}` }));
                showNotification(errorData.error || `Server error (${response.status})`, 'error');
                setLoadingState(searchBtn, false);
                return;
            }

            const data = await response.json();

            if (data.success) {
                displayImages(data.matchedImages);
                imagesSection.style.display = 'block';
                versesOutput.style.display = 'none';
                showNotification(`Found ${data.matchedImages.length} images! 🖼️`, 'success');
            } else {
                showNotification(data.error || 'Failed to search images', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showNotification(`Network error: ${error.message}. Please check your connection and try again.`, 'error');
        } finally {
            setLoadingState(searchBtn, false);
        }
    }

    // Display images
    function displayImages(images) {
        imagesContainer.innerHTML = '';
        
        if (images.length === 0) {
            imagesContainer.innerHTML = '<p style="text-align: center; padding: 40px; color: #666;">No images found. Try different keywords.</p>';
            return;
        }
        
        images.forEach((image, index) => {
            const imageCard = document.createElement('div');
            imageCard.className = 'image-card';
            
            imageCard.innerHTML = `
                <div class="image-header">
                    <div class="rank-badge">${index + 1}</div>
                    <div class="relevance-info">
                        <h3>Image ${index + 1}</h3>
                    </div>
                </div>
                
                <div class="image-wrapper">
                    <img 
                        src="/media/${image.filename}" 
                        alt="${image.description}" 
                        loading="lazy"
                        onload="this.parentElement.classList.add('loaded')"
                    >
                </div>
                
                <div class="image-info">
                    <p class="image-description">${image.description}</p>
                    
                    ${image.tags && image.tags.length > 0 ? `
                        <div class="image-tags">
                            ${image.tags.map(tag => `<span class="image-tag">${tag}</span>`).join('')}
                        </div>
                    ` : ''}
                </div>
            `;
            
            // Add click handler
            imageCard.addEventListener('click', function() {
                selectedImageData = image;
                selectedImagePreview.src = `/media/${image.filename}`;
                selectedImageDescription.textContent = image.description;
                lyricsInputModal.classList.add('active');
                sampleLyricsInput.value = '';
                sampleLyricsInput.focus();
            });
            
            imagesContainer.appendChild(imageCard);
        });

        // Setup scroll controls
        setupScrollControls();
    }

    // Generate verses
    generateVersesBtn.addEventListener('click', async function() {
        const sampleLyrics = sampleLyricsInput.value.trim();
        
        if (!sampleLyrics) {
            showNotification('Please enter some sample lyrics!', 'warning');
            return;
        }

        setLoadingState(generateVersesBtn, true);
        
        try {
            const response = await fetch('/api/generate-verses.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    imageDescription: selectedImageData.description,
                    imageTags: selectedImageData.tags || [],
                    sampleLyrics: sampleLyrics
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}: ${response.statusText}` }));
                showNotification(errorData.error || errorData.details || `Server error (${response.status})`, 'error');
                setLoadingState(generateVersesBtn, false);
                return;
            }

            const data = await response.json();

            if (data.success) {
                displayVerses(data.verses);
                lyricsInputModal.classList.remove('active');
                versesOutput.style.display = 'block';
                versesOutput.scrollIntoView({ behavior: 'smooth' });
                showNotification('Alternate verses generated! ✨', 'success');
            } else {
                showNotification(data.error || 'Failed to generate verses', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showNotification(`Network error: ${error.message}. Please check your connection and try again.`, 'error');
        } finally {
            setLoadingState(generateVersesBtn, false);
        }
    });

    // Display generated verses
    function displayVerses(verses) {
        versesContainer.innerHTML = '';
        
        if (verses.length === 0) {
            versesContainer.innerHTML = '<p style="text-align: center; padding: 20px; color: #666;">No verses generated. Please try again.</p>';
            return;
        }
        
        // Combine all verses into one text with line breaks
        const combinedVerses = verses.join('\n\n');
        
        // Escape HTML for description (for display in HTML)
        const escapedDescription = (selectedImageData.description || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
        
        // Escape HTML for textarea value (need to escape quotes and ampersands)
        const escapedVersesForTextarea = combinedVerses
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        
        // Create container with image and editable textarea
        const versesWrapper = document.createElement('div');
        versesWrapper.className = 'verses-wrapper';
        versesWrapper.style.cssText = 'display: flex; gap: 20px; align-items: flex-start;';
        
        // Image section
        const imageSection = document.createElement('div');
        imageSection.style.cssText = 'flex-shrink: 0;';
        imageSection.innerHTML = `
            <div style="position: sticky; top: 20px;">
                <img 
                    src="/media/${selectedImageData.filename}" 
                    alt="${escapedDescription}"
                    style="max-width: 300px; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);"
                >
                <p style="margin-top: 10px; color: #666; font-size: 14px; font-style: italic; max-width: 300px;">
                    ${escapedDescription}
                </p>
            </div>
        `;
        
        // Editable textarea section
        const textSection = document.createElement('div');
        textSection.style.cssText = 'flex: 1; min-width: 0;';
        textSection.innerHTML = `
            <label style="display: block; margin-bottom: 10px; font-weight: 600; color: #2d3748;">
                ✨ AI-Generated Verses (Editable)
            </label>
            <textarea 
                id="editableVerses" 
                style="width: 100%; min-height: 400px; padding: 20px; border: 2px solid #e2e8f0; border-radius: 10px; font-family: inherit; font-size: 15px; line-height: 1.6; resize: vertical; box-sizing: border-box;"
            >${escapedVersesForTextarea}</textarea>
            <div style="margin-top: 15px; display: flex; gap: 10px;">
                <button id="copyVersesBtn" class="copy-verse-btn" style="padding: 10px 20px;">📋 Copy All Verses</button>
                <button id="clearVersesBtn" class="cancel-btn" style="padding: 10px 20px;">🗑️ Clear</button>
            </div>
        `;
        
        versesWrapper.appendChild(imageSection);
        versesWrapper.appendChild(textSection);
        versesContainer.appendChild(versesWrapper);
        
        // Add event listeners
        const copyVersesBtn = document.getElementById('copyVersesBtn');
        const clearVersesBtn = document.getElementById('clearVersesBtn');
        const editableVerses = document.getElementById('editableVerses');
        
        copyVersesBtn.addEventListener('click', function() {
            copyToClipboard(editableVerses.value);
        });
        
        clearVersesBtn.addEventListener('click', function() {
            if (confirm('Clear all verses?')) {
                editableVerses.value = '';
            }
        });
    }

    // Cancel lyrics input
    cancelLyricsBtn.addEventListener('click', function() {
        lyricsInputModal.classList.remove('active');
        selectedImageData = null;
    });

    // Setup scroll controls
    function setupScrollControls() {
        const scrollLeft = document.getElementById('scrollLeft');
        const scrollRight = document.getElementById('scrollRight');
        
        if (scrollLeft && scrollRight) {
            scrollLeft.addEventListener('click', () => {
                imagesContainer.scrollBy({ left: -400, behavior: 'smooth' });
            });
            
            scrollRight.addEventListener('click', () => {
                imagesContainer.scrollBy({ left: 400, behavior: 'smooth' });
            });
        }
    }

    // Helper functions
    function setLoadingState(button, isLoading) {
        if (isLoading) {
            button.disabled = true;
            button.style.opacity = '0.6';
            if (button.textContent) {
                button.dataset.originalText = button.textContent;
                button.textContent = 'Loading...';
            }
        } else {
            button.disabled = false;
            button.style.opacity = '1';
            if (button.dataset.originalText) {
                button.textContent = button.dataset.originalText;
            }
        }
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

    function copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            showNotification('Copied to clipboard! 📋', 'success');
        }).catch(() => {
            // Fallback
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            showNotification('Copied to clipboard! 📋', 'success');
        });
    }
});

