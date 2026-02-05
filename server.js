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

// AI-Powered Lyrics Generator
app.get('/api/lyrics', async (req, res) => {
  try {
    const { artist, title } = req.query;
    
    console.log(`🔍 Searching lyrics for: ${artist} - ${title}`);
    
    // Try Method 1: Real lyrics API first
    try {
      const response = await axios.get(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`);
      if (response.data.lyrics) {
        console.log('✅ Real lyrics found');
        return res.json({ 
          lyrics: response.data.lyrics,
          source: 'database',
          language: 'original'
        });
      }
    } catch (err) {
      console.log('❌ Real lyrics not found, generating with AI...');
    }
    
    // Method 2: Generate lyrics with AI
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'demo_key';
    
    const prompt = `You are a lyrics transcription assistant. Based on the song "${title}" by "${artist}", provide a creative interpretation of what the lyrics might be about in the original language the song is sung in.

IMPORTANT RULES:
1. Detect the language from the song/artist name (Hindi, Telugu, Tamil, English, etc.)
2. Write lyrics in that ORIGINAL language
3. Format: Verse-Chorus structure
4. Keep it appropriate and meaningful
5. Add [Verse 1], [Chorus], [Verse 2] labels
6. Make it 15-20 lines total

Song: ${title}
Artist: ${artist}

Generate lyrics now:`;

    try {
      const aiResponse = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
        {
          contents: [{
            parts: [{ text: prompt }]
          }]
        },
        {
          headers: { 'Content-Type': 'application/json' }
        }
      );
      
      const generatedLyrics = aiResponse.data.candidates[0].content.parts[0].text;
      
      console.log('✅ AI-generated lyrics created');
      return res.json({ 
        lyrics: generatedLyrics,
        source: 'ai-generated',
        language: 'auto-detected',
        note: '🤖 AI-generated interpretation (not official lyrics)'
      });
      
    } catch (aiError) {
      console.error('AI generation failed:', aiError.message);
      
      // Fallback: Simple template
      const fallbackLyrics = `[AI-Generated Interpretation]

This is "${title}" by ${artist}

🎵 [Verse 1]
A beautiful melody fills the air
With emotions beyond compare
Every note tells a story
Of love, life, and glory

🎵 [Chorus]
${title}
A song that touches the heart
${title}
A masterpiece of art

🎵 [Verse 2]
The rhythm flows like a stream
Living out a beautiful dream
Words that resonate deep inside
On this musical ride

🎵 [Chorus]
${title}
A song that touches the heart
${title}
A masterpiece of art

---
Note: These are AI-generated interpretive lyrics, not official transcriptions.`;

      return res.json({ 
        lyrics: fallbackLyrics,
        source: 'template',
        language: 'english'
      });
    }
    
  } catch (error) {
    console.error('Lyrics error:', error.message);
    res.status(500).json({ error: 'Could not generate lyrics' });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🎵 Music Player running on port ${PORT}`);
  console.log(`📡 YouTube API: ${process.env.YOUTUBE_API_KEY ? '✅' : '❌'}`);
  console.log(`🤖 Gemini AI: ${process.env.GEMINI_API_KEY ? '✅' : '❌'}`);
});