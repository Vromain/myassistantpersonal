import { google } from 'googleapis';
import { Message, IMessage } from '../models/message';
import { MessageAnalysis } from '../models/message_analysis';
import { ConnectedAccount } from '../models/connected_account';
import { getGmailAccessToken } from './auth/gmail_strategy';
import { ollamaClient } from './ollama_client';
import mongoose from 'mongoose';

/**
 * Auto Reply Service
 *
 * Generates and sends automatic email replies using AI
 */

export interface AutoReplyResult {
  generated: boolean;
  sent: boolean;
  replyText?: string;
  error?: string;
}

export interface AutoReplyLog {
  messageId: string;
  subject: string;
  from: string;
  replyText: string;
  sentAt: Date;
  status: 'generated' | 'sent' | 'failed';
}

export class AutoReplyService {
  /**
   * Generate and send automatic reply for a message
   */
  async generateAndSendReply(
    messageId: string,
    userId: string
  ): Promise<AutoReplyResult> {
    const result: AutoReplyResult = {
      generated: false,
      sent: false
    };

    try {
      console.log(`📧 AutoReply: Processing message ${messageId}`);

      // Get message
      const message = await Message.findById(messageId);
      if (!message) {
        result.error = 'Message not found';
        return result;
      }

      // Get analysis
      const analysis = await MessageAnalysis.findOne({ messageId: message._id });
      if (!analysis) {
        result.error = 'Message analysis not found';
        return result;
      }

      // Generate reply using AI
      const replyText = await this.generateReply(message);
      if (!replyText) {
        result.error = 'Failed to generate reply';
        return result;
      }

      result.generated = true;
      result.replyText = replyText;

      // Store generated reply in analysis
      analysis.generatedReplyText = replyText;
      await analysis.save();

      console.log(`✅ AutoReply: Generated reply for message ${messageId}`);

      // Send reply via Gmail API
      const sent = await this.sendReply(
        message,
        replyText,
        userId
      );

      if (sent) {
        result.sent = true;
        console.log(`✅ AutoReply: Sent reply for message ${messageId}`);
      } else {
        result.error = 'Failed to send reply';
        console.log(`❌ AutoReply: Failed to send reply for message ${messageId}`);
      }

      return result;
    } catch (error: any) {
      console.error(`❌ AutoReply: Error processing message ${messageId}:`, error);
      result.error = error.message;
      return result;
    }
  }

  /**
   * Generate reply text using AI
   */
  private async generateReply(message: IMessage): Promise<string | null> {
    try {
      const prompt = this.buildReplyPrompt(message);
      const aiResponse = await ollamaClient.generateCompletion(prompt);

      // Clean up response
      let reply = aiResponse.trim();

      // Remove quotes if present
      if (reply.startsWith('"') && reply.endsWith('"')) {
        reply = reply.slice(1, -1);
      }

      return reply;
    } catch (error: any) {
      console.error('❌ AutoReply: Error generating reply:', error);
      return null;
    }
  }

  /**
   * Build prompt for reply generation
   */
  private buildReplyPrompt(message: IMessage): string {
    return `You are an AI email assistant. Generate a professional, concise email reply to the following message.

Original Email:
From: ${message.sender}
Subject: ${message.subject || 'No subject'}
Body: ${message.content.substring(0, 500)}${message.content.length > 500 ? '...' : ''}

Guidelines:
- Be professional and courteous
- Keep the reply concise (2-3 sentences maximum)
- Address the main points or questions
- Do not make specific commitments or promises
- Acknowledge receipt and indicate follow-up if needed
- Sign off appropriately

Generate ONLY the reply text (no subject line, no additional formatting). Start your response directly with the reply text.`;
  }

  /**
   * Send reply via Gmail API
   */
  private async sendReply(
    originalMessage: IMessage,
    replyText: string,
    userId: string
  ): Promise<boolean> {
    try {
      // Get account
      const account = await ConnectedAccount.findById(originalMessage.accountId);
      if (!account || account.platform !== 'gmail') {
        console.error('❌ AutoReply: Invalid account or not Gmail');
        return false;
      }

      // Get access token
      const accessToken = await getGmailAccessToken(account.id);
      if (!accessToken) {
        console.error('❌ AutoReply: Failed to get access token');
        return false;
      }

      // Initialize Gmail API
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({ access_token: accessToken });
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      // Build email message
      const emailLines = [
        `To: ${originalMessage.sender}`,
        `Subject: Re: ${originalMessage.subject || 'Your message'}`,
        `In-Reply-To: ${originalMessage.externalId}`,
        `References: ${originalMessage.externalId}`,
        'Content-Type: text/plain; charset=utf-8',
        '',
        replyText,
        '',
        '--',
        'This is an automated reply generated by AI.'
      ];

      const email = emailLines.join('\r\n');
      const encodedEmail = Buffer.from(email)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      // Send email
      await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedEmail,
          threadId: originalMessage.metadata?.threadId as string | undefined
        }
      });

      console.log(`📤 AutoReply: Email sent successfully`);
      return true;
    } catch (error: any) {
      console.error('❌ AutoReply: Error sending email:', error);
      return false;
    }
  }

  /**
   * Get auto-reply logs for user
   */
  async getAutoReplyLogs(
    userId: string,
    limit: number = 50
  ): Promise<AutoReplyLog[]> {
    try {
      // Find messages with generated replies
      const messages = await Message.find({
        userId: new mongoose.Types.ObjectId(userId)
      })
        .sort({ createdAt: -1 })
        .limit(limit * 2) // Get more to filter
        .lean();

      const messageIds = messages.map(m => m._id);

      // Get analyses with replies
      const analyses = await MessageAnalysis.find({
        messageId: { $in: messageIds },
        generatedReplyText: { $exists: true, $ne: null }
      }).lean();

      const analysisMap = new Map(
        analyses.map(a => [a.messageId.toString(), a])
      );

      // Build logs
      const logs: AutoReplyLog[] = [];

      for (const message of messages) {
        const analysis = analysisMap.get(message._id.toString());
        if (analysis && analysis.generatedReplyText) {
          logs.push({
            messageId: message._id.toString(),
            subject: message.subject || 'No subject',
            from: message.sender,
            replyText: analysis.generatedReplyText,
            sentAt: message.createdAt,
            status: 'sent' // TODO: Track actual sent status
          });
        }

        if (logs.length >= limit) {
          break;
        }
      }

      return logs;
    } catch (error: any) {
      console.error('❌ AutoReply: Error getting logs:', error);
      return [];
    }
  }
}

export const autoReplyService = new AutoReplyService();
