document.addEventListener('DOMContentLoaded', function() {
    const registryList = document.getElementById('registryList');
    const totalRegistered = document.getElementById('totalRegistered');
    const totalAuthors = document.getElementById('totalAuthors');
    const totalSongs = document.getElementById('totalSongs');

    // Load registry data
    loadRegistry();

    async function loadRegistry() {
        try {
            // Load all songs
            const songsResponse = await fetch('/api/get-songs.php');
            const songsData = await songsResponse.json();

            if (!songsData.success || !songsData.songs) {
                showEmptyState();
                return;
            }

            // Filter songs with blockchain registration
            const registeredSongs = [];
            let allAuthors = new Set();

            for (const song of songsData.songs) {
                // Load full song data to check for blockchain info
                const songResponse = await fetch(`/api/get-song.php?id=${song.id}`);
                const songData = await songResponse.json();

                if (songData.success && songData.song && songData.song.blockchain) {
                    registeredSongs.push(songData.song);
                    
                    // Collect authors
                    if (songData.song.authors) {
                        songData.song.authors.forEach(author => {
                            if (author.name) {
                                allAuthors.add(author.name);
                            }
                        });
                    }
                }
            }

            // Update stats
            totalRegistered.textContent = registeredSongs.length;
            totalAuthors.textContent = allAuthors.size;
            totalSongs.textContent = songsData.songs.length;

            // Display registry
            if (registeredSongs.length === 0) {
                showEmptyState();
            } else {
                displayRegistry(registeredSongs);
            }
        } catch (error) {
            console.error('Error loading registry:', error);
            registryList.innerHTML = '<div class="empty-state"><p>Error loading registry. Please try again.</p></div>';
        }
    }

    function displayRegistry(songs) {
        registryList.innerHTML = '';

        songs.forEach(song => {
            const item = document.createElement('div');
            item.className = 'registry-item';

            const blockchain = song.blockchain || {};
            const registration = blockchain.blockchain || {};
            const metadata = blockchain.metadata || {};

            // Format date
            const date = new Date(blockchain.date || blockchain.timestamp * 1000 || Date.now());
            const formattedDate = date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            // Authors list
            let authorsHtml = '';
            if (song.authors && song.authors.length > 0) {
                authorsHtml = '<div class="authors-list">';
                song.authors.forEach(author => {
                    authorsHtml += `<span class="author-badge">${escapeHtml(author.name)}${author.role ? ' (' + author.role + ')' : ''}</span>`;
                });
                authorsHtml += '</div>';
            }

            // Status badge
            const status = blockchain.status || registration.status || 'pending';
            const statusClass = status === 'registered' ? 'status-registered' : 'status-pending';
            const statusText = status === 'registered' ? '✓ Registered' : '⏳ Pending';

            item.innerHTML = `
                <div class="registry-item-header">
                    <div>
                        <div class="song-title">${escapeHtml(song.title || 'Untitled Song')}</div>
                        <div class="song-meta">
                            Registered: ${formattedDate}
                            ${song.currentVersion ? ` • Version ${song.currentVersion}` : ''}
                        </div>
                        ${authorsHtml}
                    </div>
                    <span class="status-badge ${statusClass}">${statusText}</span>
                </div>
                
                <div class="blockchain-info">
                    <div class="blockchain-field">
                        <span class="blockchain-label">Lyrics Hash:</span>
                        <span class="blockchain-value">${metadata.lyricsHash || blockchain.lyricsHash || 'N/A'}</span>
                    </div>
                    ${registration.transactionHash ? `
                    <div class="blockchain-field">
                        <span class="blockchain-label">Transaction Hash:</span>
                        <span class="blockchain-value">${registration.transactionHash}</span>
                    </div>
                    ` : ''}
                    ${registration.ipfsHash ? `
                    <div class="blockchain-field">
                        <span class="blockchain-label">IPFS Hash:</span>
                        <span class="blockchain-value">${registration.ipfsHash}</span>
                    </div>
                    ` : ''}
                    ${registration.blockNumber ? `
                    <div class="blockchain-field">
                        <span class="blockchain-label">Block Number:</span>
                        <span class="blockchain-value">${registration.blockNumber}</span>
                    </div>
                    ` : ''}
                    ${registration.network && registration.network !== 'pending' ? `
                    <div class="blockchain-field">
                        <span class="blockchain-label">Network:</span>
                        <span class="blockchain-value">${registration.network}</span>
                    </div>
                    ` : ''}
                    ${registration.contractAddress ? `
                    <div class="blockchain-field">
                        <span class="blockchain-label">Contract Address:</span>
                        <span class="blockchain-value">${registration.contractAddress}</span>
                    </div>
                    ` : ''}
                    ${!registration.transactionHash && !registration.ipfsHash ? `
                    <div class="blockchain-field">
                        <span class="blockchain-label">Status:</span>
                        <span class="blockchain-value">Registration pending - blockchain integration in progress</span>
                    </div>
                    ` : ''}
                </div>
            `;

            registryList.appendChild(item);
        });
    }

    function showEmptyState() {
        registryList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⛓️</div>
                <h3>No Registered Songs Yet</h3>
                <p>Register your songs to create permanent ownership records on the blockchain.</p>
                <p><a href="index.html" style="color: #667eea; text-decoration: none; font-weight: 600;">Go to Lyrics Studio →</a></p>
            </div>
        `;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
});

