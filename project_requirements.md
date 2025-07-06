# VisualTutor Application Requirements
This document outlines the functional and technical requirements for the VisualTutor application.
## 1. Core Concept
VisualTutor is a conversational AI agent that answers user questions based on a custom, user-provided knowledge base. It accepts voice input for questions and provides spoken responses, along with a unique and novel text-based chat interface.
## 2. Core Features
### 2.1. Knowledge Base Management
- **File Upload**: Users must be able to upload a plain text file (`.txt`) to serve as the exclusive knowledge base for the AI.
- **Contextual Conversation**: When possible, the AI's responses should be derived from the content of the uploaded knowledge base file. Using general LLM knowledge is ok but must it must be stated, i.e. "[topic] is not discussed in [source], but based on my general knowledge..."
### 2.2. User Interaction
- **Voice Input**: The primary method for asking questions is through voice recording. The interface should have a clear "hold-to-speak" microphone button.
- **Speech-to-Text (STT)**: The recorded voice input must be accurately transcribed into a text query.
### 2.3. AI Response Generation
- **Conversational AI**: The AI must process the transcribed text query, using the knowledge base and conversation history for context, to formulate a relevant and helpful answer. The AI model must have a very large context window (at least 1M tokens, such as the Gemini 2.5 flash family of models) and not resort to RAG. The full text of the source should be provided with each prompt, using caching to save on costs. API calls must restrict the output to structured JSON format containing the outline and full text response.
- **Text-to-Speech (TTS)**: The AI's text response must be converted into audible speech and played back to the user automatically.
- **Response Handling**: The system must gracefully handle long text responses that may exceed TTS character limits, by providing the text response even if the audio generation is skipped.
### 2.4. Chat Interface
- **Conversation History**: The interface must display a chronological history of the conversation, clearly distinguishing between user queries and AI responses.
- **Keyword Outline**: Each AI response should include a structured outline (e.g., HTML `<ul>` list) of the keywords from the response. This outline should *not* have highlighting and is always visible.
- **Text Display**: The AI's full text response must be viewable in the chat message through a collapsible view (collapsed by default).
- **Keyword Highlighting**: In the full text view, keywords should be programmatically extracted from the outline (all words that appear in the outline) and visually highlighted (e.g., bolded) in the full text.
- **Markdown Rendering**: The AI's full text response (returned as part of a JSON object from the LLM API) may include markdown formatting such as lists. The interface must properly render this markdown into formatted HTML.
- **Audio Controls**: Each AI message with a spoken response must have an intuitive play/pause control.
- **Error Display**: If any part of the back-end process fails, a detailed, specific error message from the server must be displayed directly and permanently in the chat interface instead of a generic failure notice.
## 3. Technical Notes
- **Text-to-Speech**: Use ElevenLabs lowest latency API for TTS generation.
- **LLM Model**: Use Gemini 2.5 Flash variant with at least 1M context window.
- **Knowledge Base Caching**: The knowledge base should be cached as input tokens to reduce API costs.
## 4. User Experience & Style
- **Onboarding**: The initial screen should guide the user to upload their knowledge base file.
- **Feedback**: Provide clear visual feedback for states like "recording," "loading/processing," and "error."
