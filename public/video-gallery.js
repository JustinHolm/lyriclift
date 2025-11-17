document.addEventListener('DOMContentLoaded', function() {
    const videoGallery = document.getElementById('videoGallery');
    const playerSection = document.getElementById('playerSection');
    const videoPlayer = document.getElementById('videoPlayer');
    const currentVideoTitle = document.getElementById('currentVideoTitle');
    const currentVideoDescription = document.getElementById('currentVideoDescription');
    const loopToggle = document.getElementById('loopToggle');
    const loopStatus = document.getElementById('loopStatus');
    const startTimeInput = document.getElementById('startTime');
    const endTimeInput = document.getElementById('endTime');
    const applyRangeBtn = document.getElementById('applyRangeBtn');
    const resetRangeBtn = document.getElementById('resetRangeBtn');
    const videoDuration = document.getElementById('videoDuration');
    const rangeInfo = document.getElementById('rangeInfo');

    let currentVideo = null;
    let startTime = 0;
    let endTime = 0;
    let isLooping = false;
    let rangeApplied = false;

    // Load videos
    loadVideos();

    async function loadVideos() {
        try {
            const response = await fetch('/api/get-videos.php');
            const data = await response.json();

            if (data.success) {
                displayVideos(data.videos);
            } else {
                showError(data.error || 'Failed to load videos');
            }
        } catch (error) {
            console.error('Error:', error);
            showError('Network error. Please try again.');
        }
    }

    function displayVideos(videos) {
        videoGallery.innerHTML = '';

        if (videos.length === 0) {
            videoGallery.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <h3>No videos found</h3>
                    <p>Add video files (.mp4, .webm, .mov, etc.) to the media folder to see them here.</p>
                </div>
            `;
            return;
        }

        videos.forEach(video => {
            const videoCard = document.createElement('div');
            videoCard.className = 'video-card';
            
            const thumbnail = video.thumbnail 
                ? `/media/${video.thumbnail}` 
                : 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="280" height="200"%3E%3Crect fill="%23e2e8f0" width="280" height="200"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%2394a3b8" font-family="Arial" font-size="14"%3ENo thumbnail%3C/text%3E%3C/svg%3E';
            
            const sizeMB = (video.size / (1024 * 1024)).toFixed(2);
            const modifiedDate = new Date(video.modified * 1000).toLocaleDateString();
            
            videoCard.innerHTML = `
                <img src="${thumbnail}" alt="${video.filename}" class="video-thumbnail" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'280\\' height=\\'200\\'%3E%3Crect fill=\\'%23e2e8f0\\' width=\\'280\\' height=\\'200\\'/%3E%3Ctext x=\\'50%25\\' y=\\'50%25\\' text-anchor=\\'middle\\' dy=\\'.3em\\' fill=\\'%2394a3b8\\' font-family=\\'Arial\\' font-size=\\'14\\'%3ENo thumbnail%3C/text%3E%3C/svg%3E'">
                <div class="video-info">
                    <div class="video-title" title="${video.filename}">${video.filename}</div>
                    <div class="video-meta">
                        ${sizeMB} MB • ${modifiedDate}
                    </div>
                </div>
            `;

            videoCard.addEventListener('click', () => {
                playVideo(video);
            });

            videoGallery.appendChild(videoCard);
        });
    }

    function playVideo(video) {
        currentVideo = video;
        const videoUrl = `/media/${video.filename}`;
        
        videoPlayer.src = videoUrl;
        currentVideoTitle.textContent = video.filename;
        currentVideoDescription.textContent = video.description || 'No description available';
        
        playerSection.classList.add('active');
        playerSection.scrollIntoView({ behavior: 'smooth' });

        // Reset controls
        startTime = 0;
        endTime = 0;
        rangeApplied = false;
        startTimeInput.value = 0;
        endTimeInput.value = 0;
        updateRangeInfo();

        // Wait for video metadata to load
        videoPlayer.addEventListener('loadedmetadata', function onMetadataLoaded() {
            const duration = videoPlayer.duration;
            endTimeInput.max = duration;
            startTimeInput.max = duration;
            endTimeInput.value = duration.toFixed(1);
            endTime = duration;
            
            videoDuration.textContent = `Duration: ${formatTime(duration)}`;
            updateRangeInfo();
            
            videoPlayer.removeEventListener('loadedmetadata', onMetadataLoaded);
        }, { once: true });

        // Reset loop when video changes
        if (isLooping) {
            loopToggle.checked = false;
            toggleLoop();
        }
    }

    // Loop functionality
    loopToggle.addEventListener('change', toggleLoop);

    function toggleLoop() {
        isLooping = loopToggle.checked;
        videoPlayer.loop = isLooping;
        loopStatus.textContent = `Loop: ${isLooping ? 'On' : 'Off'}`;
        
        if (isLooping && rangeApplied) {
            setupRangeLoop();
        } else if (!isLooping) {
            videoPlayer.removeEventListener('timeupdate', checkRangeLoop);
        }
    }

    // Range functionality
    applyRangeBtn.addEventListener('click', applyRange);
    resetRangeBtn.addEventListener('click', resetRange);

    function applyRange() {
        const start = parseFloat(startTimeInput.value) || 0;
        const end = parseFloat(endTimeInput.value) || videoPlayer.duration;

        if (start >= end) {
            showNotification('Start time must be less than end time', 'warning');
            return;
        }

        if (end > videoPlayer.duration) {
            showNotification('End time cannot exceed video duration', 'warning');
            endTimeInput.value = videoPlayer.duration.toFixed(1);
            return;
        }

        startTime = start;
        endTime = end;
        rangeApplied = true;

        // Jump to start time
        videoPlayer.currentTime = startTime;
        
        // If looping is enabled, set up range loop
        if (isLooping) {
            setupRangeLoop();
        } else {
            // Set up one-time range check
            videoPlayer.addEventListener('timeupdate', checkRangeEnd, { once: true });
        }

        updateRangeInfo();
        showNotification('Playback range applied!', 'success');
    }

    function resetRange() {
        startTime = 0;
        endTime = videoPlayer.duration || 0;
        rangeApplied = false;
        startTimeInput.value = 0;
        
        if (videoPlayer.duration) {
            endTimeInput.value = videoPlayer.duration.toFixed(1);
        }
        
        videoPlayer.removeEventListener('timeupdate', checkRangeLoop);
        videoPlayer.removeEventListener('timeupdate', checkRangeEnd);
        videoPlayer.loop = isLooping;
        
        updateRangeInfo();
        showNotification('Range reset', 'info');
    }

    function setupRangeLoop() {
        videoPlayer.removeEventListener('timeupdate', checkRangeLoop);
        videoPlayer.loop = false; // Disable native loop, use custom
        
        videoPlayer.addEventListener('timeupdate', checkRangeLoop);
    }

    function checkRangeLoop() {
        if (videoPlayer.currentTime >= endTime) {
            videoPlayer.currentTime = startTime;
        }
    }

    function checkRangeEnd() {
        if (videoPlayer.currentTime >= endTime) {
            videoPlayer.pause();
        }
    }

    function updateRangeInfo() {
        if (rangeApplied && endTime > 0) {
            const rangeDuration = endTime - startTime;
            rangeInfo.textContent = `Range: ${formatTime(startTime)} - ${formatTime(endTime)} (${formatTime(rangeDuration)})`;
        } else {
            rangeInfo.textContent = 'Range: Not set';
        }
    }

    function formatTime(seconds) {
        if (isNaN(seconds)) return '--:--';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    function showError(message) {
        videoGallery.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
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
});

