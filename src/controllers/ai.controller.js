import { generateContextForUser } from '../services/ai-context.service.js';
import { chatWithAi } from '../services/ai.service.js';

function jsonSuccess(res, data, statusCode = 200) {
  return res.status(statusCode).json({ success: true, data });
}

function jsonError(res, message, statusCode = 400) {
  return res.status(statusCode).json({ success: false, message });
}

export async function chat(req, res) {
  try {
    const { message, history } = req.body;

    if (!message || typeof message !== 'string' || message.trim() === '') {
      return jsonError(res, 'Message is required and must be a non-empty string', 400);
    }
    
    if (message.length > 2000) {
      return jsonError(res, 'Message exceeds maximum length of 2000 characters', 400);
    }

    let validHistory = [];
    if (history !== undefined) {
      if (!Array.isArray(history)) {
        return jsonError(res, 'History must be an array', 400);
      }
      
      if (history.length > 50) {
        return jsonError(res, 'History exceeds maximum length of 50 messages', 400);
      }

      for (const item of history) {
        if (!item || typeof item !== 'object') {
          return jsonError(res, 'Invalid history entry format', 400);
        }
        if (item.role !== 'user' && item.role !== 'assistant') {
          return jsonError(res, 'Invalid history role. Only user and assistant are allowed', 400);
        }
        if (!item.content || typeof item.content !== 'string') {
          return jsonError(res, 'History entry content must be a valid string', 400);
        }
        validHistory.push({
          role: item.role,
          content: item.content
        });
      }
    }

    const context = await generateContextForUser(req.user);

    // Communicate with AI Python Service
    const aiResponse = await chatWithAi(message.trim(), validHistory, context);

    if (!aiResponse || !aiResponse.answer) {
      throw new Error('Malformed response from AI service');
    }

    return jsonSuccess(res, { answer: aiResponse.answer });
  } catch (error) {
    console.error('AI Gateway Error:', error);
    const status = error.message.includes('timed out') ? 504 : 500;
    return jsonError(res, 'AI Service Error: ' + (error.message || 'Unexpected error occurred'), status);
  }
}
