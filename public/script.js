class VisualTutor {
    constructor() {
        this.isRecording = false;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.conversationHistory = [];
        
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        document.getElementById('uploadBtn').addEventListener('click', this.handleFileUpload.bind(this));
        document.getElementById('micBtn').addEventListener('mousedown', this.startRecording.bind(this));
        document.getElementById('micBtn').addEventListener('mouseup', this.stopRecording.bind(this));
        document.getElementById('micBtn').addEventListener('mouseleave', this.stopRecording.bind(this));
        document.getElementById('sendBtn').addEventListener('click', this.handleTextInput.bind(this));
        document.getElementById('textInput').addEventListener('keypress', this.handleKeyPress.bind(this));
    }

    async handleFileUpload() {
        const fileInput = document.getElementById('knowledgeBaseFile');
        const file = fileInput.files[0];
        
        if (!file) {
            this.showStatus('Please select a file first.', 'error');
            return;
        }

        if (!file.name.endsWith('.txt')) {
            this.showStatus('Please select a .txt file.', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('knowledgeBase', file);

        try {
            const response = await fetch('/upload-knowledge-base', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            
            if (response.ok) {
                this.showStatus('Knowledge base uploaded successfully!', 'success');
                setTimeout(() => {
                    this.showChatInterface();
                }, 2000);
            } else {
                this.showStatus(result.error || 'Upload failed', 'error');
            }
        } catch (error) {
            this.showStatus('Network error: ' + error.message, 'error');
        }
    }

    showStatus(message, type) {
        const statusDiv = document.getElementById('uploadStatus');
        statusDiv.textContent = message;
        statusDiv.className = `status-message ${type}`;
        statusDiv.style.display = 'block';
    }

    showChatInterface() {
        document.getElementById('onboarding').classList.add('hidden');
        document.getElementById('chatInterface').classList.remove('hidden');
    }

    async startRecording() {
        if (this.isRecording) return;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaRecorder = new MediaRecorder(stream);
            this.audioChunks = [];

            this.mediaRecorder.addEventListener('dataavailable', (event) => {
                this.audioChunks.push(event.data);
            });

            this.mediaRecorder.addEventListener('stop', () => {
                this.processRecording();
            });

            this.mediaRecorder.start();
            this.isRecording = true;
            
            document.getElementById('micBtn').classList.add('recording');
            document.getElementById('recordingStatus').textContent = 'Recording... (Hold to continue)';
            
        } catch (error) {
            console.error('Error starting recording:', error);
            this.addErrorMessage('Microphone access denied or not available: ' + error.message);
        }
    }

    stopRecording() {
        if (!this.isRecording) return;

        this.mediaRecorder.stop();
        this.isRecording = false;
        
        document.getElementById('micBtn').classList.remove('recording');
        document.getElementById('recordingStatus').textContent = 'Processing...';
        
        this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }

    async processRecording() {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
        
        document.getElementById('recordingStatus').textContent = 'Converting speech to text...';
        
        try {
            const transcription = await this.speechToText(audioBlob);
            document.getElementById('recordingStatus').textContent = '';
            
            if (transcription) {
                this.sendMessage(transcription);
            } else {
                this.addErrorMessage('Could not transcribe audio. Please try again.');
            }
        } catch (error) {
            document.getElementById('recordingStatus').textContent = '';
            this.addErrorMessage('Speech recognition failed: ' + error.message);
        }
    }

    async speechToText(audioBlob) {
        const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        return new Promise((resolve, reject) => {
            recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                resolve(transcript);
            };

            recognition.onerror = (event) => {
                reject(new Error(event.error));
            };

            recognition.onend = () => {
                if (!recognition.results) {
                    resolve(null);
                }
            };

            const audioUrl = URL.createObjectURL(audioBlob);
            recognition.start();
        });
    }

    handleKeyPress(event) {
        if (event.key === 'Enter') {
            this.handleTextInput();
        }
    }

    handleTextInput() {
        const textInput = document.getElementById('textInput');
        const message = textInput.value.trim();
        
        if (message) {
            this.sendMessage(message);
            textInput.value = '';
        }
    }

    async sendMessage(message) {
        this.addUserMessage(message);
        this.showLoading(true);

        try {
            const response = await fetch('/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    message: message,
                    history: this.conversationHistory 
                })
            });

            const result = await response.json();
            
            if (response.ok) {
                this.addAIMessage(result.outline, result.fullText, result.audioUrl);
                this.conversationHistory.push({ user: message, ai: result.fullText });
            } else {
                this.addErrorMessage(result.error || 'Failed to get response');
            }
        } catch (error) {
            this.addErrorMessage('Network error: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    addUserMessage(message) {
        const chatHistory = document.getElementById('chatHistory');
        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-message user';
        messageDiv.innerHTML = `<div class="message-content">${this.escapeHtml(message)}</div>`;
        chatHistory.appendChild(messageDiv);
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }

    addAIMessage(outline, fullText, audioUrl) {
        const chatHistory = document.getElementById('chatHistory');
        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-message ai';
        
        const messageId = 'msg-' + Date.now();
        const keywords = this.extractKeywords(outline);
        const highlightedText = this.highlightKeywords(fullText, keywords);
        
        messageDiv.innerHTML = `
            <div class="message-outline">
                ${outline}
            </div>
            <div class="message-text" id="${messageId}">
                ${highlightedText}
            </div>
            <div class="message-controls">
                <button class="control-btn" onclick="visualTutor.toggleText('${messageId}')">
                    Show/Hide Text
                </button>
                ${audioUrl ? `<button class="control-btn" onclick="visualTutor.playAudio('${audioUrl}')">Play Audio</button>` : ''}
            </div>
        `;
        
        chatHistory.appendChild(messageDiv);
        chatHistory.scrollTop = chatHistory.scrollHeight;
        
        if (audioUrl) {
            this.playAudio(audioUrl);
        }
    }

    addErrorMessage(errorMessage) {
        const chatHistory = document.getElementById('chatHistory');
        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-message ai error-message';
        messageDiv.innerHTML = `<div class="message-content"><strong>Error:</strong> ${this.escapeHtml(errorMessage)}</div>`;
        chatHistory.appendChild(messageDiv);
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }

    extractKeywords(outline) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = outline;
        const text = tempDiv.textContent || tempDiv.innerText || '';
        
        const words = text.split(/\s+/)
            .filter(word => word.length > 3)
            .map(word => word.replace(/[^\w]/g, ''))
            .filter(word => word.length > 0);
        
        return [...new Set(words)];
    }

    highlightKeywords(text, keywords) {
        let highlightedText = text;
        
        keywords.forEach(keyword => {
            const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
            highlightedText = highlightedText.replace(regex, `<span class="keyword-highlight">${keyword}</span>`);
        });
        
        return highlightedText;
    }

    toggleText(messageId) {
        const textElement = document.getElementById(messageId);
        textElement.classList.toggle('expanded');
    }

    playAudio(audioUrl) {
        const audio = new Audio(audioUrl);
        audio.play().catch(error => {
            console.error('Error playing audio:', error);
        });
    }

    showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        if (show) {
            overlay.classList.remove('hidden');
        } else {
            overlay.classList.add('hidden');
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

const visualTutor = new VisualTutor();