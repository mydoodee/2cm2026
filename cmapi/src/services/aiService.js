const axios = require('axios');
require('dotenv').config();

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://192.168.1.45:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5-coder:14b';
const OLLAMA_TIMEOUT = parseInt(process.env.OLLAMA_TIMEOUT) || 90000;

/**
 * Check if Ollama service is reachable and has the required model loaded
 * @returns {Promise<{status: string, message: string}>}
 */
async function checkHealth() {
  try {
    const response = await axios.get(`${OLLAMA_BASE_URL}/api/tags`, { timeout: 5000 });
    const models = response.data.models || [];
    const modelNames = models.map(m => m.name);
    
    const isModelLoaded = modelNames.some(name => name.includes(OLLAMA_MODEL));
    
    return {
      status: 'OK',
      connected: true,
      baseUrl: OLLAMA_BASE_URL,
      modelConfigured: OLLAMA_MODEL,
      modelLoaded: isModelLoaded,
      availableModels: modelNames
    };
  } catch (error) {
    return {
      status: 'ERROR',
      connected: false,
      baseUrl: OLLAMA_BASE_URL,
      error: error.message
    };
  }
}

/**
 * Call Ollama Chat API with streaming
 * @param {Array<{role: string, content: string}>} messages 
 * @param {object} res Express response object for streaming
 * @returns {Promise<void>}
 */
async function streamChat(messages, res) {
  try {
    const response = await axios.post(`${OLLAMA_BASE_URL}/api/chat`, {
      model: OLLAMA_MODEL,
      messages: messages,
      stream: true,
      options: {
        temperature: 0.2 // ลดความสุ่มในการสืบค้นเพื่อป้องกันปัญหาภาษาผสม (Multilingual Token Leaking)
      }
    }, {
      responseType: 'stream',
      timeout: OLLAMA_TIMEOUT
    });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders(); // Establish connection

    let buffer = '';

    response.data.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      
      // Keep the last incomplete line in the buffer
      buffer = lines.pop();

      for (const line of lines) {
        if (line.trim() === '') continue;
        try {
          const json = JSON.parse(line);
          const content = json.message?.content || '';
          
          if (content) {
            // Standard SSE format
            res.write(`data: ${JSON.stringify({ text: content, done: false })}\n\n`);
          }
          
          if (json.done) {
            res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
          }
        } catch (err) {
          console.error('Failed to parse line:', line, err.message);
        }
      }
    });

    response.data.on('end', () => {
      // Flush final line if any
      if (buffer.trim() !== '') {
        try {
          const json = JSON.parse(buffer);
          const content = json.message?.content || '';
          if (content) {
            res.write(`data: ${JSON.stringify({ text: content, done: false })}\n\n`);
          }
        } catch (e) {}
      }
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    });

    response.data.on('error', (err) => {
      console.error('Stream error:', err);
      res.write(`data: ${JSON.stringify({ error: 'เกิดข้อผิดพลาดระหว่างสตรีมข้อความ' })}\n\n`);
      res.end();
    });

  } catch (error) {
    console.error('Ollama communication error:', error.message);
    res.write(`data: ${JSON.stringify({ error: `ไม่สามารถติดต่อ Ollama AI ได้: ${error.message}` })}\n\n`);
    res.end();
  }
}

/**
 * Call Ollama Chat API without streaming (for structured tasks like SQL gen)
 * @param {Array<{role: string, content: string}>} messages 
 * @returns {Promise<string>}
 */
async function textChat(messages) {
  try {
    const response = await axios.post(`${OLLAMA_BASE_URL}/api/chat`, {
      model: OLLAMA_MODEL,
      messages: messages,
      stream: false,
      options: {
        temperature: 0.2 // ลดความสุ่มในการประมวลผลเพื่อความแม่นยำทางโครงสร้างข้อมูล
      }
    }, {
      timeout: OLLAMA_TIMEOUT
    });

    return response.data.message?.content || '';
  } catch (error) {
    console.error('Ollama text communication error:', error.message);
    throw new Error(`ไม่สามารถเชื่อมต่อกับบริการ AI ได้ (${error.message})`);
  }
}

module.exports = {
  checkHealth,
  streamChat,
  textChat
};
