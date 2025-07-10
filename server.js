const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const http = require('http');
const WebSocket = require('ws');
const { ElevenLabsClient } = require('@elevenlabs/elevenlabs-js');
const { createClient } = require('@deepgram/sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize ElevenLabs client
const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY
});

// Initialize Deepgram client
const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

// Initialize Gemini client
console.log('Initializing Gemini with API key:', process.env.GEMINI_API_KEY ? 'Key present' : 'Key missing');
console.log('API key length:', process.env.GEMINI_API_KEY?.length || 0);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

app.use(cors());
app.use(express.json());

// Disable caching for all static files (development only)
app.use((req, res, next) => {
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Surrogate-Control': 'no-store'
  });
  next();
});

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

// Gemini API endpoint - supports both streaming and non-streaming
app.post('/api/gemini', async (req, res) => {
  try {
    const { prompt, stream = false, structuredOutput = false } = req.body;
    
    if (!prompt) {
      console.log('ERROR: No prompt provided in request');
      return res.status(400).json({ error: 'No prompt provided' });
    }

    console.log('=== GEMINI API REQUEST ===');
    console.log('Prompt:', prompt);
    console.log('Stream mode:', stream);
    console.log('Structured output:', structuredOutput);
    console.log('API Key available:', !!process.env.GEMINI_API_KEY);
    console.log('API Key first 10 chars:', process.env.GEMINI_API_KEY?.substring(0, 10) || 'MISSING');
    
    // Build generation config
    const generationConfig = {};
    
    if (structuredOutput) {
      // Force JSON output with a schema for a list of sentences
      generationConfig.responseMimeType = 'application/json';
      generationConfig.responseJsonSchema = {
        type: 'object',
        properties: {
          sentences: {
            type: 'array',
            items: {
              type: 'string'
            },
            description: 'List of sentences in the response'
          }
        },
        required: ['sentences']
      };
    }
    
    if (stream) {
      // Set headers for streaming response
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      const result = await geminiModel.generateContentStream({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: generationConfig
      });
      
      console.log('=== GEMINI STREAMING STARTED ===');
      
      // The result has a stream property that is async iterable
      for await (const chunk of result.stream) {
        // Each chunk should have a text() method based on the docs
        const text = chunk.text();
        if (text) {
          // Send SSE (Server-Sent Events) format
          res.write(`data: ${JSON.stringify({ text })}\n\n`);
        }
      }
      
      // Send completion event
      res.write('data: [DONE]\n\n');
      res.end();
      
      console.log('=== GEMINI STREAMING COMPLETE ===');
    } else {
      // Non-streaming mode (original implementation)
      const result = await geminiModel.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: generationConfig
      });
      const response = result.response;
      const text = response.text();
      
      console.log('=== GEMINI API SUCCESS ===');
      console.log('Response length:', text.length);
      console.log('First 100 chars:', text.substring(0, 100));
      
      if (structuredOutput) {
        // Parse and return the JSON response
        try {
          const jsonResponse = JSON.parse(text);
          res.json({ response: jsonResponse });
        } catch (parseError) {
          console.error('Failed to parse JSON response:', parseError);
          res.json({ response: text });
        }
      } else {
        res.json({ response: text });
      }
    }
  } catch (error) {
    console.error('=== GEMINI API ERROR ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error status:', error.status);
    console.error('Error details:', JSON.stringify(error.errorDetails, null, 2));
    console.error('Full error:', error);
    
    const errorMessage = error.errorDetails 
      ? `${error.message} - ${JSON.stringify(error.errorDetails)}`
      : error.message;
    
    if (res.headersSent) {
      // If we're in streaming mode and headers are already sent
      res.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`);
      res.end();
    } else {
      res.status(500).json({ error: 'Failed to generate response: ' + errorMessage });
    }
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


// Create HTTP server
const server = http.createServer(app);

// WebSocket server for Deepgram STT proxy
const wss = new WebSocket.Server({ server, path: '/api/speech-to-text' });

console.log('WebSocket server created at path: /api/speech-to-text');

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server ready at ws://localhost:${PORT}/api/speech-to-text`);
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