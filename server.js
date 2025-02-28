const express = require('express');
const cors = require('cors');
const YTMusic = require('ytmusic-api');
const ytdlp = require('yt-dlp-exec');
const https = require('https');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

let ytmusic;

// Initialize YTMusic once at startup
(async () => {
  try {
    ytmusic = new YTMusic();
    await ytmusic.initialize();
    console.log('YTMusic initialized successfully');
  } catch (error) {
    console.error('Failed to initialize YTMusic:', error);
  }
})();

// Add new streaming endpoint
app.get('/api/stream/:videoId', async (req, res) => {
  try {
    const videoId = req.params.videoId;
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    // Get audio info and URL using yt-dlp with corrected options
    const info = await ytdlp(videoUrl, {
      dumpSingleJson: true,
      format: 'bestaudio[ext=m4a]',
      downloadSections: '*10-50',  // Extract from 10s to 50s
      noCheckCertificates: true,
    });

    if (!info || !info.url) {
      return res.status(404).json({ error: 'No audio format found' });
    }

    // Redirect to the audio URL
    res.redirect(info.url);

  } catch (error) {
    console.error('Streaming Error:', error);
    res.status(500).json({ 
      error: 'Failed to stream audio',
      details: error.message
    });
  }
});

app.get('/api/search/:query', async (req, res) => {
  try {
    const searchQuery = `${req.params.query} official audio`;
    console.log('Searching for:', searchQuery);
    
    const searchResults = await ytmusic.search(searchQuery);
    console.log('Search results:', JSON.stringify(searchResults, null, 2));
    
    if (!searchResults || searchResults.length === 0) {
      return res.status(404).json({ error: 'No results found' });
    }

    // Get the first valid result
    const firstResult = searchResults[0];
    console.log('Processing result:', firstResult);

    if (!firstResult) {
      return res.status(404).json({ error: 'Invalid search result' });
    }

    const songInfo = {
      id: firstResult.videoId || firstResult.id || '',
      title: firstResult.name || firstResult.title || 'Unknown Title',
      artist: firstResult.artists?.[0]?.name || firstResult.artist || 'Unknown Artist',
      thumbnail: firstResult.thumbnail || firstResult.thumbnails?.[0]?.url || '',
      duration: firstResult.duration || '',
      streamUrl: `/api/stream/${firstResult.videoId || firstResult.id}`, // New direct stream URL
      youtubeUrl: firstResult.videoId ? 
        `https://music.youtube.com/watch?v=${firstResult.videoId}` : 
        (firstResult.id ? `https://music.youtube.com/watch?v=${firstResult.id}` : '')
    };

    console.log('Sending song info:', songInfo);
    res.json(songInfo);
  } catch (error) {
    console.error('Search Error:', error);
    res.status(500).json({ 
      error: error.message,
      details: 'Failed to process search results'
    });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});