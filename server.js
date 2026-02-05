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

// SoundCloud API endpoint
app.get('/api/search', async (req, res) => {
  try {
    const { query } = req.query;
    const CLIENT_ID = process.env.SOUNDCLOUD_CLIENT_ID;
    
    if (!CLIENT_ID) {
      return res.status(500).json({ 
        error: 'SoundCloud Client ID not configured. Please add SOUNDCLOUD_CLIENT_ID to environment variables.' 
      });
    }
    
    console.log('Searching SoundCloud for:', query);
    
    const response = await axios.get('https://api-v2.soundcloud.com/search/tracks', {
      params: {
        q: query,
        client_id: CLIENT_ID,
        limit: 20,
        linked_partitioning: 1
      }
    });
    
    // Transform to our format
    const items = response.data.collection.map(track => ({
      id: { videoId: track.id },
      snippet: {
        title: track.title,
        channelTitle: track.user.username,
        description: track.description || '',
        thumbnails: {
          default: { url: track.artwork_url || track.user.avatar_url },
          medium: { url: track.artwork_url ? track.artwork_url.replace('large', 't500x500') : track.user.avatar_url }
        }
      },
      streamUrl: track.media?.transcodings?.find(t => t.format.protocol === 'progressive')?.url || null,
      duration: track.duration,
      playbackCount: track.playback_count
    }));
    
    console.log(`Found ${items.length} tracks`);
    res.json({ items });
    
  } catch (error) {
    console.error('SoundCloud API Error:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Search failed: ' + (error.response?.data?.errors?.[0]?.error_message || error.message)
    });
  }
});

// Get stream URL for a track
app.get('/api/stream/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const CLIENT_ID = process.env.SOUNDCLOUD_CLIENT_ID;
    
    // Get track info
    const trackResponse = await axios.get(`https://api-v2.soundcloud.com/tracks/${id}`, {
      params: { client_id: CLIENT_ID }
    });
    
    const track = trackResponse.data;
    
    // Get progressive stream URL
    const progressive = track.media?.transcodings?.find(t => 
      t.format.protocol === 'progressive' && t.format.mime_type === 'audio/mpeg'
    );
    
    if (!progressive) {
      return res.status(404).json({ error: 'Stream not available' });
    }
    
    // Get actual stream URL
    const streamResponse = await axios.get(progressive.url, {
      params: { client_id: CLIENT_ID }
    });
    
    res.json({ 
      url: streamResponse.data.url,
      duration: track.duration
    });
    
  } catch (error) {
    console.error('Stream error:', error.message);
    res.status(500).json({ error: 'Failed to get stream URL' });
  }
});

// Lyrics API
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