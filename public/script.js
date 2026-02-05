let audioPlayer;
let playlist = [];
let currentIndex = 0;
let isPlaying = false;

function initPlayer() {
    audioPlayer = new Audio();
    audioPlayer.volume = 0.5;
    audioPlayer.crossOrigin = "anonymous";
    
    audioPlayer.addEventListener('play', () => {
        isPlaying = true;
        document.getElementById('playPauseBtn').textContent = '⏸️';
    });
    
    audioPlayer.addEventListener('pause', () => {
        isPlaying = false;
        document.getElementById('playPauseBtn').textContent = '▶️';
    });
    
    audioPlayer.addEventListener('ended', () => {
        playNext();
    });
    
    audioPlayer.addEventListener('timeupdate', updateProgress);
    
    audioPlayer.addEventListener('error', (e) => {
        console.error('Audio error:', e);
        alert('Failed to play this track. Trying next...');
        playNext();
    });
}

document.getElementById('searchBtn').addEventListener('click', searchSongs);
document.getElementById('searchInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchSongs();
});

async function searchSongs() {
    const query = document.getElementById('searchInput').value;
    if (!query) {
        alert('Please enter a search term');
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
        alert('Search failed. Please check your connection and try again.');
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
    closeBtn.style.cssText = 'position:absolute; top:15px; right:15px; background:rgba(255,255,255,0.2); border:none; color:#fff; width:30px; height:30px; border-radius:50%; cursor:pointer; font-size:18px;';
    closeBtn.addEventListener('click', () => {
        resultsContainer.classList.remove('show');
    });
    resultsContainer.appendChild(closeBtn);

    items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'search-item';
        
        const thumbnail = item.snippet.thumbnails.medium.url;
        
        div.innerHTML = `
            <img src="${thumbnail}" alt="${item.snippet.title}">
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
        thumbnail: item.snippet.thumbnails.medium.url,
        audioUrl: item.audioUrl,
        duration: item.duration
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
    if (!playlist[index]) return;
    
    currentIndex = index;
    const song = playlist[index];
    
    document.getElementById('currentSong').textContent = song.title;
    document.getElementById('currentArtist').textContent = song.artist;
    
    audioPlayer.src = song.audioUrl;
    audioPlayer.play().catch(err => {
        console.error('Play error:', err);
        alert('Failed to play. Trying next track...');
        playNext();
    });
    
    document.getElementById('player').innerHTML = `
        <img src="${song.thumbnail}" style="width:100%; height:100%; object-fit:cover;">
    `;
    
    updatePlaylistDisplay();
    fetchLyrics(song.artist, song.title);
}

document.getElementById('playPauseBtn').addEventListener('click', () => {
    if (playlist.length === 0) {
        alert('Please add songs to playlist first!');
        return;
    }
    
    if (isPlaying) {
        audioPlayer.pause();
    } else {
        audioPlayer.play();
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

document.getElementById('volumeControl').addEventListener('input', (e) => {
    const volume = e.target.value / 100;
    audioPlayer.volume = volume;
    document.getElementById('volumeValue').textContent = e.target.value + '%';
});

document.getElementById('progressBar').addEventListener('input', (e) => {
    if (audioPlayer.duration) {
        const seekTime = (e.target.value / 100) * audioPlayer.duration;
        audioPlayer.currentTime = seekTime;
    }
});

function updateProgress() {
    if (audioPlayer.duration) {
        const progress = (audioPlayer.currentTime / audioPlayer.duration) * 100;
        document.getElementById('progressBar').value = progress || 0;
        document.getElementById('currentTime').textContent = formatTime(audioPlayer.currentTime);
        document.getElementById('duration').textContent = formatTime(audioPlayer.duration);
    }
}

function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds);
    const secs = Math.floor(seconds % 60);
    return `${Math.floor(mins / 60)}:${secs.toString().padStart(2, '0')}`;
}

async function fetchLyrics(artist, title) {
    const lyricsContainer = document.getElementById('lyricsContainer');
    lyricsContainer.innerHTML = '<p class="no-lyrics">Loading lyrics...</p>';

    try {
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
        lyricsContainer.innerHTML = '<p class="no-lyrics">Lyrics not available</p>';
    }
}

window.addEventListener('DOMContentLoaded', () => {
    initPlayer();
    updatePlaylistDisplay();
});