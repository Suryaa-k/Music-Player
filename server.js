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
    
    if (!API_KEY || API_KEY === 'YOUR_YOUTUBE_API_KEY') {
      return res.status(500).json({ 
        error: 'YouTube API key not configured. Please add YOUTUBE_API_KEY to environment variables.' 
      });
    }
    
    const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        part: 'snippet',
        q: query,
        type: 'video',
        videoCategoryId: '10',
        maxResults: 20,
        key: API_KEY
      }
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('Search error:', error.message);
    res.status(500).json({ error: 'Search failed: ' + error.message });
  }
});

// Lyrics API endpoint
app.get('/api/lyrics', async (req, res) => {
  try {
    const { artist, title } = req.query;
    const response = await axios.get(`https://api.lyrics.ovh/v1/${artist}/${title}`);
    res.json(response.data);
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
  console.log(`Visit: http://localhost:${PORT}`);
});