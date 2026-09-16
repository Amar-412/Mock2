import config from '../config/config.js';

export async function chatWithAi(message, history, context) {
  const url = `${config.AI_SERVICE_URL}/chat`;
  
  const payload = {
    message,
    history: history || [],
    context
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 seconds timeout

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`AI service responded with status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('AI service request timed out');
    }
    throw new Error(`AI service error: ${error.message}`);
  }
}
