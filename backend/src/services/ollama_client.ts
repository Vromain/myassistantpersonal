import axios, { AxiosInstance } from 'axios';

/**
 * Ollama Client Service
 * Task: T018 - Create Ollama client service connecting to both local and remote endpoints
 * Reference: specs/001-ai-communication-hub/research.md
 *
 * Endpoints:
 * - Local: http://localhost:11434/
 * - Remote: http://94.23.49.185:11434/
 */

export interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OllamaResponse {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
}

export interface OllamaGenerateOptions {
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
}

class OllamaClient {
  private localClient: AxiosInstance;
  private remoteClient: AxiosInstance;
  private model: string;
  private useLocal: boolean;
  private isAvailable: boolean = true;
  private lastCheckTime: Date = new Date();
  private failureCount: number = 0;

  constructor() {
    const localUrl = process.env.OLLAMA_LOCAL_URL || 'http://localhost:11434';
    const remoteUrl = process.env.OLLAMA_REMOTE_URL || 'http://94.23.49.185:11434';
    this.model = process.env.OLLAMA_MODEL || 'llama3.1:8b';
    this.useLocal = process.env.NODE_ENV !== 'production';

    this.localClient = axios.create({
      baseURL: localUrl,
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' }
    });

    this.remoteClient = axios.create({
      baseURL: remoteUrl,
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' }
    });

    console.log(`🤖 Ollama: Initialized with model ${this.model}`);
    console.log(`📍 Ollama: Using ${this.useLocal ? 'local' : 'remote'} endpoint`);
  }

  /**
   * Get active client based on environment
   */
  private getClient(): AxiosInstance {
    return this.useLocal ? this.localClient : this.remoteClient;
  }

  /**
   * Check if Ollama is available
   */
  async healthCheck(): Promise<{
    available: boolean;
    endpoint: string;
    models?: string[];
  }> {
    try {
      const client = this.getClient();
      const response = await client.get('/api/tags');

      // Update availability status
      this.isAvailable = true;
      this.failureCount = 0;
      this.lastCheckTime = new Date();

      return {
        available: true,
        endpoint: this.useLocal ? 'local' : 'remote',
        models: response.data.models?.map((m: any) => m.name) || []
      };
    } catch (error) {
      console.error('❌ Ollama health check failed:', error);

      // Update availability status
      this.isAvailable = false;
      this.failureCount++;
      this.lastCheckTime = new Date();

      return {
        available: false,
        endpoint: this.useLocal ? 'local' : 'remote'
      };
    }
  }

  /**
   * Get current AI service status
   * Task: T081 - Graceful degradation when Ollama unavailable
   */
  getStatus(): {
    available: boolean;
    endpoint: string;
    model: string;
    lastCheck: Date;
    failureCount: number;
    degradedMode: boolean;
  } {
    return {
      available: this.isAvailable,
      endpoint: this.useLocal ? 'local' : 'remote',
      model: this.model,
      lastCheck: this.lastCheckTime,
      failureCount: this.failureCount,
      degradedMode: !this.isAvailable
    };
  }

  /**
   * Generate completion using chat format
   * Used for: priority scoring, categorization, reply generation
   */
  async chat(
    messages: OllamaMessage[],
    options?: OllamaGenerateOptions
  ): Promise<string> {
    try {
      const client = this.getClient();
      let response: any;

      try {
        response = await client.post<OllamaResponse>('/api/chat', {
          model: this.model,
          messages,
          stream: false,
          options: {
            temperature: options?.temperature || 0.7,
            top_p: options?.top_p || 0.9,
            num_predict: options?.max_tokens || 1000
          }
        });
      } catch (err: any) {
        // Fallback for servers that don't support /api/chat (404) or model missing
        if (err?.response?.status === 404 || err?.response?.status === 400) {
          // Ensure model is available on server
          try {
            const tags = await client.get('/api/tags');
            const hasModel = (tags.data?.models || []).some((m: any) => m.name === this.model);
            if (!hasModel) {
              console.log(`⬇️  Ollama: Pulling model ${this.model}...`);
              await client.post('/api/pull', { name: this.model, stream: false });
            }
          } catch (pullErr: any) {
            console.warn('⚠️  Ollama: Model availability check/pull failed:', pullErr?.message || pullErr);
          }

          // Retry using /api/generate
          const prompt = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');
          const gen = await client.post('/api/generate', {
            model: this.model,
            prompt,
            stream: false,
            options: {
              temperature: options?.temperature || 0.7,
              top_p: options?.top_p || 0.9,
              num_predict: options?.max_tokens || 1000
            }
          });
          return gen.data?.response || '';
        }
        throw err;
      }

      // Success - reset failure counter
      if (this.failureCount > 0) {
        this.failureCount = 0;
        this.isAvailable = true;
        console.log('✅ Ollama: Service recovered');
      }

      return response.data.message.content;
    } catch (error: any) {
      console.error('❌ Ollama chat error:', error.message);

      // Track failure
      this.failureCount++;
      this.isAvailable = false;
      this.lastCheckTime = new Date();

      // Fallback to remote if local fails
      if (this.useLocal && error.code === 'ECONNREFUSED') {
        console.log('⚠️  Ollama: Local unavailable, trying remote...');
        this.useLocal = false;
        return this.chat(messages, options);
      }

      throw new Error(`Ollama request failed: ${error.message}`);
    }
  }

  /**
   * Generate completion for a simple prompt
   * Wrapper around chat() for backward compatibility
   */
  async generateCompletion(prompt: string, options?: OllamaGenerateOptions): Promise<string> {
    return this.chat([
      { role: 'user', content: prompt }
    ], options);
  }

  /**
   * Generate priority score for a message (0-100)
   * Task: T023 - AI priority scoring
   */
  async scorePriority(messageContent: {
    subject?: string;
    content: string;
    sender: string;
  }): Promise<{ score: number; reasoning: string }> {
    const prompt = `Analyze this email and assign a priority score from 0-100.
Consider: urgency keywords, sender importance, content sensitivity.

Subject: ${messageContent.subject || 'None'}
From: ${messageContent.sender}
Content: ${messageContent.content.slice(0, 500)}

Respond in JSON format:
{
  "score": <number 0-100>,
  "reasoning": "<brief explanation>"
}`;

    try {
      const response = await this.chat([
        {
          role: 'system',
          content: 'You are an AI assistant that analyzes email priority. Always respond with valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ]);

      const parsed = JSON.parse(response);
      return {
        score: Math.max(0, Math.min(100, parsed.score)),
        reasoning: parsed.reasoning
      };
    } catch (error) {
      console.error('❌ Priority scoring failed:', error);
      // Default fallback score
      return { score: 50, reasoning: 'AI scoring unavailable, using default' };
    }
  }

  /**
   * Generate reply suggestions for a message
   * Task: T039 - AI reply generation
   */
  async generateReplies(
    messageContent: string,
    conversationHistory?: string[]
  ): Promise<string[]> {
    const context = conversationHistory?.join('\n') || '';
    const prompt = `Generate 3-5 brief, contextually appropriate reply suggestions for this message.

${context ? `Previous conversation:\n${context}\n\n` : ''}Message to reply to:
${messageContent}

Provide diverse replies: formal, casual, brief. Respond as a JSON array of strings.`;

    try {
      const response = await this.chat([
        {
          role: 'system',
          content: 'You generate email reply suggestions. Always respond with a JSON array of 3-5 strings.'
        },
        {
          role: 'user',
          content: prompt
        }
      ]);

      const parsed = JSON.parse(response);
      return Array.isArray(parsed) ? parsed.slice(0, 5) : [parsed];
    } catch (error) {
      console.error('❌ Reply generation failed:', error);
      return [
        "Thank you for your message. I'll get back to you soon.",
        "Thanks for reaching out. I'll review this and respond shortly.",
        "I appreciate you contacting me. Let me look into this."
      ];
    }
  }

  /**
   * Categorize a message
   * Task: T049 - AI categorization
   */
  async categorize(
    messageContent: {
      subject?: string;
      content: string;
    },
    availableCategories: string[]
  ): Promise<{
    category: string;
    confidence: number;
  }> {
    const prompt = `Categorize this message into one of these categories: ${availableCategories.join(', ')}

Subject: ${messageContent.subject || 'None'}
Content: ${messageContent.content.slice(0, 500)}

Respond in JSON format:
{
  "category": "<category name>",
  "confidence": <number 0-1>
}`;

    try {
      const response = await this.chat([
        {
          role: 'system',
          content: 'You categorize messages. Always respond with valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ]);

      const parsed = JSON.parse(response);
      return {
        category: parsed.category,
        confidence: Math.max(0, Math.min(1, parsed.confidence))
      };
    } catch (error) {
      console.error('❌ Categorization failed:', error);
      return { category: availableCategories[0] || 'Personal', confidence: 0.5 };
    }
  }

  /**
   * Switch between local and remote endpoints
   */
  setEndpoint(useLocal: boolean): void {
    this.useLocal = useLocal;
    console.log(`🔄 Ollama: Switched to ${useLocal ? 'local' : 'remote'} endpoint`);
  }

  /**
   * Get current model
   */
  getModel(): string {
    return this.model;
  }

  /**
   * Set model (llama3.1:8b or mistral:7b)
   */
  setModel(model: string): void {
    this.model = model;
    console.log(`🔄 Ollama: Switched to model ${model}`);
  }
}

// Export singleton instance
export const ollamaClient = new OllamaClient();
export default OllamaClient;
