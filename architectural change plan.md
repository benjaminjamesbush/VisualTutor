Of course, here is the text formatted as plain markdown.

-----

Here is Claude's plan:

### Plan: Migrate to Browser-Led Orchestration Architecture

-----

### Phase 1: Preserve Existing Files as Reference

1.  Rename current implementation files:
      * `public/gemini-chat.html` → `public/gemini-chat-old.html`
      * `server.js` → `server-old.js`

-----

### Phase 2: Create Core Client-Side Modules

2.  Create `public/js/FSM.js` - Finite State Machine implementation:
    ```javascript
    // States:
    // - IDLE: Not transcribing, can type, waiting for input
    // - LISTENING: Actively transcribing voice, can also type
    // - AWAITING_LLM_RESPONSE: Sent message, waiting for response
    // - SPEAKING: Playing AI response (TTS active)
    ```
3.  Create `public/js/AudioCapture.js` - MediaRecorder management
4.  Create `public/js/DeepgramClient.js` - STT WebSocket client
5.  Create `public/js/GeminiClient.js` - LLM streaming client
6.  Create `public/js/ElevenLabsClient.js` - TTS WebSocket client
7.  Create `public/js/AudioQueue.js` - Web Audio API queue manager

-----

### Phase 3: Create New HTML Interface

8.  Create `public/gemini-chat-v2.html` - Main orchestrator

-----

### Phase 4: Transform Server into Stateless Proxy

9.  Create `server-v2.js` with three proxy endpoints:
      * `/proxy/deepgram` - WebSocket proxy for STT
      * `/proxy/gemini` - HTTP proxy for LLM
      * `/proxy/elevenlabs` - WebSocket proxy for TTS

-----

### Phase 5: Corrected FSM State Transition Table

| Current State | Event Trigger | Condition | Action(s) | Target State |
| :--- | :--- | :--- | :--- | :--- |
| IDLE | Mute unchecked (Escape or checkbox) | - | Start MediaRecorder, Open Deepgram WS | LISTENING |
| IDLE | Enter×3 pressed | Has typed text OR transcribed text | Send combined text to Gemini | AWAITING\_LLM\_RESPONSE |
| IDLE | Enter×3 pressed | No typed text AND no transcribed text| Do nothing | IDLE |
| LISTENING | Mute checked (Escape or checkbox) | - | Stop MediaRecorder, Close Deepgram WS, Keep transcribed text | IDLE |
| LISTENING | Enter×3 pressed | Has typed text OR transcribed text | Stop MediaRecorder, Send CloseStream to Deepgram, Send combined text to Gemini | AWAITING\_LLM\_RESPONSE |
| LISTENING | Enter×3 pressed | No typed text AND no transcribed text| Do nothing | LISTENING |
| AWAITING\_LLM\_RESPONSE | Deepgram sends final transcript | - | Update transcribed text in UI (no state change) | AWAITING\_LLM\_RESPONSE |
| AWAITING\_LLM\_RESPONSE | LLM stream begins | - | Open ElevenLabs WS, Start TTS pipeline | SPEAKING |
| AWAITING\_LLM\_RESPONSE | LLM error | Mute checked | Show error, cleanup | IDLE |
| AWAITING\_LLM\_RESPONSE | LLM error | Mute unchecked | Show error, cleanup, Start MediaRecorder, Open Deepgram WS | LISTENING |
| SPEAKING | LLM text chunk received | - | Append to UI, Send to ElevenLabs | SPEAKING |
| SPEAKING | TTS audio chunk received | - | Decode and queue for playback | SPEAKING |
| SPEAKING | Enter pressed (interrupt) | Mute checked | Abort all connections, Clear queues | IDLE |
| SPEAKING | Enter pressed (interrupt) | Mute unchecked | Abort all connections, Clear queues, Start MediaRecorder, Open Deepgram WS | LISTENING |
| SPEAKING | Playback finished | Mute checked | Close all connections | IDLE |
| SPEAKING | Playback finished | Mute unchecked | Close TTS connection, Start MediaRecorder, Open Deepgram WS | LISTENING |
| ANY STATE | Critical error | - | Cleanup all connections, Reset UI | IDLE |

-----

### Phase 6: Key Implementation Details

**Combined Text Logic (used in multiple transitions):**

```javascript
function getCombinedText(typedText, transcribedText) {
    if (transcribedText && typedText) {
        return `Transcribed: ${transcribedText}\nTyped: ${typedText}`;
    } else if (transcribedText) {
        return `Transcribed: ${transcribedText}`;
    } else if (typedText) {
        return typedText;
    }
    return '';
}
```

**State-Specific Behaviors:**

**IDLE State:**

  * Microphone OFF, Deepgram disconnected
  * Can type in textarea
  * May have persisted transcription text visible
  * Enter×3 sends any available text (typed and/or transcribed)

**LISTENING State:**

  * Microphone ON, Deepgram connected
  * Live transcription updates│ Here is Claude's plan:                                                                                                                                                                                                                              │
│ ╭─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮ │
│ │ Plan: Migrate to Browser-Led Orchestration Architecture                                                                                                                                                                                         │ │
│ │                                                                                                                                                                                                                                                 │ │
│ │ Phase 1: Preserve Existing Files as Reference                                                                                                                                                                                                   │ │
│ │                                                                                                                                                                                                                                                 │ │
│ │ 1. Rename current implementation files:                                                                                                                                                                                                         │ │
│ │   - public/gemini-chat.html → public/gemini-chat-old.html                                                                                                                                                                                       │ │
│ │   - server.js → server-old.js                                                                                                                                                                                                                   │ │
│ │                                                                                                                                                                                                                                                 │ │
│ │ Phase 2: Create Core Client-Side Modules                                                                                                                                                                                                        │ │
│ │                                                                                                                                                                                                                                                 │ │
│ │ 2. Create public/js/FSM.js - Finite State Machine implementation:                                                                                                                                                                               │ │
│ │ // States:                                                                                                                                                                                                                                      │ │
│ │ // - IDLE: Not transcribing, can type, waiting for input                                                                                                                                                                                        │ │
│ │ // - LISTENING: Actively transcribing voice, can also type                                                                                                                                                                                      │ │
│ │ // - AWAITING_LLM_RESPONSE: Sent message, waiting for response                                                                                                                                                                                  │ │
│ │ // - SPEAKING: Playing AI response (TTS active)                                                                                                                                                                                                 │ │
│ │ 3. Create public/js/AudioCapture.js - MediaRecorder management                                                                                                                                                                                  │ │
│ │ 4. Create public/js/DeepgramClient.js - STT WebSocket client                                                                                                                                                                                    │ │
│ │ 5. Create public/js/GeminiClient.js - LLM streaming client                                                                                                                                                                                      │ │
│ │ 6. Create public/js/ElevenLabsClient.js - TTS WebSocket client                                                                                                                                                                                  │ │
│ │ 7. Create public/js/AudioQueue.js - Web Audio API queue manager                                                                                                                                                                                 │ │
│ │                                                                                                                                                                                                                                                 │ │
│ │ Phase 3: Create New HTML Interface                                                                                                                                                                                                              │ │
│ │                                                                                                                                                                                                                                                 │ │
│ │ 8. Create public/gemini-chat-v2.html - Main orchestrator                                                                                                                                                                                        │ │
│ │                                                                                                                                                                                                                                                 │ │
│ │ Phase 4: Transform Server into Stateless Proxy                                                                                                                                                                                                  │ │
│ │                                                                                                                                                                                                                                                 │ │
│ │ 9. Create server-v2.js with three proxy endpoints:                                                                                                                                                                                              │ │
│ │   - /proxy/deepgram - WebSocket proxy for STT                                                                                                                                                                                                   │ │
│ │   - /proxy/gemini - HTTP proxy for LLM                                                                                                                                                                                                          │ │
│ │   - /proxy/elevenlabs - WebSocket proxy for TTS                                                                                                                                                                                                 │ │
│ │                                                                                                                                                                                                                                                 │ │
│ │ Phase 5: Corrected FSM State Transition Table                                                                                                                                                                                                   │ │
│ │                                                                                                                                                                                                                                                 │ │
│ │ | Current State         | Event Trigger                       | Condition                             | Action(s)                                                                      | Target State          |                                │ │
│ │ |-----------------------|-------------------------------------|---------------------------------------|--------------------------------------------------------------------------------|-----------------------|                                │ │
│ │ | IDLE                  | Mute unchecked (Escape or checkbox) | -                                     | Start MediaRecorder, Open Deepgram WS                                          | LISTENING             |                                │ │
│ │ | IDLE                  | Enter×3 pressed                     | Has typed text OR transcribed text    | Send combined text to Gemini                                                   | AWAITING_LLM_RESPONSE |                                │ │
│ │ | IDLE                  | Enter×3 pressed                     | No typed text AND no transcribed text | Do nothing                                                                     | IDLE                  |                                │ │
│ │ | LISTENING             | Mute checked (Escape or checkbox)   | -                                     | Stop MediaRecorder, Close Deepgram WS, Keep transcribed text                   | IDLE                  |                                │ │
│ │ | LISTENING             | Enter×3 pressed                     | Has typed text OR transcribed text    | Stop MediaRecorder, Send CloseStream to Deepgram, Send combined text to Gemini | AWAITING_LLM_RESPONSE |                                │ │
│ │ | LISTENING             | Enter×3 pressed                     | No typed text AND no transcribed text | Do nothing                                                                     | LISTENING             |                                │ │
│ │ | AWAITING_LLM_RESPONSE | Deepgram sends final transcript     | -                                     | Update transcribed text in UI (no state change)                                | AWAITING_LLM_RESPONSE |                                │ │
│ │ | AWAITING_LLM_RESPONSE | LLM stream begins                   | -                                     | Open ElevenLabs WS, Start TTS pipeline                                         | SPEAKING              |                                │ │
│ │ | AWAITING_LLM_RESPONSE | LLM error                           | Mute checked                          | Show error, cleanup                                                            | IDLE                  |                                │ │
│ │ | AWAITING_LLM_RESPONSE | LLM error                           | Mute unchecked                        | Show error, cleanup, Start MediaRecorder, Open Deepgram WS                     | LISTENING             |                                │ │
│ │ | SPEAKING              | LLM text chunk received             | -                                     | Append to UI, Send to ElevenLabs                                               | SPEAKING              |                                │ │
│ │ | SPEAKING              | TTS audio chunk received            | -                                     | Decode and queue for playback                                                  | SPEAKING              |                                │ │
│ │ | SPEAKING              | Enter pressed (interrupt)           | Mute checked                          | Abort all connections, Clear queues                                            | IDLE                  |                                │ │
│ │ | SPEAKING              | Enter pressed (interrupt)           | Mute unchecked                        | Abort all connections, Clear queues, Start MediaRecorder, Open Deepgram WS     | LISTENING             |                                │ │
│ │ | SPEAKING              | Playback finished                   | Mute checked                          | Close all connections                                                          | IDLE                  |                                │ │
│ │ | SPEAKING              | Playback finished                   | Mute unchecked                        | Close TTS connection, Start MediaRecorder, Open Deepgram WS                    | LISTENING             |                                │ │
│ │ | ANY STATE             | Critical error                      | -                                     | Cleanup all connections, Reset UI                                              | IDLE                  |                                │ │
│ │                                                                                                                                                                                                                                                 │ │
│ │ Phase 6: Key Implementation Details                                                                                                                                                                                                             │ │
│ │                                                                                                                                                                                                                                                 │ │
│ │ Combined Text Logic (used in multiple transitions):                                                                                                                                                                                             │ │
│ │ function getCombinedText(typedText, transcribedText) {                                                                                                                                                                                          │ │
│ │     if (transcribedText && typedText) {                                                                                                                                                                                                         │ │
│ │         return `Transcribed: ${transcribedText}\nTyped: ${typedText}`;                                                                                                                                                                          │ │
│ │     } else if (transcribedText) {                                                                                                                                                                                                               │ │
│ │         return `Transcribed: ${transcribedText}`;                                                                                                                                                                                               │ │
│ │     } else if (typedText) {                                                                                                                                                                                                                     │ │
│ │         return typedText;                                                                                                                                                                                                                       │ │
│ │     }                                                                                                                                                                                                                                           │ │
│ │     return '';                                                                                                                                                                                                                                  │ │
│ │ }                                                                                                                                                                                                                                               │ │
│ │                                                                                                                                                                                                                                                 │ │
│ │ State-Specific Behaviors:                                                                                                                                                                                                                       │ │
│ │                                                                                                                                                                                                                                                 │ │
│ │ IDLE State:                                                                                                                                                                                                                                     │ │
│ │ - Microphone OFF, Deepgram disconnected                                                                                                                                                                                                         │ │
│ │ - Can type in textarea                                                                                                                                                                                                                          │ │
│ │ - May have persisted transcription text visible                                                                                                                                                                                                 │ │
│ │ - Enter×3 sends any available text (typed and/or transcribed)                                                                                                                                                                                   │ │
│ │                                                                                                                                                                                                                                                 │ │
│ │ LISTENING State:                                                                                                                                                                                                                                │ │
│ │ - Microphone ON, Deepgram connected                                                                                                                                                                                                             │ │
│ │ - Live transcription updates                                                                                                                                                                                                                    │ │
│ │ - Can type simultaneously                                                                                                                                                                                                                       │ │
│ │ - Enter×3 sends combined input                                                                                                                                                                                                                  │ │
│ │                                                                                                                                                                                                                                                 │ │
│ │ AWAITING_LLM_RESPONSE State:                                                                                                                                                                                                                    │ │
│ │ - All input disabled                                                                                                                                                                                                                            │ │
│ │ - May receive final Deepgram transcript (just update UI)                                                                                                                                                                                        │ │
│ │ - Waiting for Gemini to start streaming                                                                                                                                                                                                         │ │
│ │                                                                                                                                                                                                                                                 │ │
│ │ SPEAKING State:                                                                                                                                                                                                                                 │ │
│ │ - All input disabled except interrupt (Enter)                                                                                                                                                                                                   │ │
│ │ - Concurrent LLM→TTS pipeline active                                                                                                                                                                                                            │ │
│ │ - Audio playing through Web Audio API                                                                                                                                                                                                           │ │
│ │                                                                                                                                                                                                                                                 │ │
│ │ Phase 7: Deepgram Final Transcript Handling                                                                                                                                                                                                     │ │
│ │                                                                                                                                                                                                                                                 │ │
│ │ When transitioning from LISTENING to AWAITING_LLM_RESPONSE:                                                                                                                                                                                     │ │
│ │ 1. Send CloseStream to Deepgram                                                                                                                                                                                                                 │ │
│ │ 2. Deepgram may send a final transcript after CloseStream                                                                                                                                                                                       │ │
│ │ 3. If in AWAITING_LLM_RESPONSE when final transcript arrives, just update the UI                                                                                                                                                                │ │
│ │ 4. The combined text was already sent to Gemini, so no action needed                                                                                                                                                                            │ │
│ │                                                                                                                                                                                                                                                 │ │
│ │ Phase 8: Error Recovery                                                                                                                                                                                                                         │ │
│ │                                                                                                                                                                                                                                                 │ │
│ │ LLM Error Recovery:                                                                                                                                                                                                                             │ │
│ │ - If mute is checked → go to IDLE                                                                                                                                                                                                               │ │
│ │ - If mute is unchecked → go to LISTENING (restart transcription)                                                                                                                                                                                │ │
│ │                                                                                                                                                                                                                                                 │ │
│ │ Connection Error Recovery:                                                                                                                                                                                                                      │ │
│ │ - Any critical error → IDLE (safest state)                                                                                                                                                                                                      │ │
│ │ - User can manually unmute to restart                                                                                                                                                                                                           │ │
│ │                                                                                                                                                                                                                                                 │ │
│ │ Phase 9: Implementation Notes                                                                                                                                                                                                                   │ │
│ │                                                                                                                                                                                                                                                 │ │
│ │ Transcription Text Persistence:                                                                                                                                                                                                                 │ │
│ │ - Store transcribed text in a variable outside FSM                                                                                                                                                                                              │ │
│ │ - Clear only when message is sent successfully                                                                                                                                                                                                  │ │
│ │ - Preserve when transitioning LISTENING → IDLE (mute)                                                                                                                                                                                           │ │
│ │                                                                                                                                                                                                                                                 │ │
│ │ Mute State Tracking:                                                                                                                                                                                                                            │ │
│ │ - FSM needs access to mute checkbox state                                                                                                                                                                                                       │ │
│ │ - Used in multiple transitions to determine target state                                                                                                                                                                                        │ │
│ │ - Escape key toggles checkbox then triggers transition                                                                                                                                                                                          │ │
│ │                                                                                                                                                                                                                                                 │ │
│ │ Enter Key Handling:                                                                                                                                                                                                                             │ │
│ │ - Track Enter press count                                                                                                                                                                                                                       │ │
│ │ - Reset count on any non-Enter key                                                                                                                                                                                                              │ │
│ │ - Different behavior based on current state and count                                                                                                                                                                                           │ │
│ │                                                                                                                                                                                                                                                 │ │
│ │ This corrected plan properly implements a true FSM without impossible state knowledge and handles all the complex interactions between typing, transcription, and mute states.                                                                  │ │
│ ╰────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  * Can type simultaneously
  * Enter×3 sends combined input

**AWAITING\_LLM\_RESPONSE State:**

  * All input disabled
  * May receive final Deepgram transcript (just update UI)
  * Waiting for Gemini to start streaming

**SPEAKING State:**

  * All input disabled except interrupt (Enter)
  * Concurrent LLM→TTS pipeline active
  * Audio playing through Web Audio API

-----

### Phase 7: Deepgram Final Transcript Handling

When transitioning from LISTENING to AWAITING\_LLM\_RESPONSE:

1.  Send `CloseStream` to Deepgram
2.  Deepgram may send a final transcript after `CloseStream`
3.  If in AWAITING\_LLM\_RESPONSE when final transcript arrives, just update the UI
4.  The combined text was already sent to Gemini, so no action needed

-----

### Phase 8: Error Recovery

**LLM Error Recovery:**

  * If mute is checked → go to IDLE
  * If mute is unchecked → go to LISTENING (restart transcription)

**Connection Error Recovery:**

  * Any critical error → IDLE (safest state)
  * User can manually unmute to restart

-----

### Phase 9: Implementation Notes

**Transcription Text Persistence:**

  * Store transcribed text in a variable outside FSM
  * Clear only when message is sent successfully
  * Preserve when transitioning LISTENING → IDLE (mute)

**Mute State Tracking:**

  * FSM needs access to mute checkbox state
  * Used in multiple transitions to determine target state
  * Escape key toggles checkbox then triggers transition

**Enter Key Handling:**

  * Track Enter press count
  * Reset count on any non-Enter key
  * Different behavior based on current state and count

This corrected plan properly implements a true FSM without impossible state knowledge and handles all the complex interactions between typing, transcription, and mute states.