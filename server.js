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

// ============================================
// YOUTUBE SEARCH API
// ============================================
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
        videoCategoryId: '10',
        maxResults: 20,
        key: API_KEY
      },
      timeout: 10000
    });
    
    console.log(`✅ Found ${response.data.items.length} results`);
    res.json(response.data);
    
  } catch (error) {
    console.error('❌ YouTube API Error:', error.response?.data || error.message);
    
    if (error.response?.status === 403) {
      return res.status(403).json({ 
        error: 'YouTube API access denied. Please check API key restrictions.'
      });
    }
    
    res.status(500).json({ 
      error: 'Search failed: ' + (error.response?.data?.error?.message || error.message)
    });
  }
});

// ============================================
// ADVANCED LYRICS API WITH ORIGINAL LANGUAGE
// ============================================
app.get('/api/lyrics', async (req, res) => {
  try {
    const { artist, title } = req.query;
    
    console.log(`\n🔍 ========== LYRICS SEARCH ==========`);
    console.log(`Original: "${artist}" - "${title}"`);
    
    // ===== STEP 1: CLEAN THE INPUT =====
    const cleanTitle = title
      .replace(/\(.*?\)/g, '')           // Remove (Official Video)
      .replace(/\[.*?\]/g, '')           // Remove [Official Audio]
      .replace(/\|.*$/g, '')             // Remove | anything
      .replace(/official|audio|video|lyric|lyrics|hd|4k|full|song|music/gi, '')
      .split('-')[0]
      .trim();
    
    const cleanArtist = artist
      .split('-')[0]
      .split('•')[0]
      .split('|')[0]
      .replace(/VEVO|Topic|Official|Music|Records/gi, '')
      .trim();
    
    console.log(`Cleaned: "${cleanArtist}" - "${cleanTitle}"`);
    
    // ===== STEP 2: DETECT LANGUAGE =====
    const detectLanguage = (text) => {
      const combined = (text + ' ' + cleanArtist + ' ' + cleanTitle).toLowerCase();
      
      // Check for scripts
      if (/[\u0900-\u097F]/.test(text)) return { lang: 'Hindi', script: 'Devanagari' };
      if (/[\u0C00-\u0C7F]/.test(text)) return { lang: 'Telugu', script: 'Telugu' };
      if (/[\u0B80-\u0BFF]/.test(text)) return { lang: 'Tamil', script: 'Tamil' };
      if (/[\u0C80-\u0CFF]/.test(text)) return { lang: 'Kannada', script: 'Kannada' };
      if (/[\u0D00-\u0D7F]/.test(text)) return { lang: 'Malayalam', script: 'Malayalam' };
      
      // Hindi keywords
      const hindiKeywords = ['shararat', 'dhurandhar', 'bahubali', 'jiyo', 'prabhas', 
                             'nasha', 'dil', 'pyar', 'ishq', 'arijit', 'shreya', 
                             'kumar sanu', 'alka yagnik', 'udit narayan', 'sonu nigam',
                             'ranveer', 'madhubanti', 'saregama', 'bollywood'];
      if (hindiKeywords.some(kw => combined.includes(kw))) {
        return { lang: 'Hindi', script: 'Devanagari' };
      }
      
      // Telugu keywords
      const teluguKeywords = ['pushpa', 'allu arjun', 'mahesh babu', 'prabhas', 
                              'ram charan', 'jr ntr', 'tollywood'];
      if (teluguKeywords.some(kw => combined.includes(kw))) {
        return { lang: 'Telugu', script: 'Telugu' };
      }
      
      // Tamil keywords
      const tamilKeywords = ['vijay', 'rajini', 'thalapathy', 'ajith', 'kollywood'];
      if (tamilKeywords.some(kw => combined.includes(kw))) {
        return { lang: 'Tamil', script: 'Tamil' };
      }
      
      return { lang: 'English', script: 'English' };
    };
    
    const detectedLang = detectLanguage(title + ' ' + artist);
    console.log(`🌍 Detected: ${detectedLang.lang} (${detectedLang.script})`);
    
    // ===== STEP 3: TRY REAL LYRICS APIs =====
    
    // Method 1: lyrics.ovh
    try {
      console.log('📡 Trying lyrics.ovh...');
      const url = `https://api.lyrics.ovh/v1/${encodeURIComponent(cleanArtist)}/${encodeURIComponent(cleanTitle)}`;
      const response = await axios.get(url, { 
        timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      
      if (response.data && response.data.lyrics && response.data.lyrics.trim().length > 50) {
        console.log('✅ SUCCESS via lyrics.ovh');
        return res.json({ 
          lyrics: response.data.lyrics,
          source: 'lyrics.ovh',
          language: detectedLang.lang
        });
      }
    } catch (err) {
      console.log('❌ lyrics.ovh failed:', err.message);
    }
    
    // Method 2: some-random-api (Genius)
    try {
      console.log('📡 Trying some-random-api (Genius)...');
      const searchQuery = `${cleanArtist} ${cleanTitle}`;
      const response = await axios.get(
        `https://some-random-api.com/lyrics?title=${encodeURIComponent(searchQuery)}`,
        { timeout: 8000 }
      );
      
      if (response.data && response.data.lyrics && response.data.lyrics.trim().length > 50) {
        console.log('✅ SUCCESS via Genius');
        return res.json({ 
          lyrics: response.data.lyrics,
          source: 'genius',
          language: detectedLang.lang
        });
      }
    } catch (err) {
      console.log('❌ Genius failed:', err.message);
    }
    
    // Method 3: Try with just title
    try {
      console.log('📡 Trying with title only...');
      const url = `https://api.lyrics.ovh/v1/${encodeURIComponent(cleanArtist)}/${encodeURIComponent(cleanTitle.split(' ').slice(0, 3).join(' '))}`;
      const response = await axios.get(url, { timeout: 8000 });
      
      if (response.data && response.data.lyrics && response.data.lyrics.trim().length > 50) {
        console.log('✅ SUCCESS via title-only search');
        return res.json({ 
          lyrics: response.data.lyrics,
          source: 'lyrics.ovh-partial',
          language: detectedLang.lang
        });
      }
    } catch (err) {
      console.log('❌ Title-only search failed');
    }
    
    // ===== STEP 4: AI GENERATION IN ORIGINAL LANGUAGE =====
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    
    if (GEMINI_API_KEY && GEMINI_API_KEY !== 'demo_key') {
      console.log('🤖 Generating with AI in original language...');
      
      const scriptExamples = {
        'Hindi': 'हिंदी में लिखें (Example: मेरे दिल में है प्यार)',
        'Telugu': 'తెలుగులో రాయండి (Example: నా హృదయంలో ప్రేమ)',
        'Tamil': 'தமிழில் எழுதுங்கள் (Example: என் இதயத்தில் காதல்)',
        'Kannada': 'ಕನ್ನಡದಲ್ಲಿ ಬರೆಯಿರಿ (Example: ನನ್ನ ಹೃದಯದಲ್ಲಿ ಪ್ರೀತಿ)',
        'Malayalam': 'മലയാളത്തിൽ എഴുതുക (Example: എന്റെ ഹൃദയത്തിൽ സ്നേഹം)',
        'English': 'Write in English'
      };
      
      const prompt = `You are a professional lyrics writer. Generate authentic song lyrics for:

Song: "${cleanTitle}"
Artist: "${cleanArtist}"
Language: ${detectedLang.lang}
Script: ${detectedLang.script}

CRITICAL RULES:
1. Write ONLY in ${detectedLang.script} script - ${scriptExamples[detectedLang.lang]}
2. NO English words or Roman script (unless language is English)
3. Use authentic ${detectedLang.lang} vocabulary and expressions
4. Make it poetic and meaningful
5. Format: [Verse 1], [Chorus], [Verse 2], [Bridge], [Chorus]
6. Total: 25-30 lines
7. Capture the mood and theme of the song

Example structure for ${detectedLang.lang}:
[Verse 1]
${detectedLang.lang === 'Hindi' ? 'पहली लाइन यहाँ लिखें' : 'First line here'}
${detectedLang.lang === 'Hindi' ? 'दूसरी लाइन यहाँ लिखें' : 'Second line here'}

[Chorus]
${detectedLang.lang === 'Hindi' ? 'कोरस यहाँ लिखें' : 'Chorus here'}

Generate authentic ${detectedLang.lang} lyrics NOW in ${detectedLang.script} script:`;

      try {
        const aiResponse = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
          {
            contents: [{
              parts: [{ text: prompt }]
            }],
            generationConfig: {
              temperature: 0.9,
              maxOutputTokens: 2048,
              topP: 0.95,
              topK: 40
            }
          },
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: 15000
          }
        );
        
        if (aiResponse.data && aiResponse.data.candidates && aiResponse.data.candidates[0]) {
          const generatedLyrics = aiResponse.data.candidates[0].content.parts[0].text;
          
          // Verify it's in the correct script
          const hasCorrectScript = detectedLang.lang === 'English' || 
                                   (detectedLang.lang === 'Hindi' && /[\u0900-\u097F]/.test(generatedLyrics)) ||
                                   (detectedLang.lang === 'Telugu' && /[\u0C00-\u0C7F]/.test(generatedLyrics)) ||
                                   (detectedLang.lang === 'Tamil' && /[\u0B80-\u0BFF]/.test(generatedLyrics));
          
          if (hasCorrectScript) {
            console.log('✅ AI generated lyrics in correct script');
            return res.json({ 
              lyrics: generatedLyrics,
              source: 'ai-generated',
              language: detectedLang.lang,
              note: `🤖 AI-generated ${detectedLang.lang} lyrics (not official)`
            });
          } else {
            console.log('⚠️ AI generated wrong script, trying again...');
            
            // Try one more time with stricter prompt
            const strictPrompt = `WRITE ONLY IN ${detectedLang.script} SCRIPT. NO ENGLISH. Generate lyrics for "${cleanTitle}" by "${cleanArtist}" in ${detectedLang.lang} language using ${detectedLang.script} script only.`;
            
            const retryResponse = await axios.post(
              `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
              {
                contents: [{ parts: [{ text: strictPrompt }] }],
                generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
              },
              { timeout: 15000 }
            );
            
            const retryLyrics = retryResponse.data.candidates[0].content.parts[0].text;
            console.log('✅ AI retry successful');
            
            return res.json({ 
              lyrics: retryLyrics,
              source: 'ai-generated',
              language: detectedLang.lang,
              note: `🤖 AI-generated ${detectedLang.lang} lyrics (not official)`
            });
          }
        }
      } catch (aiError) {
        console.error('❌ AI generation failed:', aiError.message);
      }
    } else {
      console.log('⚠️ Gemini API key not configured');
    }
    
    // ===== STEP 5: FINAL FALLBACK =====
    console.log('❌ All methods failed');
    
    const fallbackMessage = `Lyrics not available for:
"${cleanTitle}" by ${cleanArtist}

🔍 Try searching on:
* Genius.com
* AZLyrics.com
* Google: "${cleanTitle} ${cleanArtist} lyrics"

Detected Language: ${detectedLang.lang}`;
    
    return res.json({
      lyrics: fallbackMessage,
      source: 'not-found',
      language: detectedLang.lang
    });
    
  } catch (error) {
    console.error('❌ FATAL ERROR:', error.message);
    res.status(500).json({ 
      lyrics: 'Error loading lyrics. Please try again.',
      source: 'error'
    });
  }
});

// ============================================
// ROOT ROUTE
// ============================================
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============================================
// START SERVER
// ============================================
app.listen(PORT, () => {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`🎵 GLOBAL MUSIC PLAYER`);
  console.log(`${'='.repeat(50)}`);
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 YouTube API: ${process.env.YOUTUBE_API_KEY ? '✅ Configured' : '❌ Not configured'}`);
  console.log(`🤖 Gemini AI: ${process.env.GEMINI_API_KEY ? '✅ Configured' : '❌ Not configured'}`);
  console.log(`🌐 Local: http://localhost:${PORT}`);
  console.log(`${'='.repeat(50)}\n`);
});