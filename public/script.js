let player;
let playlist = [];
let currentIndex = 0;
let isPlaying = false;
let progressInterval;

// YouTube IFrame API Ready
window.onYouTubeIframeAPIReady = function() {
    console.log('🎬 YouTube API loaded');
    player = new YT.Player('player', {
        height: '1',
        width: '1',
        playerVars: {
            'playsinline': 1,
            'controls': 0,
            'modestbranding': 1,
            'rel': 0,
            'enablejsapi': 1
        },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange,
            'onError': onPlayerError
        }
    });
};

function onPlayerReady(event) {
    console.log('✅ YouTube Player ready');
    player.setVolume(50);
    updateVolumeDisplay();
}

function onPlayerStateChange(event) {
    console.log('Player state:', event.data);
    
    if (event.data === YT.PlayerState.PLAYING) {
        isPlaying = true;
        document.getElementById('playPauseBtn').textContent = '⏸️';
        startProgressUpdate();
    } else if (event.data === YT.PlayerState.PAUSED) {
        isPlaying = false;
        document.getElementById('playPauseBtn').textContent = '▶️';
        stopProgressUpdate();
    } else if (event.data === YT.PlayerState.ENDED) {
        playNext();
    } else if (event.data === YT.PlayerState.BUFFERING) {
        console.log('⏳ Buffering...');
    }
}

function onPlayerError(event) {
    console.error('❌ Player error:', event.data);
    alert('Failed to play this video. Trying next...');
    playNext();
}

// Search functionality
document.getElementById('searchBtn').addEventListener('click', searchSongs);
document.getElementById('searchInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchSongs();
});

async function searchSongs() {
    const query = document.getElementById('searchInput').value;
    if (!query) {
        alert('Please enter a song name or artist');
        return;
    }

    const searchBtn = document.getElementById('searchBtn');
    searchBtn.textContent = 'Searching...';
    searchBtn.disabled = true;

    try {
        const response = await fetch(`/api/search?query=${encodeURIComponent(query)}`);
        const data = await response.json();
        
        if (data.error) {
            alert(data.error);
            return;
        }
        
        if (!data.items || data.items.length === 0) {
            alert('No results found. Try different keywords!');
            return;
        }
        
        displaySearchResults(data.items);
    } catch (error) {
        console.error('Search error:', error);
        alert('Search failed. Please try again.');
    } finally {
        searchBtn.textContent = 'Search';
        searchBtn.disabled = false;
    }
}

function displaySearchResults(items) {
    const resultsContainer = document.getElementById('searchResults');
    resultsContainer.innerHTML = '';
    resultsContainer.classList.add('show');

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = 'position:absolute; top:15px; right:15px; background:rgba(255,255,255,0.2); border:none; color:#fff; width:30px; height:30px; border-radius:50%; cursor:pointer; font-size:18px; z-index:10;';
    closeBtn.addEventListener('click', () => {
        resultsContainer.classList.remove('show');
    });
    resultsContainer.appendChild(closeBtn);

    items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'search-item';
        div.innerHTML = `
            <img src="${item.snippet.thumbnails.default.url}" alt="${item.snippet.title}">
            <div class="search-item-info">
                <h4>${item.snippet.title}</h4>
                <p>${item.snippet.channelTitle}</p>
            </div>
        `;
        div.addEventListener('click', () => {
            addToPlaylist(item);
            resultsContainer.classList.remove('show');
        });
        resultsContainer.appendChild(div);
    });
}

function addToPlaylist(item) {
    const song = {
        id: item.id.videoId,
        title: item.snippet.title,
        artist: item.snippet.channelTitle,
        thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default.url
    };

    playlist.push(song);
    console.log('Added to playlist:', song.title);
    updatePlaylistDisplay();
    
    if (playlist.length === 1) {
        playSong(0);
    }
}

function updatePlaylistDisplay() {
    const playlistContainer = document.getElementById('playlist');
    playlistContainer.innerHTML = '';

    if (playlist.length === 0) {
        playlistContainer.innerHTML = '<p style="text-align:center; padding:40px; color:rgba(255,255,255,0.5);">No songs in playlist. Search and add songs!</p>';
        return;
    }

    playlist.forEach((song, index) => {
        const div = document.createElement('div');
        div.className = `playlist-item ${index === currentIndex ? 'active' : ''}`;
        div.innerHTML = `
            <img src="${song.thumbnail}" alt="${song.title}">
            <h4>${song.title}</h4>
            <p>${song.artist}</p>
        `;
        div.addEventListener('click', () => playSong(index));
        playlistContainer.appendChild(div);
    });
}

function playSong(index) {
    if (!playlist[index]) {
        console.error('Song not found at index:', index);
        return;
    }
    
    if (!player || !player.loadVideoById) {
        console.error('Player not ready yet');
        alert('Player is loading, please wait...');
        return;
    }
    
    currentIndex = index;
    const song = playlist[index];
    
    console.log('🎵 Playing:', song.title);
    console.log('Video ID:', song.id);
    
    // Load and play video
    player.loadVideoById(song.id);
    
    // Update UI
    document.getElementById('albumArt').src = song.thumbnail;
    document.getElementById('currentSong').textContent = song.title;
    document.getElementById('currentArtist').textContent = song.artist;
    
    updatePlaylistDisplay();
    fetchLyrics(song.artist, song.title);
}

// Player controls
document.getElementById('playPauseBtn').addEventListener('click', () => {
    if (playlist.length === 0) {
        alert('Please add songs to playlist first!');
        return;
    }
    
    if (!player || !player.getPlayerState) {
        alert('Player not ready yet');
        return;
    }
    
    if (isPlaying) {
        player.pauseVideo();
    } else {
        player.playVideo();
    }
});

document.getElementById('prevBtn').addEventListener('click', playPrevious);
document.getElementById('nextBtn').addEventListener('click', playNext);

function playPrevious() {
    if (currentIndex > 0) {
        playSong(currentIndex - 1);
    } else {
        alert('Already at first song');
    }
}

function playNext() {
    if (currentIndex < playlist.length - 1) {
        playSong(currentIndex + 1);
    } else {
        alert('Already at last song');
    }
}

// Volume control
document.getElementById('volumeControl').addEventListener('input', (e) => {
    if (player && player.setVolume) {
        const volume = e.target.value;
        player.setVolume(volume);
        document.getElementById('volumeValue').textContent = volume + '%';
    }
});

function updateVolumeDisplay() {
    if (player && player.getVolume) {
        const volume = player.getVolume();
        document.getElementById('volumeControl').value = volume;
        document.getElementById('volumeValue').textContent = Math.round(volume) + '%';
    }
}

// Progress bar
document.getElementById('progressBar').addEventListener('input', (e) => {
    if (player && player.getDuration) {
        const duration = player.getDuration();
        const seekTo = (e.target.value / 100) * duration;
        player.seekTo(seekTo);
    }
});

function startProgressUpdate() {
    stopProgressUpdate();
    progressInterval = setInterval(() => {
        if (player && player.getCurrentTime && player.getDuration) {
            const currentTime = player.getCurrentTime();
            const duration = player.getDuration();
            
            if (duration > 0) {
                const progress = (currentTime / duration) * 100;
                document.getElementById('progressBar').value = progress;
                document.getElementById('currentTime').textContent = formatTime(currentTime);
                document.getElementById('duration').textContent = formatTime(duration);
            }
        }
    }, 1000);
}

function stopProgressUpdate() {
    if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
    }
}

function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Lyrics fetching
async function fetchLyrics(artist, title) {
    const lyricsContainer = document.getElementById('lyricsContainer');
    lyricsContainer.innerHTML = '<p class="no-lyrics">🔍 Loading lyrics...</p>';

    try {
        let cleanTitle = title
            .replace(/\(.*?\)/g, '')
            .replace(/\[.*?\]/g, '')
            .replace(/\|.*$/g, '')
            .split('-')[0]
            .replace(/official|audio|video|lyric|lyrics|hd|4k|full/gi, '')
            .trim();
        
        let cleanArtist = artist
            .split('-')[0]
            .split('•')[0]
            .replace(/VEVO|Topic|Official/gi, '')
            .trim();
        
        console.log(`Fetching lyrics: ${cleanArtist} - ${cleanTitle}`);
        
        const response = await fetch(`/api/lyrics?artist=${encodeURIComponent(cleanArtist)}&title=${encodeURIComponent(cleanTitle)}`);
        const data = await response.json();
        
        if (data.lyrics) {
            console.log('✅ Lyrics loaded');
            
            let sourceIndicator = '';
            if (data.source === 'ai-generated') {
                sourceIndicator = '<div style="background: rgba(255,255,255,0.1); padding: 10px; border-radius: 8px; margin-bottom: 20px; font-size: 0.9em;">🤖 AI-Generated Lyrics</div>';
            } else if (data.source === 'database') {
                sourceIndicator = '<div style="background: rgba(255,255,255,0.1); padding: 10px; border-radius: 8px; margin-bottom: 20px; font-size: 0.9em;">✅ Official Lyrics</div>';
            }
            
            lyricsContainer.innerHTML = sourceIndicator + `<pre>${data.lyrics}</pre>`;
        } else {
            lyricsContainer.innerHTML = `<p class="no-lyrics">😔 Lyrics not available</p>`;
        }
    } catch (error) {
        console.error('Lyrics error:', error);
        lyricsContainer.innerHTML = `<p class="no-lyrics">⚠️ Could not load lyrics</p>`;
    }
}

// Initialize
window.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 App loaded');
    updatePlaylistDisplay();
});