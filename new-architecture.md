

### **1\. Core Architecture: Browser-Led Orchestration with a Stateless Proxy**

This architecture places the browser at the center of the conversational pipeline. The client-side JavaScript is responsible for managing the entire flow of data between the user and the three core AI services: Deepgram (STT), Gemini (LLM), and ElevenLabs (TTS). This model enhances user privacy and simplifies the backend.1

* **Client-Side Responsibilities (The Orchestrator):**  
  * Manage the application's state using a Finite State Machine (FSM) driven by keyboard inputs.  
  * Capture microphone audio using the MediaRecorder API.3  
  * Stream audio Blob data to the Deepgram STT service via a WebSocket.4  
  * Maintain the conversation history locally in a JavaScript array.6  
  * Send the final transcript and history to the Gemini LLM API.7  
  * Stream the LLM's text response to the ElevenLabs TTS API.  
  * Queue and play the synthesized audio from ElevenLabs for a seamless user experience.8  
* **Server-Side Responsibilities (The Stateless Proxy):**  
  * Act as a secure intermediary that forwards requests from the client to the respective API endpoints.  
  * Inject the necessary API keys (Deepgram, Gemini, ElevenLabs) into the proxied requests. This is a critical security practice to prevent keys from ever being exposed in the client-side code.10  
  * Bypass browser Cross-Origin Resource Sharing (CORS) policies, which would otherwise block direct API calls from the browser.10

### **2\. The Control Flow: A Keyboard-Driven Finite State Machine**

A Finite State Machine (FSM) is the ideal pattern to manage the application's state, ensuring that operations occur in a predictable and orderly sequence. Your keyboard-driven interaction model simplifies the FSM design, as state transitions are triggered by explicit user actions rather than voice activity detection.15  
**FSM States:**

* IDLE: The initial state, waiting for user action.  
* LISTENING: The microphone is active, and MediaRecorder is streaming audio to Deepgram.  
* AWAITING\_LLM\_RESPONSE: The user has sent their message; the client is waiting for the final transcript and then the LLM response.  
* SPEAKING: The client is receiving the LLM text stream, forwarding it to ElevenLabs for synthesis, and playing the resulting audio.

**FSM Event Triggers & Transitions:**

| Current State | Event Trigger | Action(s) to Perform | Target State |
| :---- | :---- | :---- | :---- |
| IDLE | User presses "Enter" (to start) | Initialize MediaRecorder. Start microphone capture. Open Deepgram WebSocket. | LISTENING |
| LISTENING | User presses "Enter" x3 (to send) | Stop MediaRecorder. Send CloseStream message to Deepgram to finalize transcription.21 | AWAITING\_LLM\_RESPONSE |
| AWAITING\_LLM\_RESPONSE | finalTranscriptReceived | Send complete transcript and history to Gemini via fetch. | AWAITING\_LLM\_RESPONSE |
| AWAITING\_LLM\_RESPONSE | llmStreamBegan | Open ElevenLabs WebSocket. | SPEAKING |
| SPEAKING | llmStreamChunkReceived | Append text chunk to UI. Send text chunk to ElevenLabs WebSocket. | SPEAKING |
| SPEAKING | ttsAudioChunkReceived | Decode and enqueue audio chunk for playback. | SPEAKING |
| SPEAKING | User presses "Enter" (to interrupt) | Abort Gemini fetch request.25 Close ElevenLabs WebSocket.26 Clear TTS audio queue. Restart microphone capture. | LISTENING |
| SPEAKING | ttsPlaybackFinished | Close ElevenLabs connection. | IDLE |
| *Any State* | stopKeyPressed (e.g., Escape) | Abort all pending requests. Close all connections. Reset UI. | IDLE |

### **3\. The Asynchronous Pipeline: Implementation Guide**

This section details the core JavaScript features that enable the concurrent orchestration of the STT, LLM, and TTS streams.

#### **Step 1: Audio Input with MediaRecorder (STT)**

The MediaRecorder API is a straightforward way to capture and stream audio. It works by encoding audio into a specified format (like audio/webm) and providing it in chunks.27

* **JavaScript Features:**  
  * **navigator.mediaDevices.getUserMedia()**: This function prompts the user for microphone access and returns a Promise that resolves with a MediaStream object.3  
  * **MediaRecorder**: This API records the MediaStream. Its start(timeslice) method is key; it tells the recorder to emit data in chunks at regular intervals (e.g., every 250ms).5  
  * **ondataavailable event**: This event fires whenever a chunk of recorded audio is ready. The audio data is contained in event.data as a Blob object.5   
  * **WebSocket**: The primary API for real-time, bidirectional communication. The Blob from ondataavailable can be sent directly over the WebSocket to your proxy server.4

JavaScript

// Conceptual implementation of MediaRecorder streaming  
let mediaRecorder;  
let sttSocket;

async function startListening() {  
    const stream \= await navigator.mediaDevices.getUserMedia({ audio: true });  
    sttSocket \= new WebSocket('/proxy/deepgram'); // Connect to your proxy

    sttSocket.onopen \= () \=\> {  
        mediaRecorder \= new MediaRecorder(stream, { mimeType: 'audio/webm' });

        mediaRecorder.ondataavailable \= (event) \=\> {  
            if (event.data.size \> 0 && sttSocket.readyState \=== WebSocket.OPEN) {  
                sttSocket.send(event.data); // Send the Blob directly  
            }  
        };

        // Start recording and produce a chunk every 250ms  
        mediaRecorder.start(250);  
    };  
      
    sttSocket.onmessage \= (event) \=\> {  
        const data \= JSON.parse(event.data);  
        if (data.is\_final) {  
            // FSM: Trigger 'finalTranscriptReceived'  
        } else {  
            // Update UI with interim transcript  
        }  
    };  
}

function stopListening() {  
    if (mediaRecorder && mediaRecorder.state\!== 'inactive') {  
        mediaRecorder.stop();  
    }  
    if (sttSocket) {  
        // Tell Deepgram we're done sending audio to finalize transcription  
        sttSocket.send(JSON.stringify({ type: 'CloseStream' }));  
    }  
}

#### **Step 2: Response Generation with Gemini (LLM)**

Gemini's streaming chat endpoint uses Server-Sent Events (SSE) over a POST request, which requires using the fetch API.

* **JavaScript Features:**  
  * **fetch() API**: Used to make the POST request to your Gemini proxy. The standard EventSource API is not suitable because it only supports GET requests.31  
  * **AbortController**: This is essential for implementing the keyboard-driven barge-in. An AbortController is created and its signal is passed to the fetch request. Calling controller.abort() immediately terminates the request, which is how you interrupt the LLM mid-stream.21  
  * **ReadableStream**: The response.body from a fetch call is a ReadableStream, which allows you to process the response in chunks as it arrives.  
  * **ReadableStreamDefaultReader**: Acquired via stream.getReader(), this object's read() method pulls individual chunks (Uint8Array) from the stream.  
  * **TextDecoder**: Used to convert the binary Uint8Array chunks from the stream into human-readable text strings.33

#### **Step 3: Voice Synthesis and Playback with ElevenLabs (TTS)**

This stage runs concurrently with the LLM response generation to minimize the time to first audio. As soon as text tokens arrive from Gemini, they are sent to the ElevenLabs WebSocket.

* **JavaScript Features:**  
  * **WebSocket**: A second WebSocket connection is opened to your ElevenLabs proxy. As text chunks are parsed from the Gemini stream, they are immediately sent over this socket.37  
  * **atob()**: The audio data returned from ElevenLabs is typically Base64 encoded. The atob() function is used to decode this into a binary string.15  
  * **AudioContext**: The central hub of the Web Audio API. It's used to manage and play all audio.27  
  * **audioContext.decodeAudioData()**: This asynchronous function takes the binary audio data (as an ArrayBuffer) and decodes it into a playable AudioBuffer. This is a necessary step before the audio can be scheduled for playback.41  
  * **Audio Playback Queue (Producer-Consumer Pattern):** To ensure smooth, gapless playback, you must implement a queue.42  
    * **Producer:** The WebSocket's onmessage handler acts as the producer. It decodes the incoming audio and pushes the resulting AudioBuffer into an array (the queue).  
    * **Consumer:** A dedicated playback function acts as the consumer. It pulls buffers from the queue and uses the AudioContext's high-precision timer to schedule them. By using source.start(playTime) and updating playTime with the duration of the current buffer, you can chain the audio chunks together seamlessly, eliminating clicks and gaps.44