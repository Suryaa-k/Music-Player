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
app.get('/api/lyrics', async (req, res) => {
  try {
    const { artist, title } = req.query;
    
    console.log(`🔍 Searching lyrics for: ${artist} - ${title}`);
    
    // Clean up the search terms
    const cleanTitle = title
      .replace(/\(.*?\)/g, '')
      .replace(/\[.*?\]/g, '')
      .replace(/\|.*$/g, '')
      .split('-')[0]
      .replace(/official|audio|video|lyric|lyrics|hd|4k|full|song/gi, '')
      .trim();
    
    const cleanArtist = artist
      .split('-')[0]
      .split('•')[0]
      .replace(/VEVO|Topic|Official|Music/gi, '')
      .trim();
    
    console.log(`Cleaned: ${cleanArtist} - ${cleanTitle}`);
    
    // Method 1: Try lyrics.ovh
    try {
      console.log('Trying lyrics.ovh...');
      const response1 = await axios.get(
        `https://api.lyrics.ovh/v1/${encodeURIComponent(cleanArtist)}/${encodeURIComponent(cleanTitle)}`,
        { timeout: 5000 }
      );
      if (response1.data && response1.data.lyrics) {
        console.log('✅ Found via lyrics.ovh');
        return res.json({ 
          lyrics: response1.data.lyrics,
          source: 'lyrics.ovh',
          language: 'original'
        });
      }
    } catch (err) {
      console.log('❌ lyrics.ovh failed');
    }
    
    // Method 2: Try some-random-api
    try {
      console.log('Trying some-random-api...');
      const searchQuery = `${cleanArtist} ${cleanTitle}`;
      const response2 = await axios.get(
        `https://some-random-api.com/lyrics?title=${encodeURIComponent(searchQuery)}`,
        { timeout: 5000 }
      );
      if (response2.data && response2.data.lyrics) {
        console.log('✅ Found via some-random-api');
        return res.json({ 
          lyrics: response2.data.lyrics,
          source: 'genius',
          language: 'original'
        });
      }
    } catch (err) {
      console.log('❌ some-random-api failed');
    }
    
    // Method 3: Try alternative search
    try {
      console.log('Trying alternative search...');
      const searchTerm = `${cleanTitle} ${cleanArtist} lyrics`;
      const response3 = await axios.get(
        `https://api.lyrics.ovh/suggest/${encodeURIComponent(searchTerm)}`,
        { timeout: 5000 }
      );
      
      if (response3.data && response3.data.data && response3.data.data.length > 0) {
        const firstResult = response3.data.data[0];
        const lyricsResponse = await axios.get(
          `https://api.lyrics.ovh/v1/${encodeURIComponent(firstResult.artist.name)}/${encodeURIComponent(firstResult.title)}`,
          { timeout: 5000 }
        );
        
        if (lyricsResponse.data && lyricsResponse.data.lyrics) {
          console.log('✅ Found via suggest search');
          return res.json({ 
            lyrics: lyricsResponse.data.lyrics,
            source: 'lyrics.ovh-suggest',
            language: 'original'
          });
        }
      }
    } catch (err) {
      console.log('❌ Alternative search failed');
    }
    
    // Method 4: AI Generation as LAST RESORT
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    
    if (GEMINI_API_KEY) {
      console.log('🤖 Generating with AI as last resort...');
      
      // Detect language
      const detectLanguage = () => {
        const text = (title + ' ' + artist).toLowerCase();
        
        // Indian language keywords
        if (text.includes('shararat') || text.includes('dhurandhar') || 
            text.includes('ranveer') || text.includes('madhubanti')) return 'Hindi';
        if (text.includes('bahubali') || text.includes('prabhas') || 
            text.includes('jiyo')) return 'Hindi';
        if (text.includes('allu arjun') || text.includes('pushpa')) return 'Telugu';
        if (text.includes('vijay') || text.includes('thalapathy')) return 'Tamil';
        
        // Check for Devanagari or other scripts
        if (/[\u0900-\u097F]/.test(title + artist)) return 'Hindi';
        if (/[\u0C00-\u0C7F]/.test(title + artist)) return 'Telugu';
        if (/[\u0B80-\u0BFF]/.test(title + artist)) return 'Tamil';
        
        return 'English';
      };
      
      const language = detectLanguage();
      console.log(`Detected language: ${language}`);
      
      const scriptMap = {
        'Hindi': 'Devanagari (हिंदी)',
        'Telugu': 'Telugu script (తెలుగు)',
        'Tamil': 'Tamil script (தமிழ்)',
        'Kannada': 'Kannada script (ಕನ್ನಡ)',
        'Malayalam': 'Malayalam script (മലയാളം)',
        'English': 'English'
      };
      
      const prompt = `Generate song lyrics for "${cleanTitle}" by "${cleanArtist}".

STRICT REQUIREMENTS:
1. Language: ${language}
2. Script: ${scriptMap[language]}
3. Write ONLY in ${scriptMap[language]} - NO English translation
4. Use authentic ${language} words and poetic expressions
5. Format: [Verse 1], [Chorus], [Verse 2], [Bridge] structure
6. Length: 20-25 lines
7. Make it meaningful and poetic

Example format for Hindi:
[Verse 1]
पहली लाइन यहाँ
दूसरी लाइन यहाँ

[Chorus]
कोरस यहाँ

Generate authentic ${language} lyrics NOW in ${scriptMap[language]}:`;

      try {
        const aiResponse = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
          {
            contents: [{
              parts: [{ text: prompt }]
            }],
            generationConfig: {
              temperature: 0.9,
              maxOutputTokens: 2048
            }
          },
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000
          }
        );
        
        const generatedLyrics = aiResponse.data.candidates[0].content.parts[0].text;
        
        console.log('✅ AI-generated lyrics created');
        return res.json({ 
          lyrics: generatedLyrics,
          source: 'ai-generated',
          language: language,
          note: `🤖 AI-generated ${language} lyrics (not official)`
        });
        
      } catch (aiError) {
        console.error('AI generation failed:', aiError.message);
      }
    }
    
    // Final fallback
    console.log('❌ All methods failed');
    res.status(404).json({ 
      error: 'Lyrics not found',
      message: `Could not find lyrics for "${cleanTitle}" by "${cleanArtist}"`
    });
    
  } catch (error) {
    console.error('Lyrics error:', error.message);
    res.status(500).json({ error: 'Lyrics search failed' });
  }
});

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