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
        error: 'YouTube API key not configured. Please add YOUTUBE_API_KEY to environment variables.' 
      });
    }
    
    console.log('🔍 Searching YouTube for:', query);
    
    const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        part: 'snippet',
        q: query + ' official audio',
        type: 'video',
        videoCategoryId: '10', // Music category
        maxResults: 20,
        key: API_KEY
      }
    });
    
    console.log(`✅ Found ${response.data.items.length} results`);
    res.json(response.data);
    
  } catch (error) {
    console.error('❌ YouTube API Error:', error.response?.data || error.message);
    
    if (error.response?.status === 403) {
      return res.status(403).json({ 
        error: 'YouTube API access denied. Please check API key restrictions in Google Cloud Console.'
      });
    }
    
    if (error.response?.status === 400) {
      return res.status(400).json({ 
        error: 'Invalid API key. Please check your YouTube API key.'
      });
    }
    
    res.status(500).json({ 
      error: 'Search failed: ' + (error.response?.data?.error?.message || error.message)
    });
  }
});

// Lyrics API
// Lyrics API with multiple fallbacks
app.get('/api/lyrics', async (req, res) => {
  try {
    const { artist, title } = req.query;
    
    console.log(`🔍 Searching lyrics for: ${artist} - ${title}`);
    
    // Try Method 1: lyrics.ovh
    try {
      const response1 = await axios.get(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`);
      if (response1.data.lyrics) {
        console.log('✅ Lyrics found via lyrics.ovh');
        return res.json(response1.data);
      }
    } catch (err) {
      console.log('❌ lyrics.ovh failed, trying next...');
    }
    
    // Try Method 2: Genius API (via scraping)
    try {
      const searchQuery = `${artist} ${title} lyrics`;
      const response2 = await axios.get(`https://some-random-api.ml/lyrics?title=${encodeURIComponent(searchQuery)}`);
      if (response2.data.lyrics) {
        console.log('✅ Lyrics found via some-random-api');
        return res.json({ lyrics: response2.data.lyrics });
      }
    } catch (err) {
      console.log('❌ some-random-api failed');
    }
    
    // If all fail, return not found
    console.log('❌ No lyrics found from any source');
    res.status(404).json({ error: 'Lyrics not found' });
    
  } catch (error) {
    console.error('Lyrics error:', error.message);
    res.status(404).json({ error: 'Lyrics not found' });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🎵 Music Player running on port ${PORT}`);
  console.log(`📡 YouTube API: ${process.env.YOUTUBE_API_KEY ? 'Configured ✅' : 'Not configured ❌'}`);
});