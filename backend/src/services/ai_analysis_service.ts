import { IMessage } from '../models/message';
import { MessageAnalysis, IMessageAnalysis } from '../models/message_analysis';
import { ollamaClient } from './ollama_client';
import mongoose from 'mongoose';
import { getMessageSqlRepo } from '../models/message_sql';

/**
 * AI Analysis Service
 *
 * Analyzes messages for:
 * - Spam detection
 * - Reply necessity
 * - Sentiment analysis
 * - Priority level
 */

export interface AnalysisResult {
  spamProbability: number;
  isSpam: boolean;
  needsResponse: boolean;
  responseConfidence: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  priorityLevel: 'high' | 'medium' | 'low';
  reasoning: string;
}

export class AIAnalysisService {
  /**
   * Analyze a message using AI
   */
  async analyzeMessage(message: IMessage): Promise<IMessageAnalysis> {
    console.log(`🤖 AI: Analyzing message ${message._id}`);

    try {
      // Check if analysis already exists
      const existing = await MessageAnalysis.findOne({ messageId: message._id });
      if (existing) {
        console.log(`✅ AI: Analysis already exists for message ${message._id}`);
        return existing;
      }

      // Prepare prompt for AI
      const prompt = this.buildAnalysisPrompt(message);

      // Call Ollama for analysis
      const aiResponse = await ollamaClient.generateCompletion(prompt);

      // Parse AI response
      const analysis = this.parseAIResponse(aiResponse);

      // Create analysis record
      const messageAnalysis = new MessageAnalysis({
        messageId: message._id,
        analysisTimestamp: new Date(),
        spamProbability: analysis.spamProbability,
        isSpam: analysis.isSpam,
        needsResponse: analysis.needsResponse,
        responseConfidence: analysis.responseConfidence,
        sentiment: analysis.sentiment,
        priorityLevel: analysis.priorityLevel,
        analysisVersion: '1.0'
      });

      await messageAnalysis.save();

      // Update message document with spam indicators
      try {
        await (mongoose.model('Message') as any).findByIdAndUpdate(
          message._id,
          {
            $set: {
              isSpam: analysis.isSpam,
              spamProbability: analysis.spamProbability,
            }
          },
          { new: true }
        );
        try {
          const repo = await getMessageSqlRepo();
          const sqlMsg = await repo.findOne({ where: { accountId: (message as any).accountId, externalId: (message as any).externalId } });
          if (sqlMsg) {
            sqlMsg.isSpam = analysis.isSpam;
            sqlMsg.spamProbability = analysis.spamProbability;
            await repo.save(sqlMsg);
          }
        } catch (e2) {
          console.warn('⚠️  AI: Failed to update SQL message spam fields:', e2);
        }
      } catch (e) {
        console.warn('⚠️  AI: Failed to update message spam fields:', e);
      }

      console.log(`✅ AI: Analysis completed for message ${message._id}`);
      console.log(`   - Spam: ${analysis.isSpam} (${analysis.spamProbability}%)`);
      console.log(`   - Needs reply: ${analysis.needsResponse} (${analysis.responseConfidence}%)`);
      console.log(`   - Sentiment: ${analysis.sentiment}`);

      return messageAnalysis;
    } catch (error: any) {
      console.error(`❌ AI: Error analyzing message ${message._id}:`, error);
      throw error;
    }
  }

  /**
   * Build analysis prompt for AI
   */
  private buildAnalysisPrompt(message: IMessage): string {
    return `You are an email analysis AI. Analyze the following email and provide your analysis in JSON format.

Email Details:
From: ${message.sender}
To: ${message.recipient}
Subject: ${message.subject || 'No subject'}
Body: ${message.content.substring(0, 1000)}${message.content.length > 1000 ? '...' : ''}

Please analyze this email and respond with ONLY a JSON object (no additional text) with the following structure:
{
  "spamProbability": <number 0-100>,
  "isSpam": <boolean>,
  "needsResponse": <boolean>,
  "responseConfidence": <number 0-100>,
  "sentiment": "<positive|neutral|negative>",
  "priorityLevel": "<high|medium|low>",
  "reasoning": "<brief explanation>"
}

Consider these spam indicators:
- Suspicious sender addresses
- Excessive capitalization or exclamation marks
- Suspicious links or attachments
- Generic greetings or urgency tactics
- Poor grammar or spelling
- Requests for personal information

Consider these reply indicators:
- Direct questions
- Action items requested
- Important information shared
- Personal messages from known contacts
- Business correspondence

Respond with ONLY the JSON object, nothing else.`;
  }

  /**
   * Parse AI response into analysis result
   */
  private parseAIResponse(aiResponse: string): AnalysisResult {
    try {
      // Try to extract JSON from response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        spamProbability: Math.min(100, Math.max(0, parsed.spamProbability || 0)),
        isSpam: parsed.isSpam || parsed.spamProbability >= 80,
        needsResponse: parsed.needsResponse || false,
        responseConfidence: Math.min(100, Math.max(0, parsed.responseConfidence || 0)),
        sentiment: parsed.sentiment || 'neutral',
        priorityLevel: parsed.priorityLevel || 'medium',
        reasoning: parsed.reasoning || 'No reasoning provided'
      };
    } catch (error: any) {
      console.error('❌ AI: Error parsing AI response:', error);
      console.error('Response was:', aiResponse);

      // Return safe defaults
      return {
        spamProbability: 50,
        isSpam: false,
        needsResponse: false,
        responseConfidence: 0,
        sentiment: 'neutral',
        priorityLevel: 'medium',
        reasoning: 'Failed to parse AI response'
      };
    }
  }

  /**
   * Batch analyze multiple messages
   */
  async analyzeMessages(messages: IMessage[]): Promise<IMessageAnalysis[]> {
    console.log(`🤖 AI: Analyzing ${messages.length} messages in batch`);

    const results: IMessageAnalysis[] = [];

    for (const message of messages) {
      try {
        const analysis = await this.analyzeMessage(message);
        results.push(analysis);
      } catch (error: any) {
        console.error(`❌ AI: Error analyzing message ${message._id}:`, error);
        // Continue with next message
      }
    }

    return results;
  }
}

export const aiAnalysisService = new AIAnalysisService();
