let player;
let playlist = [];
let currentIndex = 0;
let isPlaying = false;

// YouTube Player API
function onYouTubeIframeAPIReady() {
    player = new YT.Player('player', {
        height: '100%',
        width: '100%',
        playerVars: {
            'playsinline': 1,
            'controls': 0
        },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange
        }
    });
}

function onPlayerReady(event) {
    console.log('Player ready');
    updateVolumeDisplay();
}

function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.PLAYING) {
        isPlaying = true;
        document.getElementById('playPauseBtn').textContent = '⏸️';
        startProgressUpdate();
    } else if (event.data === YT.PlayerState.PAUSED) {
        isPlaying = false;
        document.getElementById('playPauseBtn').textContent = '▶️';
    } else if (event.data === YT.PlayerState.ENDED) {
        playNext();
    }
}

// Search functionality
document.getElementById('searchBtn').addEventListener('click', searchSongs);
document.getElementById('searchInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchSongs();
});

async function searchSongs() {
    const query = document.getElementById('searchInput').value;
    if (!query) return;

    try {
        const response = await fetch(`/api/search?query=${encodeURIComponent(query)}`);
        const data = await response.json();
        
        if (data.error) {
            alert(data.error);
            return;
        }
        
        displaySearchResults(data.items);
    } catch (error) {
        console.error('Search error:', error);
        alert('Search failed. Please check if YouTube API key is configured.');
    }
}

function displaySearchResults(items) {
    const resultsContainer = document.getElementById('searchResults');
    resultsContainer.innerHTML = '';

    if (!items || items.length === 0) {
        resultsContainer.innerHTML = '<p style="text-align:center; padding:20px;">No results found</p>';
        return;
    }

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
        div.addEventListener('click', () => addToPlaylist(item));
        resultsContainer.appendChild(div);
    });
}

function addToPlaylist(item) {
    const song = {
        id: item.id.videoId,
        title: item.snippet.title,
        artist: item.snippet.channelTitle,
        thumbnail: item.snippet.thumbnails.medium.url
    };

    playlist.push(song);
    updatePlaylistDisplay();
    
    if (playlist.length === 1) {
        playSong(0);
    }
}

function updatePlaylistDisplay() {
    const playlistContainer = document.getElementById('playlist');
    playlistContainer.innerHTML = '';

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
    if (!playlist[index]) return;
    
    currentIndex = index;
    const song = playlist[index];
    
    player.loadVideoById(song.id);
    document.getElementById('currentSong').textContent = song.title;
    document.getElementById('currentArtist').textContent = song.artist;
    
    updatePlaylistDisplay();
    fetchLyrics(song.artist, song.title);
}

// Player controls
document.getElementById('playPauseBtn').addEventListener('click', () => {
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
    }
}

function playNext() {
    if (currentIndex < playlist.length - 1) {
        playSong(currentIndex + 1);
    }
}

// Volume control
document.getElementById('volumeControl').addEventListener('input', (e) => {
    const volume = e.target.value;
    player.setVolume(volume);
    document.getElementById('volumeValue').textContent = volume + '%';
});

function updateVolumeDisplay() {
    const volume = player.getVolume();
    document.getElementById('volumeControl').value = volume;
    document.getElementById('volumeValue').textContent = Math.round(volume) + '%';
}

// Progress bar
document.getElementById('progressBar').addEventListener('input', (e) => {
    const duration = player.getDuration();
    const seekTo = (e.target.value / 100) * duration;
    player.seekTo(seekTo);
});

function startProgressUpdate() {
    setInterval(() => {
        if (isPlaying && player && player.getCurrentTime) {
            const currentTime = player.getCurrentTime();
            const duration = player.getDuration();
            const progress = (currentTime / duration) * 100;
            
            document.getElementById('progressBar').value = progress;
            document.getElementById('currentTime').textContent = formatTime(currentTime);
            document.getElementById('duration').textContent = formatTime(duration);
        }
    }, 1000);
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Lyrics fetching
async function fetchLyrics(artist, title) {
    const lyricsContainer = document.getElementById('lyricsContainer');
    lyricsContainer.innerHTML = '<p class="no-lyrics">Loading lyrics...</p>';

    try {
        // Clean up the title (remove extra info)
        const cleanTitle = title.split('(')[0].split('[')[0].split('|')[0].trim();
        const cleanArtist = artist.split('-')[0].trim();
        
        const response = await fetch(`/api/lyrics?artist=${encodeURIComponent(cleanArtist)}&title=${encodeURIComponent(cleanTitle)}`);
        const data = await response.json();
        
        if (data.lyrics) {
            lyricsContainer.innerHTML = `<pre>${data.lyrics}</pre>`;
        } else {
            lyricsContainer.innerHTML = '<p class="no-lyrics">Lyrics not found for this song</p>';
        }
    } catch (error) {
        console.error('Lyrics error:', error);
        lyricsContainer.innerHTML = '<p class="no-lyrics">Lyrics not available</p>';
    }
}

// Initialize
window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;