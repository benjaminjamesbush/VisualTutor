const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const WebSocket = require('ws');
const { ElevenLabsClient } = require('@elevenlabs/elevenlabs-js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize ElevenLabs client
const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY
});

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, 'knowledge-base.txt');
  }
});

const upload = multer({ storage: storage });

if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

app.post('/upload-knowledge-base', upload.single('knowledgeBase'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  res.json({ message: 'Knowledge base uploaded successfully' });
});

// ElevenLabs API endpoints
app.get('/api/voices', async (req, res) => {
  try {
    const voices = await elevenlabs.voices.search();
    res.json(voices);
  } catch (error) {
    console.error('Error fetching voices:', error);
    res.status(500).json({ error: 'Failed to fetch voices: ' + error.message });
  }
});

app.post('/api/text-to-speech', async (req, res) => {
  try {
    const { text, voiceId = "21m00Tcm4TlvDq8ikWAM" } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const audioStream = await elevenlabs.textToSpeech.convert(voiceId, {
      text: text,
      model_id: "eleven_flash_v2_5",
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.5
      }
    });

    // Convert stream to buffer
    const chunks = [];
    for await (const chunk of audioStream) {
      chunks.push(chunk);
    }
    const audioBuffer = Buffer.concat(chunks);

    // Set appropriate headers
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.length
    });

    res.send(audioBuffer);
  } catch (error) {
    console.error('Error converting text to speech:', error);
    res.status(500).json({ error: 'Failed to convert text to speech: ' + error.message });
  }
});

// Streaming TTS endpoint for real-time audio playback
app.post('/api/text-to-speech-stream', async (req, res) => {
  try {
    const { text, voiceId = "21m00Tcm4TlvDq8ikWAM" } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const audioStream = await elevenlabs.textToSpeech.stream(voiceId, {
      text: text,
      model_id: "eleven_flash_v2_5",
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.5
      }
    });

    // Set headers for streaming
    res.set({
      'Content-Type': 'audio/mpeg',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    // Stream the audio data directly to the response
    for await (const chunk of audioStream) {
      res.write(chunk);
    }
    
    res.end();
  } catch (error) {
    console.error('Error streaming text to speech:', error);
    res.status(500).json({ error: 'Failed to stream text to speech: ' + error.message });
  }
});

// WebSocket TTS endpoint for real-time streaming
app.post('/api/text-to-speech-websocket', async (req, res) => {
  try {
    const { text, voiceId = "21m00Tcm4TlvDq8ikWAM" } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    // Connect to ElevenLabs WebSocket
    const wsUrl = `wss://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream-input?model_id=eleven_flash_v2_5&enable_logging=true`;
    const ws = new WebSocket(wsUrl, {
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY
      }
    });

    // Set headers for streaming response
    res.set({
      'Content-Type': 'audio/mpeg',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    ws.on('open', () => {
      console.log('WebSocket connected to ElevenLabs');
      
      // Send initial configuration (without auto_mode for manual control)
      const config = {
        text: " ",  // Space to initialize
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5
        },
        generation_config: {
          chunk_length_schedule: [120, 160, 250, 400] // Manual chunking schedule
        }
      };
      
      ws.send(JSON.stringify(config));
      
      // Send the actual text
      ws.send(JSON.stringify({ text: text }));
      
      // Send empty string to signal end
      ws.send(JSON.stringify({ text: "" }));
    });

    ws.on('message', (data) => {
      try {
        const response = JSON.parse(data.toString());
        
        if (response.audio) {
          // Convert base64 audio to buffer and stream to client
          const audioBuffer = Buffer.from(response.audio, 'base64');
          res.write(audioBuffer);
        }
        
        if (response.isFinal) {
          console.log('WebSocket TTS generation complete');
          res.end();
          ws.close();
        }
      } catch (parseError) {
        console.error('Error parsing WebSocket message:', parseError);
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'WebSocket error: ' + error.message });
      }
      ws.close();
    });

    ws.on('close', () => {
      console.log('WebSocket connection closed');
      if (!res.finished) {
        res.end();
      }
    });

    // Handle client disconnect
    req.on('close', () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    });

  } catch (error) {
    console.error('Error setting up WebSocket TTS:', error);
    res.status(500).json({ error: 'Failed to set up WebSocket TTS: ' + error.message });
  }
});

// Speech-to-Text endpoint
app.post('/api/speech-to-text', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Audio file is required' });
    }

    console.log('Received modelId from client:', req.body.modelId);
    const modelId = req.body.modelId || 'scribe_v1'; // Default to scribe_v1 - the main production STT model
    console.log('Using modelId:', modelId);

    // Create a ReadStream from the uploaded file
    const audioStream = fs.createReadStream(req.file.path);

    // Call ElevenLabs STT API with file stream
    const result = await elevenlabs.speechToText.convert({
      file: audioStream,
      modelId: modelId  // Try camelCase instead of snake_case
    });

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.json({
      text: result.text,
      chunks: result.chunks
    });

  } catch (error) {
    console.error('Error converting speech to text:', error);
    
    // Clean up uploaded file in case of error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({ error: 'Failed to convert speech to text: ' + error.message });
  }
});

app.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;
    
    let knowledgeBase = '';
    try {
      knowledgeBase = fs.readFileSync('uploads/knowledge-base.txt', 'utf-8');
    } catch (error) {
      return res.status(400).json({ error: 'Knowledge base not found. Please upload a knowledge base file first.' });
    }

    res.json({ 
      outline: '<ul><li>Response placeholder</li></ul>',
      fullText: 'This is a placeholder response. AI integration will be implemented next.',
      audioUrl: null
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});