const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, 'knowledge-base.txt');
  }
});

const upload = multer({ storage: storage });

if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

app.post('/upload-knowledge-base', upload.single('knowledgeBase'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  res.json({ message: 'Knowledge base uploaded successfully' });
});

app.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;
    
    let knowledgeBase = '';
    try {
      knowledgeBase = fs.readFileSync('uploads/knowledge-base.txt', 'utf-8');
    } catch (error) {
      return res.status(400).json({ error: 'Knowledge base not found. Please upload a knowledge base file first.' });
    }

    res.json({ 
      outline: '<ul><li>Response placeholder</li></ul>',
      fullText: 'This is a placeholder response. AI integration will be implemented next.',
      audioUrl: null
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});