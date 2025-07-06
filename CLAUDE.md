# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VisualTutor is a conversational AI agent that answers questions based on user-provided knowledge bases. It features voice input, spoken responses, and a unique text-based chat interface with keyword highlighting.

## Key Architecture Requirements

### Core Components
- **Knowledge Base Management**: Plain text file upload with full content caching
- **Voice Processing**: Speech-to-text for user input, text-to-speech for AI responses
- **AI Integration**: Gemini 2.5 Flash model with 1M+ context window, structured JSON output
- **Chat Interface**: Conversation history with collapsible responses and keyword highlighting

### Technical Stack Requirements
- **LLM**: Gemini 2.5 Flash (minimum 1M context window)
- **TTS**: ElevenLabs lowest latency API
- **Response Format**: Structured JSON with outline and full text
- **Knowledge Base**: Full text provided with each prompt (no RAG), use caching for cost efficiency

## Critical Implementation Details

### AI Response Structure
- Must return structured JSON containing both outline and full text response
- Outline should be HTML `<ul>` list format without highlighting
- Full text may include markdown formatting that must be rendered to HTML

### Chat Interface Features
- Keyword extraction from outline for highlighting in full text
- Collapsible text view (collapsed by default)
- Play/pause controls for audio responses
- Permanent error display with detailed server messages (not generic failures)

### Voice Processing
- "Hold-to-speak" microphone button implementation
- Graceful handling of long responses that may exceed TTS limits
- Automatic audio playback after response generation

### User Experience
- Onboarding flow for knowledge base file upload
- Clear visual feedback for recording, processing, and error states
- Chronological conversation history with clear user/AI distinction

## Development Notes

- No RAG implementation - provide full knowledge base content with each API call
- Use token caching to reduce API costs
- Handle markdown rendering in AI responses
- Implement robust error handling with specific error messages
- Ensure responsive design for voice interaction workflow