This file contains critical instructions you must follow when working with code in this repository.

# Assistant Behavior Rules

- **Non-blocking server execution**: When starting Node.js servers or long-running processes, ALWAYS use `nohup command > logfile.log 2>&1 &` to run in background without blocking the terminal session
- **Auto-restart development server**: For development, use `nohup npm run dev > server.log 2>&1 &` to start nodemon which auto-restarts on file changes
- **Follow through on checks**: When you say "let me check" or "I'll check", you MUST immediately perform the actual check using available tools. Never say you will check something without actually doing it in the same response.
- **Browser-sync for development**: When providing local development URLs, always use port 3001 (not 3000) as browser-sync proxies the Express server and adds auto-refresh functionality. Example: http://localhost:3001/test-page.html
- **Wait for user actions**: When asking the user to perform a task (click a button, test something, provide feedback), you MUST wait for their response before continuing. Do not proceed with additional actions or analysis until the user has completed the requested task and provided their feedback.

# Server Log Debugging

When troubleshooting issues with the server, especially intermittent connection problems, follow these steps to analyze the server logs. The server logs are located in `server.log` in the project root.

1.  **Identify the running server process:**
    Use `pgrep` to find the Process ID (PID) of the `node server.js` process. This is useful for checking the process status.
    ```bash
    pgrep -f 'node server.js'
    ```

2.  **Locate recent connection attempts:**
    To find the starting line number of the last 4 connection attempts in the log file, use `grep`.
    ```bash
    grep -n 'Client connected' server.log | tail -n 4
    ```

3.  **Examine a specific log session:**
    Once you have the starting line number of a session, you can view the relevant log portion. For example, if a session starts at line 3186 and you want to view the next 455 lines, you would use the `read_file` tool with an offset.
    ```
    read_file(absolute_path="/path/to/VisualTutor/server.log", limit=455, offset=3185)
    ```
    *Note: The offset is the line number minus one.*

By examining the logs for both successful and failed sessions, you can identify race conditions or other errors that may be causing intermittent failures.

# Project Overview

VisualTutor is a conversational AI agent that answers questions based on user-provided knowledge bases. It features voice input, spoken responses, and a unique text-based chat interface with keyword highlighting.

# Key Architecture Requirements

## Core Components
- **Knowledge Base Management**: Plain text file upload with full content caching
- **Voice Processing**: Speech-to-text for user input, text-to-speech for AI responses
- **AI Integration**: Gemini 2.5 Flash model with 1M+ context window, structured JSON output
- **Chat Interface**: Conversation history with collapsible responses and keyword highlighting

## Technical Stack Requirements
- **LLM**: Gemini 2.5 Flash (minimum 1M context window)
- **STT**: Deepgram nova-3-medical model for accurate voice transcription
- **TTS**: ElevenLabs lowest latency API
- **Response Format**: Structured JSON with outline and full text
- **Knowledge Base**: Full text provided with each prompt (no RAG), use caching for cost efficiency

# Critical Implementation Details

## AI Response Structure
- Must return structured JSON containing both outline and full text response
- Outline should be HTML `<ul>` list format without highlighting
- Full text may include markdown formatting that must be rendered to HTML
- AI responses derived from uploaded knowledge base when possible
- Must state when using general LLM knowledge: "[topic] is not discussed in [source], but based on my general knowledge..."

## Chat Interface Features
- Keyword extraction from outline for highlighting in full text
- Collapsible text view (collapsed by default)
- Play/pause controls for audio responses
- Permanent error display with detailed server messages (not generic failures)

## Voice Processing
- "Hold-to-speak" microphone button implementation
- Deepgram nova-3-medical model for accurate voice transcription
- Graceful handling of long responses that may exceed TTS limits
- Automatic audio playback after response generation

## User Experience
- Onboarding flow for knowledge base file upload
- Clear visual feedback for recording, processing, and error states
- Chronological conversation history with clear user/AI distinction

# Development Notes

- No RAG implementation - provide full knowledge base content with each API call
- Use token caching to reduce API costs
- Handle markdown rendering in AI responses
- Implement robust error handling with specific error messages
- Ensure responsive design for voice interaction workflow