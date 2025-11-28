import { google } from 'googleapis';
import { getGmailAccessToken } from '../auth/gmail_strategy';
import { Message } from '../../models/message';
import { ConnectedAccount } from '../../models/connected_account';
import { createUserRateLimiter, RateLimiter } from '../rate_limiter';

/**
 * Gmail Reply Service
 * Task: T041 - Implement POST /messages/:id/reply endpoint
 * Task: T080 - Rate limit handling for Gmail API
 * Reference: specs/001-ai-communication-hub/tasks.md
 *
 * Sends replies to Gmail messages through the Gmail API with rate limiting
 */

export interface ReplyOptions {
  messageId: string;
  userId: string;
  replyContent: string;
  replyAll?: boolean;
}

export interface ReplyResult {
  success: boolean;
  sentMessageId?: string;
  error?: string;
}

export class GmailReplyService {
  // Rate limiter cache per user (Gmail has per-user quotas)
  private rateLimiters = new Map<string, RateLimiter>();

  /**
   * Get or create rate limiter for a user
   */
  private getRateLimiter(userId: string): RateLimiter {
    if (!this.rateLimiters.has(userId)) {
      this.rateLimiters.set(userId, createUserRateLimiter(userId));
    }
    return this.rateLimiters.get(userId)!;
  }

  /**
   * Send a reply to a Gmail message
   */
  async sendReply(options: ReplyOptions): Promise<ReplyResult> {
    const { messageId, userId, replyContent, replyAll = false } = options;

    try {
      // Get the original message
      const message = await Message.findOne({
        _id: messageId,
        platform: 'gmail'
      });

      if (!message) {
        return {
          success: false,
          error: 'Message not found or not a Gmail message'
        };
      }

      // Get the connected account
      const account = await ConnectedAccount.findOne({
        id: message.accountId as any,
        userId,
        platform: 'gmail'
      });

      if (!account) {
        return {
          success: false,
          error: 'Gmail account not found'
        };
      }

      // Get valid access token
      const accessToken = await getGmailAccessToken(account.id);

      if (!accessToken) {
        return {
          success: false,
          error: 'Failed to obtain valid access token'
        };
      }

      // Initialize Gmail API client
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({ access_token: accessToken });
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      // Build email content
      const email = this.buildReplyEmail(message, replyContent, replyAll);

      // Get rate limiter for this user
      const rateLimiter = this.getRateLimiter(userId);

      // Send the message with rate limiting
      // messages.send costs ~100 quota units
      const result = await rateLimiter.execute(
        async () => gmail.users.messages.send({
          userId: 'me',
          requestBody: {
            raw: this.encodeEmail(email),
            threadId: message.metadata?.threadId
          }
        }),
        100 // quota cost
      );

      console.log(`✅ Reply sent successfully: ${result.data.id}`);

      return {
        success: true,
        sentMessageId: result.data.id || undefined
      };
    } catch (error: any) {
      console.error('❌ Error sending Gmail reply:', error);
      return {
        success: false,
        error: error.message || 'Failed to send reply'
      };
    }
  }

  /**
   * Build reply email content
   */
  private buildReplyEmail(
    originalMessage: any,
    replyContent: string,
    replyAll: boolean
  ): string {
    const from = originalMessage.recipient; // Our account
    const to = originalMessage.sender; // Reply to sender
    const subject = originalMessage.subject?.startsWith('Re:')
      ? originalMessage.subject
      : `Re: ${originalMessage.subject || '(No Subject)'}`;

    let headers = [
      `From: ${from}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      'Content-Type: text/plain; charset=utf-8',
      'MIME-Version: 1.0'
    ];

    // Add In-Reply-To and References headers for threading
    if (originalMessage.metadata?.messageId) {
      headers.push(`In-Reply-To: ${originalMessage.metadata.messageId}`);

      const references = originalMessage.metadata?.references || [];
      if (references.length > 0) {
        headers.push(`References: ${references.join(' ')} ${originalMessage.metadata.messageId}`);
      } else {
        headers.push(`References: ${originalMessage.metadata.messageId}`);
      }
    }

    // Add Cc for reply all (if there were other recipients)
    if (replyAll && originalMessage.metadata?.cc) {
      headers.push(`Cc: ${originalMessage.metadata.cc}`);
    }

    const emailContent = [
      ...headers,
      '',
      replyContent,
      '',
      // Add original message quote
      `On ${new Date(originalMessage.timestamp).toLocaleString()}, ${originalMessage.sender} wrote:`,
      ...originalMessage.content.split('\n').map((line: string) => `> ${line}`)
    ].join('\n');

    return emailContent;
  }

  /**
   * Encode email content to base64url format required by Gmail API
   */
  private encodeEmail(email: string): string {
    const encodedEmail = Buffer.from(email)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    return encodedEmail;
  }

  /**
   * Send a new email (not a reply)
   */
  async sendEmail(
    accountId: string,
    userId: string,
    to: string,
    subject: string,
    content: string,
    cc?: string,
    bcc?: string
  ): Promise<ReplyResult> {
    try {
      // Get the connected account
      const account = await ConnectedAccount.findOne({
        id: accountId,
        userId,
        platform: 'gmail'
      });

      if (!account) {
        return {
          success: false,
          error: 'Gmail account not found'
        };
      }

      // Get valid access token
      const accessToken = await getGmailAccessToken(account.id);

      if (!accessToken) {
        return {
          success: false,
          error: 'Failed to obtain valid access token'
        };
      }

      // Initialize Gmail API client
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({ access_token: accessToken });
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      // Build email
      let headers = [
        `From: ${account.email}`,
        `To: ${to}`,
        `Subject: ${subject}`,
        'Content-Type: text/plain; charset=utf-8',
        'MIME-Version: 1.0'
      ];

      if (cc) headers.push(`Cc: ${cc}`);
      if (bcc) headers.push(`Bcc: ${bcc}`);

      const email = [...headers, '', content].join('\n');

      // Get rate limiter for this user
      const rateLimiter = this.getRateLimiter(userId);

      // Send the message with rate limiting
      // messages.send costs ~100 quota units
      const result = await rateLimiter.execute(
        async () => gmail.users.messages.send({
          userId: 'me',
          requestBody: {
            raw: this.encodeEmail(email)
          }
        }),
        100 // quota cost
      );

      console.log(`✅ Email sent successfully: ${result.data.id}`);

      return {
        success: true,
        sentMessageId: result.data.id || undefined
      };
    } catch (error: any) {
      console.error('❌ Error sending email:', error);
      return {
        success: false,
        error: error.message || 'Failed to send email'
      };
    }
  }
}

// Export singleton instance
export const gmailReplyService = new GmailReplyService();
export default GmailReplyService;
