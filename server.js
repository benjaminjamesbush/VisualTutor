const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const http = require('http');
const WebSocket = require('ws');
const { ElevenLabsClient } = require('@elevenlabs/elevenlabs-js');
const { createClient } = require('@deepgram/sdk');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize ElevenLabs client
const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY
});

// Initialize Deepgram client
const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

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


// WebSocket TTS endpoint for real-time streaming
app.post('/api/text-to-speech', async (req, res) => {
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

// Deepgram authentication endpoint for temporary tokens
app.get('/api/deepgram/authenticate', async (req, res) => {
  try {
    // For development, we can return the API key directly
    // In production, you should use Deepgram's createTemporaryKey API
    if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
      return res.json({
        key: process.env.DEEPGRAM_API_KEY
      });
    }

    // For production, generate a temporary key with restricted scope
    const { result, error } = await deepgram.auth.createKey({
      comment: 'Temporary key for browser STT',
      scopes: ['usage:read', 'project:read', 'keys:read'],
      expirationDate: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    });

    if (error) {
      throw new Error(error.message);
    }

    res.json({
      key: result.key
    });
  } catch (error) {
    console.error('Error creating Deepgram authentication token:', error);
    res.status(500).json({ error: 'Failed to create authentication token: ' + error.message });
  }
});

// Create HTTP server
const server = http.createServer(app);

// WebSocket server for Deepgram STT proxy
const wss = new WebSocket.Server({ server, path: '/api/speech-to-text-ws' });

console.log('WebSocket server created at path: /api/speech-to-text-ws');

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server ready at ws://localhost:${PORT}/api/speech-to-text-ws`);
});

// Add error handler for WebSocket server
wss.on('error', (error) => {
  console.error('WebSocket Server Error:', error);
});

wss.on('connection', (ws, req) => {
  console.log('Client connected for STT from:', req.headers.host);
  console.log('WebSocket URL:', req.url);

  let deepgramWs = null;
  let isConnected = false;
  const audioQueue = [];

  // Handle incoming messages from client
  ws.on('message', async (message) => {
    // console.log('Raw message received, type:', typeof message, 'isBuffer:', message instanceof Buffer, 'size:', message.length || message.byteLength);
    try {
      // Try to parse as JSON first (config messages are small)
      if (message instanceof Buffer && message.length < 1000) {
        try {
          const text = message.toString();
          const config = JSON.parse(text);
          console.log('Received config from client:', config);

          if (config.action === 'start') {
            console.log('Starting Deepgram connection...');
            // Initialize Deepgram WebSocket connection
            const deepgramUrl = new URL('wss://api.deepgram.com/v1/listen');

            // Add query parameters - match the working client implementation
            const params = {
              model: config.model || 'nova-3-medical',
              language: 'en-US',
              smart_format: 'true',
              punctuate: 'true',
              interim_results: 'true',
              utterance_end_ms: '1000',
              vad_events: 'true'
              // Don't specify encoding or sample_rate - let Deepgram auto-detect
            };

            Object.keys(params).forEach(key => {
              deepgramUrl.searchParams.append(key, params[key]);
            });

            console.log('Deepgram URL:', deepgramUrl.toString());
            console.log('API Key exists:', !!process.env.DEEPGRAM_API_KEY);
            console.log('API Key length:', process.env.DEEPGRAM_API_KEY ? process.env.DEEPGRAM_API_KEY.length : 0);

            // Create WebSocket connection to Deepgram
            deepgramWs = new WebSocket(deepgramUrl.toString(), {
              headers: {
                'Authorization': `Token ${process.env.DEEPGRAM_API_KEY}`
              }
            });

            deepgramWs.on('open', () => {
              console.log('Connected to Deepgram');
              isConnected = true;
              ws.send(JSON.stringify({ type: 'status', message: 'Connected to Deepgram' }));

              // Process and send any queued audio data
              console.log(`Processing ${audioQueue.length} queued audio chunks.`);
              while (audioQueue.length > 0) {
                const audioChunk = audioQueue.shift();
                if (deepgramWs.readyState === WebSocket.OPEN) {
                  deepgramWs.send(audioChunk);
                  // console.log('Forwarded queued audio to Deepgram');
                } else {
                  // If connection closes while processing queue, re-queue and stop.
                  audioQueue.unshift(audioChunk);
                  console.log('Deepgram connection closed while processing queue. Re-queueing chunk.');
                  break;
                }
              }
            });

            deepgramWs.on('message', (data) => {
              const message = data.toString();
              const parsed = JSON.parse(message);
              // console.log('Received from Deepgram - Type:', parsed.type, 'Has transcript:', !!(parsed.channel && parsed.channel.alternatives && parsed.channel.alternatives[0] && parsed.channel.alternatives[0].transcript));

              // Forward transcription results to client
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(message);
              }
            });

            deepgramWs.on('error', (error) => {
              console.error('Deepgram WebSocket error:', error);
              ws.send(JSON.stringify({ type: 'error', message: error.message }));
            });

            deepgramWs.on('close', () => {
              console.log('Deepgram connection closed');
              isConnected = false;
              ws.send(JSON.stringify({ type: 'status', message: 'Deepgram connection closed' }));
            });

          } else if (config.action === 'stop') {
            // Properly close Deepgram connection
            if (deepgramWs && deepgramWs.readyState === WebSocket.OPEN) {
              console.log('Sending CloseStream message to Deepgram');
              // Send CloseStream message to let Deepgram finish processing
              deepgramWs.send(JSON.stringify({ type: 'CloseStream' }));
              // Deepgram will close the connection after processing remaining audio
            } else if (deepgramWs) {
              deepgramWs.close();
              deepgramWs = null;
            }
          }
          return; // Exit after handling config
        } catch (e) {
          // Not JSON, treat as audio
        }
      }

      // Handle as audio data
      if (message instanceof Buffer || message instanceof ArrayBuffer) {
        // console.log('Received audio chunk from client:', message.length, 'bytes');
        if (deepgramWs && deepgramWs.readyState === WebSocket.OPEN) {
          // If connection is open, send audio immediately
          deepgramWs.send(message);
          // console.log('Forwarded audio to Deepgram');
        } else if (deepgramWs) {
          // If connection is connecting, queue audio
          // console.log('Deepgram WebSocket not ready. State:', deepgramWs.readyState, 'Queueing audio chunk.');
          audioQueue.push(message);
        } else {
          // If deepgramWs is not initialized, log it (should not happen in normal flow)
          console.log('Deepgram connection not initialized. Ignoring audio chunk.');
        }
      }
    } catch (error) {
      console.error('Error handling client message:', error);
      ws.send(JSON.stringify({ type: 'error', message: error.message }));
    }
  });

  // Handle client disconnect
  ws.on('close', () => {
    console.log('Client disconnected from STT');
    if (deepgramWs) {
      deepgramWs.close();
      deepgramWs = null;
    }
    // Clear queue on disconnect
    audioQueue.length = 0;
  });

  ws.on('error', (error) => {
    console.error('Client WebSocket error:', error);
    if (deepgramWs) {
      deepgramWs.close();
      deepgramWs = null;
    }
    // Clear queue on error
    audioQueue.length = 0;
  });
});