const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// YouTube API endpoint
app.get('/api/search', async (req, res) => {
  try {
    const { query } = req.query;
    const API_KEY = process.env.YOUTUBE_API_KEY;
    
    if (!API_KEY) {
      return res.status(500).json({ 
        error: 'YouTube API key not configured.' 
      });
    }
    
    console.log('🔍 Searching YouTube for:', query);
    
    const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        part: 'snippet',
        q: query + ' official audio',
        type: 'video',
        videoCategoryId: '10',
        maxResults: 20,
        key: API_KEY
      }
    });
    
    console.log(`✅ Found ${response.data.items.length} results`);
    res.json(response.data);
    
  } catch (error) {
    console.error('❌ YouTube API Error:', error.message);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Multi-source lyrics fetcher with original language support
// Alternative: Genius lyrics scraper
app.get('/api/lyrics-genius', async (req, res) => {
  try {
    const { artist, title } = req.query;
    
    const searchQuery = `${artist} ${title}`;
    console.log(`🔍 Searching Genius for: ${searchQuery}`);
    
    // Use Genius API via some-random-api
    const response = await axios.get(
      `https://some-random-api.com/lyrics?title=${encodeURIComponent(searchQuery)}`,
      { timeout: 10000 }
    );
    
    if (response.data && response.data.lyrics) {
      console.log('✅ Found on Genius');
      return res.json({
        lyrics: response.data.lyrics,
        source: 'genius'
      });
    }
    
    res.status(404).json({ error: 'Not found' });
    
  } catch (error) {
    console.error('Genius error:', error.message);
    res.status(500).json({ error: 'Failed' });
  }
});

// In fetchLyrics function, update to:
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
        
        // Try main endpoint
        let response = await fetch(`/api/lyrics?artist=${encodeURIComponent(cleanArtist)}&title=${encodeURIComponent(cleanTitle)}`);
        let data = await response.json();
        
        // If failed, try Genius endpoint
        if (!data.lyrics || data.source === 'not-found') {
            console.log('Trying Genius...');
            response = await fetch(`/api/lyrics-genius?artist=${encodeURIComponent(cleanArtist)}&title=${encodeURIComponent(cleanTitle)}`);
            data = await response.json();
        }
        
        if (data.lyrics) {
            console.log('✅ Lyrics loaded');
            
            let sourceIndicator = '';
            if (data.source === 'ai-generated') {
                sourceIndicator = '<div style="background: rgba(255,255,255,0.1); padding: 10px; border-radius: 8px; margin-bottom: 20px; font-size: 0.9em;">🤖 AI-Generated Lyrics</div>';
            } else if (data.source === 'database' || data.source === 'genius') {
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

// Root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`🎵 Music Player running on port ${PORT}`);
  console.log(`📡 YouTube API: ${process.env.YOUTUBE_API_KEY ? '✅' : '❌'}`);
  console.log(`🤖 Gemini AI: ${process.env.GEMINI_API_KEY ? '✅' : '❌'}`);
});