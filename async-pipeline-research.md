# Asynchronous Pipeline Research for Conversational AI

## Python Example Pattern
*Source: User-provided Python code example in conversation*

The Python example shows a pipeline with:
- **Concurrent producers/consumers**: Multiple async tasks running simultaneously
- **Queue-based communication**: Decoupled components communicating through queues
- **True streaming**: Text chunks flow through the pipeline as they arrive

Key components:
1. `gemini_stream_consumer` - Connects to Gemini and streams response
2. `text_chunk_processor` - Consumes raw text, applies chunking logic
3. `elevenlabs_tts_producer` - Consumes text chunks and produces audio
4. `audio_playback_consumer` - Consumes audio bytes and plays them

## JavaScript Async Pipeline Architecture

### Core Concepts for JS Implementation

1. **Web Workers** for parallel processing (similar to Python's asyncio tasks)
2. **MessageChannel** or **BroadcastChannel** for queue-like communication
3. **Streams API** for handling chunked data
4. **MediaSource API** for audio playback

### Key Differences from Current Implementation

*Source: Analysis of current implementation in gemini-chat.html*

Current (Sequential):
- Gemini completes → Wait 625ms → Start TTS
- Blocking operations in same context

Target (Parallel):
- Gemini streaming → Queue → TTS streaming → Audio playback
- Non-blocking, concurrent operations

### Implementation Strategy

1. **Main Thread**: UI and coordination
2. **Worker 1**: Gemini stream consumer
3. **Worker 2**: Text processor/chunker (future)
4. **Worker 3**: TTS producer
5. **Main Thread**: Audio playback consumer

### Communication Pattern

```javascript
// Queue-like communication using MessageChannel
const channel = new MessageChannel();

// Producer
channel.port1.postMessage({ type: 'text', data: chunk });

// Consumer
channel.port2.onmessage = (event) => {
  if (event.data.type === 'text') {
    processText(event.data.data);
  }
};
```

### Challenges to Address

1. **Browser Context Limitations**: The 625ms delay requirement suggests browser/server limitations on concurrent streaming
2. **WebSocket Management**: Need to handle multiple WebSocket connections concurrently
3. **Synchronization**: Coordinating between multiple workers and streams
4. **Error Handling**: Propagating errors across worker boundaries

## Notes on Async Pipeline Architecture

*Note: The following is based on our conversation and analysis, not external documentation*

The async pipeline approach we're exploring would involve:
- Parallel processing of Gemini responses and TTS generation
- Queue-based communication between components
- Breaking out of the browser's streaming context limitations that require the 625ms delay

## Architecture for New Test Page

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Gemini    │────▶│ Text Queue   │────▶│    TTS      │
│   Worker    │     │ (Channel)    │     │   Worker    │
└─────────────┘     └──────────────┘     └─────────────┘
                                                 │
                                                 ▼
                                         ┌─────────────┐
                                         │Audio Queue  │
                                         │ (Channel)   │
                                         └─────────────┘
                                                 │
                                                 ▼
                                         ┌─────────────┐
                                         │   Audio     │
                                         │  Playback   │
                                         └─────────────┘
```

This architecture allows true parallel processing where Gemini can continue streaming while TTS is already processing earlier chunks.