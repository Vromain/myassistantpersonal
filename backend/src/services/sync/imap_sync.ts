import { ConnectedAccount } from '../../models/connected_account';
import { getMessageSqlRepo, MessageSql } from '../../models/message_sql';

interface SyncResult {
  success: boolean;
  messagesStored: number;
  errors: string[];
}

class ImapSyncService {
  async syncAccount(accountId: string): Promise<SyncResult> {
    const errors: string[] = [];
    let stored = 0;
    try {
      const account = await ConnectedAccount.findById(accountId);
      if (!account || account.platform !== 'imap') {
        return { success: false, messagesStored: 0, errors: ['Invalid account'] };
      }

      const tokens = (account as any).decryptTokens(account.oauthTokens);
      const imapSimple = require('imap-simple');
      const config = {
        imap: {
          user: account.email,
          password: tokens.accessToken,
          host: (account as any).imapConfig.host,
          port: (account as any).imapConfig.port,
          tls: (account as any).imapConfig.secure,
          authTimeout: 10000,
          tlsOptions: { rejectUnauthorized: false }
        }
      };

      const connection = await imapSimple.connect(config);
      await connection.openBox('INBOX');

      const sinceDate = account.syncSettings.syncFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const searchCriteria = ['ALL', ['SINCE', sinceDate.toUTCString()]];
      const fetchOptions = { bodies: ['HEADER', 'TEXT'], struct: true };

      const repo = await getMessageSqlRepo();
      const messages = await connection.search(searchCriteria as any, fetchOptions);
      for (const msg of messages) {
        try {
          const uid: string = String((msg as any).attributes.uid);
          const headerPart = msg.parts.find((p: any) => p.which === 'HEADER');
          const textPart = msg.parts.find((p: any) => p.which === 'TEXT');
          const from = headerPart?.body?.from?.[0] || '';
          const to = headerPart?.body?.to?.[0] || '';
          const subject = headerPart?.body?.subject?.[0] || '';
          const content = (textPart?.body as string) || '';

          const existing = await repo.findOne({ where: { accountId: account.id, externalId: uid } });
          if (!existing) {
            const sqlMsg = repo.create({
              userId: account.userId,
              accountId: account.id,
              externalId: uid,
              platform: 'imap',
              sender: from,
              recipient: to,
              subject,
              content,
              timestamp: (msg as any).attributes.date || new Date(),
              readStatus: !(msg as any).attributes.flags?.includes('\\Seen'),
              priorityScore: 50,
              priorityLevel: 'medium',
              isUrgent: false,
              metadata: { mailbox: 'INBOX' },
              archivedAt: null
            } as Partial<MessageSql>);
            await repo.save(sqlMsg);
            stored++;
          }
        } catch (e: any) {
          errors.push(e.message);
        }
      }

      await connection.end();
      return { success: errors.length === 0, messagesStored: stored, errors };
    } catch (e: any) {
      errors.push(e.message);
      return { success: false, messagesStored: stored, errors };
    }
  }

  async syncUserAccounts(userId: string): Promise<SyncResult[]> {
    const accounts = await ConnectedAccount.find({ userId, platform: 'imap' });
    const results: SyncResult[] = [];
    for (const acc of accounts) {
      results.push(await this.syncAccount(acc.id));
    }
    return results;
  }
}

export const imapSyncService = new ImapSyncService();
export default ImapSyncService;
