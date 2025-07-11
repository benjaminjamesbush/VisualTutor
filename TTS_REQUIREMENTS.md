# TTS Integration Requirements

## Overview
This document outlines the requirements for integrating ElevenLabs Text-to-Speech (TTS) into the Gemini chatbot interface.

## Current State
- **Working Example**: `/public/elevenlabs-test.html` - Successfully converts text to speech using ElevenLabs API
- **Target**: `/public/gemini-chat.html` - Gemini chatbot that needs TTS integration
- **Server Endpoint**: `/api/text-to-speech` - Existing endpoint used by the working example

## Integration Requirements

### 1. Trigger Point
- TTS should activate after the LLM response streaming completes (when `[DONE]` is received)
- Should also handle interrupted/partial responses gracefully

### 2. Text Processing
- Gemini returns responses as JSON with a `sentences` array
- Extract sentences and concatenate with spaces: `sentences.join(' ')`
- Example response format:
  ```json
  {
    "sentences": [
      "Hello, how can I help you today?",
      "I'm here to assist with your questions."
    ]
  }
  ```

### 3. Audio Elements
- Create a new `<audio>` element for EACH assistant response
- Audio controls should be visible in the chat interface
- Style to fit within assistant message boxes
- Auto-play when ready (with graceful handling of browser autoplay policies)

### 4. Implementation Approach
- Follow the exact approach from `elevenlabs-test.html`
- Default voice ID: `21m00Tcm4TlvDq8ikWAM`

### 5. Integration Points in Chatbot
1. After receiving `[DONE]` from Gemini stream
2. Parse the JSON response
3. Extract and concatenate sentences
4. Create audio element
5. Call TTS API
6. Handle playback

## Logging Requirements

### Console Logging Points to Add

1. **In convertToSpeech function:**
   - Log when TTS conversion starts
   - Log text length and first 100 characters
   - Log audio element reference
   - Log TTS request being sent
   - Log response status and headers
   - Log blob conversion progress
   - Log blob size and type
   - Log audio URL creation
   - Log when audio element is configured
   - Log play() success/failure with detailed error info

2. **At TTS trigger point (after [DONE]):**
   - Log full response to parse
   - Log successful JSON parsing and parsed object
   - Log sentences array count and content
   - Log concatenated text for TTS
   - Log audio element creation and DOM insertion
   - Warn if no sentences array found

3. **For interrupted responses:**
   - Log when processing interrupted response
   - Log fixed response structure
   - Log sentences extraction from interrupted response
   - Log concatenated text for interrupted case
   - Warn if no sentences found in interrupted response

4. **Error handling logs:**
   - Log parsing errors with full response that failed
   - Log TTS API errors with full error details
   - Log autoplay failures with browser error details

### Additional Notes
- Comment out the "Sending audio chunk" console log that floods the console
- Ensure all logs use clear prefixes like "=== TTS CONVERSION STARTED ===" for easy filtering
- Add appropriate status messages to UI for user feedback