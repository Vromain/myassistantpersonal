import { spawn } from 'child_process';

export interface SpamAssassinResult {
  available: boolean;
  score?: number; // spam score
  threshold?: number; // required score
  isSpam?: boolean;
  raw?: string;
  error?: string;
}

/**
 * Lightweight SpamAssassin client using `spamc` (SpamAssassin daemon).
 * - Uses `spamc -c` to get score/threshold in the form "<score>/<threshold>".
 * - Builds a minimal RFC822 email from provided fields.
 */
export class SpamAssassinClient {
  async analyzeEmail(subject: string, from: string, body: string): Promise<SpamAssassinResult> {
    return new Promise((resolve) => {
      try {
        const proc = spawn('spamc', ['-c']);

        let stdout = '';
        let stderr = '';

        proc.stdout.on('data', (d) => (stdout += d.toString()));
        proc.stderr.on('data', (d) => (stderr += d.toString()));

        proc.on('error', (err) => {
          resolve({ available: false, error: err.message });
        });

        proc.on('close', () => {
          const line = stdout.trim();
          // Expected format: "<score>/<threshold>"
          const match = line.match(/([\d.]+)\/(\d+\.?\d*)/);
          if (!match) {
            resolve({ available: false, raw: stdout, error: stderr || 'Unexpected spamc output' });
            return;
          }
          const score = parseFloat(match[1]);
          const threshold = parseFloat(match[2]);
          resolve({ available: true, score, threshold, isSpam: score >= threshold, raw: line });
        });

        // Write minimal email content to stdin
        const now = new Date().toUTCString();
        const email = `From: ${from}\nSubject: ${subject}\nDate: ${now}\n\n${body}\n`;
        proc.stdin.write(email);
        proc.stdin.end();
      } catch (e: any) {
        resolve({ available: false, error: e.message });
      }
    });
  }
}

export const spamAssassinClient = new SpamAssassinClient();
