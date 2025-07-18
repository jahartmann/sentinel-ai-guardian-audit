import express from 'express';
import { OllamaService } from '../services/OllamaService.js';
import { Logger } from '../services/Logger.js';

const router = express.Router();
const logger = new Logger();
const ollamaService = new OllamaService(logger);

// GET /api/ollama/status - Test connection and get available models
router.get('/status', async (req, res) => {
  try {
    logger.info('Ollama', '🔄 Status check requested');
    const result = await ollamaService.testConnection();
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Ollama', `❌ Status check failed: ${error.message}`);
    res.json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/ollama/models - Get all available models
router.get('/models', async (req, res) => {
  try {
    logger.info('Ollama', '📋 Models list requested');
    const models = await ollamaService.getAvailableModels();
    
    res.json({
      success: true,
      data: { models }
    });
  } catch (error) {
    logger.error('Ollama', `❌ Models list failed: ${error.message}`);
    res.json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/ollama/running - Get running models
router.get('/running', async (req, res) => {
  try {
    logger.info('Ollama', '🏃 Running models requested');
    const models = await ollamaService.getRunningModels();
    
    res.json({
      success: true,
      data: { models }
    });
  } catch (error) {
    logger.error('Ollama', `❌ Running models failed: ${error.message}`);
    res.json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/ollama/model/:name - Get model details
router.get('/model/:name', async (req, res) => {
  try {
    const modelName = decodeURIComponent(req.params.name);
    logger.info('Ollama', `📄 Model details requested: ${modelName}`);
    const details = await ollamaService.getModelInfo(modelName);
    
    res.json({
      success: true,
      data: details
    });
  } catch (error) {
    logger.error('Ollama', `❌ Model details failed: ${error.message}`);
    res.json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/ollama/version - Get Ollama version
router.get('/version', async (req, res) => {
  try {
    logger.info('Ollama', '📋 Version requested');
    const version = await ollamaService.getVersion();
    
    res.json({
      success: true,
      data: version
    });
  } catch (error) {
    logger.error('Ollama', `❌ Version check failed: ${error.message}`);
    res.json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/ollama/chat - Chat with model
router.post('/chat', async (req, res) => {
  try {
    const { model, messages } = req.body;
    
    if (!model || !messages) {
      return res.json({
        success: false,
        error: 'Model and messages are required'
      });
    }
    
    logger.info('Ollama', `💬 Chat requested with model: ${model}`);
    const result = await ollamaService.chat(model, messages);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Ollama', `❌ Chat failed: ${error.message}`);
    res.json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/ollama/generate - Generate text
router.post('/generate', async (req, res) => {
  try {
    const { model, prompt, options = {} } = req.body;
    
    if (!model || !prompt) {
      return res.json({
        success: false,
        error: 'Model and prompt are required'
      });
    }
    
    logger.info('Ollama', `🎯 Generate requested with model: ${model}`);
    const result = await ollamaService.generateResponse(prompt, model, options);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Ollama', `❌ Generate failed: ${error.message}`);
    res.json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/ollama/embeddings - Generate embeddings
router.post('/embeddings', async (req, res) => {
  try {
    const { model, prompt } = req.body;
    
    if (!model || !prompt) {
      return res.json({
        success: false,
        error: 'Model and prompt are required'
      });
    }
    
    logger.info('Ollama', `🔢 Embeddings requested with model: ${model}`);
    const result = await ollamaService.embeddings(model, prompt);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Ollama', `❌ Embeddings failed: ${error.message}`);
    res.json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/ollama/load - Load model into memory
router.post('/load', async (req, res) => {
  try {
    const { model } = req.body;
    
    if (!model) {
      return res.json({
        success: false,
        error: 'Model name is required'
      });
    }
    
    logger.info('Ollama', `📥 Load model requested: ${model}`);
    const result = await ollamaService.loadModel(model);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Ollama', `❌ Load model failed: ${error.message}`);
    res.json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/ollama/unload - Unload model from memory
router.post('/unload', async (req, res) => {
  try {
    const { model } = req.body;
    
    if (!model) {
      return res.json({
        success: false,
        error: 'Model name is required'
      });
    }
    
    logger.info('Ollama', `📤 Unload model requested: ${model}`);
    const result = await ollamaService.unloadModel(model);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Ollama', `❌ Unload model failed: ${error.message}`);
    res.json({
      success: false,
      error: error.message
    });
  }
});

export default router;