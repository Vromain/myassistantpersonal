import OllamaClient from './ollama_client';
import { MessageAnalysis, IMessageAnalysis, SentimentType } from '../models/message_analysis';
import { Message, IMessage } from '../models/message';
import mongoose from 'mongoose';

/**
 * Message Analysis Service
 * Tasks: T021-T025 - Complete message analysis implementation
 * Feature: 002-intelligent-message-analysis
 *
 * Provides AI-powered message analysis including:
 * - Spam detection
 * - Sentiment analysis
 * - Response necessity detection
 * - Reply generation
 * - Complete message analysis orchestration
 */

interface MessageContent {
  subject?: string;
  from: string;
  body: string;
}

interface SpamDetectionResult {
  isSpam: boolean;
  probability: number;
  reasoning: string;
}

interface SentimentAnalysisResult {
  sentiment: SentimentType;
  confidence: number;
}

interface ResponseNecessityResult {
  needsResponse: boolean;
  confidence: number;
  reasoning: string;
}

interface ReplyGenerationResult {
  replyText: string;
  language: string;
}

class MessageAnalysisService {
  private ollamaClient: OllamaClient;
  private readonly SPAM_THRESHOLD = 80;
  private readonly HIGH_PRIORITY_THRESHOLD = 70;
  private readonly MEDIUM_PRIORITY_THRESHOLD = 40;

  constructor() {
    this.ollamaClient = new OllamaClient();
    console.log('📊 MessageAnalysisService: Initialized');
  }

  /**
   * Task: T021 - Detect spam using Ollama AI
   *
   * Analyzes message content to determine spam probability.
   * Detects: promotional content, phishing attempts, suspicious patterns.
   *
   * @param messageContent - Message subject, sender, and body
   * @returns Spam detection result with probability and reasoning
   */
  async detectSpam(messageContent: MessageContent): Promise<SpamDetectionResult> {
    const { subject = 'No subject', from, body } = messageContent;

    // Check if Ollama is available
    const status = this.ollamaClient.getStatus();
    if (!status.available) {
      console.warn('⚠️  MessageAnalysis: Ollama unavailable, using rule-based spam detection');
      return this.ruleBasedSpamDetection(messageContent);
    }

    const prompt = `Analyze this email for spam characteristics. Consider:
- Promotional language and excessive marketing
- Phishing attempts (suspicious links, urgency tactics, impersonation)
- Suspicious sender patterns
- Unsolicited commercial content
- Generic greetings and poor grammar
- Requests for personal information

Email Details:
Subject: ${subject}
From: ${from}
Body: ${body.slice(0, 1000)}${body.length > 1000 ? '...' : ''}

Respond in valid JSON format only:
{
  "probability": <number 0-100>,
  "reasoning": "<brief explanation of why this is/isn't spam>"
}`;

    try {
      const response = await this.ollamaClient.chat([
        {
          role: 'system',
          content: 'You are an expert spam detection system. Always respond with valid JSON containing probability (0-100) and reasoning fields.'
        },
        {
          role: 'user',
          content: prompt
        }
      ], { temperature: 0.3 });

      const parsed = this.parseJSON(response);
      const probability = Math.max(0, Math.min(100, parsed.probability || 0));

      return {
        isSpam: probability >= this.SPAM_THRESHOLD,
        probability,
        reasoning: parsed.reasoning || 'AI analysis completed'
      };
    } catch (error) {
      console.error('❌ MessageAnalysis: Spam detection failed:', error);
      return this.ruleBasedSpamDetection(messageContent);
    }
  }

  /**
   * Task: T022 - Analyze sentiment using Ollama AI
   *
   * Determines the emotional tone of the message.
   *
   * @param messageContent - Message subject and body
   * @returns Sentiment (positive/neutral/negative) with confidence
   */
  async analyzeSentiment(messageContent: Pick<MessageContent, 'subject' | 'body'>): Promise<SentimentAnalysisResult> {
    const { subject = 'No subject', body } = messageContent;

    // Check if Ollama is available
    const status = this.ollamaClient.getStatus();
    if (!status.available) {
      console.warn('⚠️  MessageAnalysis: Ollama unavailable, using neutral sentiment');
      return { sentiment: 'neutral', confidence: 50 };
    }

    const prompt = `Analyze the sentiment of this email. Determine if it's positive, neutral, or negative.

Subject: ${subject}
Body: ${body.slice(0, 1000)}${body.length > 1000 ? '...' : ''}

Consider:
- Emotional tone and language
- Urgency and stress indicators
- Politeness and formality
- Overall message intent

Respond in valid JSON format only:
{
  "sentiment": "<positive|neutral|negative>",
  "confidence": <number 0-100>
}`;

    try {
      const response = await this.ollamaClient.chat([
        {
          role: 'system',
          content: 'You are a sentiment analysis expert. Always respond with valid JSON containing sentiment (positive/neutral/negative) and confidence (0-100) fields.'
        },
        {
          role: 'user',
          content: prompt
        }
      ], { temperature: 0.3 });

      const parsed = this.parseJSON(response);
      const sentiment = this.normalizeSentiment(parsed.sentiment);
      const confidence = Math.max(0, Math.min(100, parsed.confidence || 50));

      return { sentiment, confidence };
    } catch (error) {
      console.error('❌ MessageAnalysis: Sentiment analysis failed:', error);
      return { sentiment: 'neutral', confidence: 50 };
    }
  }

  /**
   * Task: T023 - Detect if response is necessary using Ollama AI
   *
   * Analyzes whether the message requires a response.
   * Considers: questions, action items, urgency, context.
   *
   * @param messageContent - Message subject, sender, and body
   * @returns Whether response is needed, confidence, and reasoning
   */
  async detectResponseNecessity(messageContent: MessageContent): Promise<ResponseNecessityResult> {
    const { subject = 'No subject', from, body } = messageContent;

    // Check if Ollama is available
    const status = this.ollamaClient.getStatus();
    if (!status.available) {
      console.warn('⚠️  MessageAnalysis: Ollama unavailable, using rule-based response detection');
      return this.ruleBasedResponseDetection(messageContent);
    }

    const prompt = `Analyze if this email requires a response from the recipient.

Subject: ${subject}
From: ${from}
Body: ${body.slice(0, 1000)}${body.length > 1000 ? '...' : ''}

Consider:
- Direct questions asked
- Action items or requests
- Urgency indicators
- Whether it's informational only
- Social expectations (greetings, invitations)
- Business context

Respond in valid JSON format only:
{
  "needsResponse": <true|false>,
  "confidence": <number 0-100>,
  "reasoning": "<brief explanation>"
}`;

    try {
      const response = await this.ollamaClient.chat([
        {
          role: 'system',
          content: 'You are an email analysis expert. Always respond with valid JSON containing needsResponse (boolean), confidence (0-100), and reasoning fields.'
        },
        {
          role: 'user',
          content: prompt
        }
      ], { temperature: 0.3 });

      const parsed = this.parseJSON(response);
      const confidence = Math.max(0, Math.min(100, parsed.confidence || 50));

      return {
        needsResponse: Boolean(parsed.needsResponse),
        confidence,
        reasoning: parsed.reasoning || 'Analysis completed'
      };
    } catch (error) {
      console.error('❌ MessageAnalysis: Response necessity detection failed:', error);
      return this.ruleBasedResponseDetection(messageContent);
    }
  }

  /**
   * Task: T024 - Generate reply suggestion using Ollama AI
   *
   * Creates a suggested reply that:
   * - Is 50-200 words
   * - Matches original language
   * - Uses professional tone
   * - Addresses key points
   *
   * @param messageContent - Message subject, sender, body, and sentiment
   * @returns Generated reply text and detected language
   */
  async generateReply(
    messageContent: MessageContent & { sentiment?: SentimentType }
  ): Promise<ReplyGenerationResult> {
    const { subject = 'No subject', from, body, sentiment = 'neutral' } = messageContent;

    // Check if Ollama is available
    const status = this.ollamaClient.getStatus();
    if (!status.available) {
      console.warn('⚠️  MessageAnalysis: Ollama unavailable, using template reply');
      return this.templateReply(sentiment);
    }

    const toneGuidance = sentiment === 'negative'
      ? 'empathetic and solution-oriented'
      : sentiment === 'positive'
      ? 'warm and appreciative'
      : 'professional and courteous';

    const prompt = `Generate a professional email reply to this message.

Original Email:
Subject: ${subject}
From: ${from}
Body: ${body.slice(0, 800)}${body.length > 800 ? '...' : ''}

Requirements:
- Length: 50-200 words
- Tone: ${toneGuidance}
- Match the language of the original email
- Address key points raised
- Be clear and actionable
- Include appropriate greeting and closing

Respond in valid JSON format only:
{
  "replyText": "<generated reply including greeting and closing>",
  "language": "<detected language code, e.g., 'en', 'fr', 'es'>"
}`;

    try {
      const response = await this.ollamaClient.chat([
        {
          role: 'system',
          content: 'You are a professional email writing assistant. Always respond with valid JSON containing replyText and language fields. Match the tone and language of the original message.'
        },
        {
          role: 'user',
          content: prompt
        }
      ], { temperature: 0.7, max_tokens: 500 });

      const parsed = this.parseJSON(response);

      // Validate reply length (word count)
      const wordCount = (parsed.replyText || '').split(/\s+/).length;
      if (wordCount < 30 || wordCount > 250) {
        console.warn(`⚠️  MessageAnalysis: Generated reply has ${wordCount} words, outside optimal range`);
      }

      return {
        replyText: parsed.replyText || 'Thank you for your message. I will review this and get back to you soon.',
        language: parsed.language || 'en'
      };
    } catch (error) {
      console.error('❌ MessageAnalysis: Reply generation failed:', error);
      return this.templateReply(sentiment);
    }
  }

  /**
   * Task: T025 - Complete message analysis orchestration
   *
   * Performs comprehensive analysis by:
   * 1. Fetching message from database
   * 2. Running all analysis methods
   * 3. Calculating priority level
   * 4. Creating/updating MessageAnalysis document
   *
   * Handles graceful degradation when Ollama is unavailable.
   *
   * @param messageId - MongoDB ObjectId of the message
   * @returns Complete MessageAnalysis document
   */
  async analyzeMessage(messageId: string | mongoose.Types.ObjectId): Promise<IMessageAnalysis> {
    console.log(`📊 MessageAnalysis: Starting analysis for message ${messageId}`);

    try {
      // 1. Fetch message from database
      const message = await Message.findById(messageId);
      if (!message) {
        throw new Error(`Message not found: ${messageId}`);
      }

      // Prepare message content
      const messageContent: MessageContent = {
        subject: message.subject,
        from: message.sender,
        body: message.content
      };

      // 2. Run all analysis methods in parallel for efficiency
      console.log(`📊 MessageAnalysis: Running parallel analysis...`);
      const [spamResult, sentimentResult, responseResult] = await Promise.all([
        this.detectSpam(messageContent),
        this.analyzeSentiment(messageContent),
        this.detectResponseNecessity(messageContent)
      ]);

      // 3. Generate reply if response is needed (conditional)
      let replyResult: ReplyGenerationResult | null = null;
      if (responseResult.needsResponse && responseResult.confidence >= 60) {
        console.log(`📊 MessageAnalysis: Generating reply suggestion...`);
        replyResult = await this.generateReply({
          ...messageContent,
          sentiment: sentimentResult.sentiment
        });
      }

      // 4. Calculate priority level
      const priorityLevel = this.calculatePriorityLevel(
        spamResult,
        sentimentResult,
        responseResult,
        message.isUrgent
      );

      console.log(`📊 MessageAnalysis: Results - Spam: ${spamResult.probability}%, Sentiment: ${sentimentResult.sentiment}, Response: ${responseResult.needsResponse}, Priority: ${priorityLevel}`);

      // 5. Create or update MessageAnalysis document
      const analysisData = {
        messageId: message._id,
        analysisTimestamp: new Date(),
        spamProbability: spamResult.probability,
        isSpam: spamResult.isSpam,
        needsResponse: responseResult.needsResponse,
        responseConfidence: responseResult.confidence,
        sentiment: sentimentResult.sentiment,
        priorityLevel,
        generatedReplyText: replyResult?.replyText,
        analysisVersion: '1.0'
      };

      // Use findOneAndUpdate with upsert to handle both create and update
      const analysis = await MessageAnalysis.findOneAndUpdate(
        { messageId: message._id },
        { $set: analysisData },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true
        }
      );

      if (!analysis) {
        throw new Error('Failed to create/update analysis document');
      }

      console.log(`✅ MessageAnalysis: Analysis complete for message ${messageId}`);
      return analysis;

    } catch (error) {
      console.error(`❌ MessageAnalysis: Failed to analyze message ${messageId}:`, error);
      throw error;
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Parse JSON response with fallback handling
   */
  private parseJSON(response: string): any {
    try {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = response.match(/```json\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }

      // Try to extract JSON object directly
      const objectMatch = response.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        return JSON.parse(objectMatch[0]);
      }

      // Try parsing the entire response
      return JSON.parse(response);
    } catch (error) {
      console.error('❌ MessageAnalysis: JSON parse error:', error);
      console.error('Response was:', response);
      return {};
    }
  }

  /**
   * Normalize sentiment value to valid type
   */
  private normalizeSentiment(sentiment: any): SentimentType {
    const normalized = String(sentiment).toLowerCase();
    if (normalized.includes('positive')) return 'positive';
    if (normalized.includes('negative')) return 'negative';
    return 'neutral';
  }

  /**
   * Calculate priority level based on all analysis results
   */
  private calculatePriorityLevel(
    spamResult: SpamDetectionResult,
    sentimentResult: SentimentAnalysisResult,
    responseResult: ResponseNecessityResult,
    isUrgent: boolean
  ): 'high' | 'medium' | 'low' {
    // Spam messages are always low priority
    if (spamResult.isSpam) {
      return 'low';
    }

    // Calculate composite score
    let score = 50; // Base score

    // Urgency adds significant points
    if (isUrgent) {
      score += 30;
    }

    // Response necessity with high confidence increases priority
    if (responseResult.needsResponse && responseResult.confidence >= 70) {
      score += 25;
    } else if (responseResult.needsResponse) {
      score += 15;
    }

    // Negative sentiment may indicate problems requiring attention
    if (sentimentResult.sentiment === 'negative') {
      score += 15;
    } else if (sentimentResult.sentiment === 'positive') {
      score += 5;
    }

    // Determine priority level
    if (score >= this.HIGH_PRIORITY_THRESHOLD) {
      return 'high';
    } else if (score >= this.MEDIUM_PRIORITY_THRESHOLD) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Rule-based spam detection fallback (when Ollama unavailable)
   */
  private ruleBasedSpamDetection(messageContent: MessageContent): SpamDetectionResult {
    const { subject = '', from, body } = messageContent;
    const text = `${subject} ${body}`.toLowerCase();

    let spamScore = 0;
    const reasons: string[] = [];

    // Check for spam keywords
    const spamKeywords = [
      'viagra', 'cialis', 'lottery', 'winner', 'prize', 'claim now',
      'limited time', 'act now', 'free money', 'nigerian prince',
      'click here', 'congratulations', 'you have won', 'unsubscribe'
    ];

    spamKeywords.forEach(keyword => {
      if (text.includes(keyword)) {
        spamScore += 15;
        reasons.push(`Contains spam keyword: ${keyword}`);
      }
    });

    // Excessive capitalization
    const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length;
    if (capsRatio > 0.3) {
      spamScore += 20;
      reasons.push('Excessive capitalization');
    }

    // Multiple exclamation marks
    if ((text.match(/!/g) || []).length > 3) {
      spamScore += 15;
      reasons.push('Excessive exclamation marks');
    }

    // Suspicious sender patterns
    if (from.includes('noreply') || from.includes('no-reply')) {
      spamScore += 10;
      reasons.push('No-reply sender');
    }

    const probability = Math.min(100, spamScore);

    return {
      isSpam: probability >= this.SPAM_THRESHOLD,
      probability,
      reasoning: reasons.length > 0
        ? reasons.join('; ')
        : 'No strong spam indicators detected (rule-based)'
    };
  }

  /**
   * Rule-based response detection fallback (when Ollama unavailable)
   */
  private ruleBasedResponseDetection(messageContent: MessageContent): ResponseNecessityResult {
    const { subject = '', body } = messageContent;
    const text = `${subject} ${body}`.toLowerCase();

    let responseScore = 0;
    const reasons: string[] = [];

    // Question indicators
    const questionMarks = (text.match(/\?/g) || []).length;
    if (questionMarks > 0) {
      responseScore += 30;
      reasons.push(`Contains ${questionMarks} question(s)`);
    }

    // Action request keywords
    const actionKeywords = ['please', 'could you', 'can you', 'would you', 'request', 'need'];
    actionKeywords.forEach(keyword => {
      if (text.includes(keyword)) {
        responseScore += 15;
        reasons.push(`Contains action keyword: ${keyword}`);
      }
    });

    // Urgency keywords
    const urgentKeywords = ['urgent', 'asap', 'immediately', 'emergency'];
    urgentKeywords.forEach(keyword => {
      if (text.includes(keyword)) {
        responseScore += 20;
        reasons.push(`Urgent: contains ${keyword}`);
      }
    });

    const confidence = Math.min(100, responseScore);

    return {
      needsResponse: confidence >= 50,
      confidence,
      reasoning: reasons.length > 0
        ? reasons.join('; ')
        : 'Informational message, no clear response needed (rule-based)'
    };
  }

  /**
   * Template-based reply fallback (when Ollama unavailable)
   */
  private templateReply(sentiment: SentimentType = 'neutral'): ReplyGenerationResult {
    const templates = {
      positive: 'Thank you for your message! I appreciate you reaching out. I have received your email and will review the details carefully. I will get back to you with a response shortly.\n\nBest regards',
      negative: 'Thank you for bringing this to my attention. I understand your concerns and want to address them properly. I am reviewing the situation and will respond with a detailed solution as soon as possible.\n\nSincerely',
      neutral: 'Thank you for your email. I have received your message and will review it carefully. I will get back to you with a response soon.\n\nBest regards'
    };

    return {
      replyText: templates[sentiment] || templates.neutral,
      language: 'en'
    };
  }

  /**
   * Get service health status
   */
  getStatus() {
    return {
      service: 'MessageAnalysisService',
      ollamaStatus: this.ollamaClient.getStatus(),
      thresholds: {
        spam: this.SPAM_THRESHOLD,
        highPriority: this.HIGH_PRIORITY_THRESHOLD,
        mediumPriority: this.MEDIUM_PRIORITY_THRESHOLD
      }
    };
  }
}

// Export singleton instance
export const messageAnalysisService = new MessageAnalysisService();
export default MessageAnalysisService;
