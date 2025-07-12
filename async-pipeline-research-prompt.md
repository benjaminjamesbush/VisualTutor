# Research Request: JavaScript Async Pipeline for Conversational AI

## Context
We are building a conversational AI chatbot that currently has a sequential architecture:
1. User speaks/types a message
2. Gemini API streams a response (Server-Sent Events)
3. After response completes, we wait 625ms (required delay)
4. Then we call ElevenLabs TTS API to generate audio
5. Audio plays back to user

The 625ms delay is required because the browser blocks new HTTP fetch requests when called from within an active streaming response handler context.

## Problem
We want to implement a true asynchronous pipeline similar to this Python example:

```python
# Concurrent producers/consumers with queues
async def gemini_stream_consumer(prompt: str):
    # Streams response and puts text into queue
    
async def text_chunk_processor():
    # Consumes text, chunks it, puts into another queue
    
async def elevenlabs_tts_producer():
    # Consumes chunks, produces audio, puts into audio queue
    
def audio_playback_consumer():
    # Consumes audio bytes and plays them

# All run concurrently
await asyncio.gather(gemini_task, chunker_task, tts_task)
```

## Tech Stack
- **Server**: Node.js with Express.js
- **Client**: Vanilla JavaScript (no framework)
- **Server Protocols**:
  - Gemini API: HTTP POST with Server-Sent Events (SSE) streaming response
  - ElevenLabs TTS: HTTP POST that creates WebSocket to ElevenLabs
  - Deepgram STT: WebSocket proxy (server acts as middleman)
- **Deployment**: Browser-sync for development, standard Node.js for production

## Current Technical Constraints
- Browser blocks fetch requests from within streaming response handlers
- Minimum 625ms delay needed between Gemini response and TTS request
- Current implementation in `gemini-chat.html` is purely sequential
- Server currently handles each service separately (no coordination)

## Research Goals
Please find or create example implementations that show:

1. **JavaScript/Browser patterns for concurrent stream processing** similar to Python's asyncio
   - How to process incoming Gemini SSE stream while simultaneously making TTS requests
   - Techniques to escape the browser's streaming context restrictions
   - Queue-based communication patterns in JavaScript

2. **Working examples of real-time conversational AI in the browser**
   - Implementations that handle LLM + TTS concurrently
   - How others solve the concurrent streaming limitation
   - Preferably using standard web APIs (not proprietary SDKs)

3. **Specific architectural patterns for:**
   - Web Workers for parallel processing
   - MessageChannel/BroadcastChannel for queue-like communication
   - Streams API for handling chunked data
   - Techniques to coordinate multiple WebSocket/SSE connections

4. **Example code or repositories showing:**
   - Browser-based conversational agents with parallel pipelines
   - Real-time audio streaming with text generation
   - Solutions to the "can't fetch while streaming" problem

## Deliverables Needed
1. Concrete code examples (GitHub repos, CodePen, etc.)
2. Architectural diagrams of successful implementations
3. Specific JavaScript patterns that mirror Python's async/queue approach
4. Explanation of how to break out of browser streaming context limitations

## What We Don't Need
- General explanations of async JavaScript
- Simple Promise/async-await tutorials
- Proprietary SDK documentation without implementation details

## Important Notes
- We control both client (browser) and server (Node.js/Express) code
- Solutions can involve changes to either client-side, server-side, or both
- Server-side coordination between services is welcome
- Hybrid approaches (e.g., server-side orchestration with client-side streaming) are encouraged

Please focus on finding actual working examples or detailed implementation guides for concurrent streaming pipelines that could work in our browser+Node.js architecture.