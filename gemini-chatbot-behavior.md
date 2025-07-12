# Gemini Chatbot Intended Behavior

## Overview
A conversational AI chatbot that combines text and voice for both input and output, with optional knowledge base integration.

## Core Features

### 1. Knowledge Base
- Users can upload a text file to serve as a knowledge base
- The AI references this content when answering questions
- When topics aren't in the knowledge base, the AI explicitly states this before providing general knowledge

### 2. Input Methods

#### Text Input
- Multi-line text area for typing messages
- Press Enter 3 times to send
- First two Enter presses add newlines
- Tab key inserts tab character

#### Voice Input
- Live speech-to-text transcription
- Mute/unmute control via checkbox or Escape key
- Shows interim results in gray italic text
- Shows finalized transcription in black text
- Transcription persists when toggling mute

#### Combined Input
- Users can speak and type simultaneously
- Both inputs are combined when sending: "Transcribed: [voice] Typed: [text]"

### 3. AI Responses

#### Text Output
- Responses appear as structured JSON with a sentences array
- Each sentence is a separate array element
- Displayed in monospace font

#### Voice Output
- AI responses are automatically converted to speech
- Each response has audio playback controls
- Audio attempts to play automatically

#### Response Control
- Press Enter once during a response to interrupt it
- Interrupted responses show partial content

### 4. User Interface

#### Layout Elements
- Knowledge base upload section at top
- Scrollable chat history in center
- Transcription display area
- Text input area with Clear Chat button

#### Message Display
- User messages: blue background, right-aligned
- AI messages: gray border, left-aligned
- Auto-scrolls to newest messages

### 5. Conversation Management
- Full conversation history maintained
- Clear Chat button resets everything
- Voice transcription pauses during AI responses
- Input disabled while AI is responding

## User Flow

### Basic Conversation
1. (Optional) Upload knowledge base file
2. Speak or type a message
3. Press Enter 3 times to send
4. AI response streams in as JSON
5. Response audio plays automatically
6. Repeat for continued conversation

### Using Voice Input
1. Unmute to start transcription
2. Speak naturally - see real-time transcription
3. Combine with typed text if desired
4. Send with triple Enter
5. Transcription pauses during AI response
6. Resumes automatically after response