import { GeminiAI } from './geminiAI.js';
import { MockAI } from './mockAI.js';

export class AIFactory {
  static getAIProvider() {
    const key = process.env.GEMINI_API_KEY;
    if (key && key.trim().length > 0) {
      return new GeminiAI(key);
    }
    return new MockAI();
  }
}
