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

// Jamendo API - No authentication needed!
app.get('/api/search', async (req, res) => {
  try {
    const { query } = req.query;
    
    console.log('Searching Jamendo for:', query);
    
    const response = await axios.get('https://api.jamendo.com/v3.0/tracks/', {
      params: {
        client_id: '56d30c95',
        format: 'json',
        limit: 20,
        search: query,
        include: 'musicinfo',
        audioformat: 'mp32',
        imagesize: 200
      }
    });
    
    const items = response.data.results.map(track => ({
      id: { videoId: track.id },
      snippet: {
        title: track.name,
        channelTitle: track.artist_name,
        description: track.album_name || '',
        thumbnails: {
          default: { url: track.image || 'https://via.placeholder.com/80x60/667eea/ffffff?text=Music' },
          medium: { url: track.album_image || track.image || 'https://via.placeholder.com/320x180/667eea/ffffff?text=Music' }
        }
      },
      audioUrl: track.audio,
      duration: track.duration * 1000
    }));
    
    console.log(`✅ Found ${items.length} tracks`);
    res.json({ items });
    
  } catch (error) {
    console.error('❌ Jamendo API Error:', error.message);
    res.status(500).json({ 
      error: 'Search failed. Please try again.'
    });
  }
});

// Lyrics API
app.get('/api/lyrics', async (req, res) => {
  try {
    const { artist, title } = req.query;
    const response = await axios.get(`https://api.lyrics.ovh/v1/${artist}/${title}`);
    res.json(response.data);
  } catch (error) {
    res.status(404).json({ error: 'Lyrics not found' });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🎵 Music Player running on port ${PORT}`);
});