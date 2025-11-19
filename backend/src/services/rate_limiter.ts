/**
 * Rate Limiter Service
 * Task: T080 - Implement rate limit handling for third-party APIs
 *
 * Provides queue-based rate limiting with exponential backoff for API calls.
 * Prevents hitting Gmail API quotas (250 units/second per user).
 *
 * Usage:
 *   const limiter = new RateLimiter('gmail', 150); // 150 units/sec (buffer)
 *   await limiter.execute(() => gmail.users.messages.get(...), 5); // 5 quota units
 */

interface QueuedTask<T> {
  fn: () => Promise<T>;
  quotaCost: number;
  resolve: (value: T) => void;
  reject: (error: any) => void;
  retries: number;
  addedAt: Date;
}

interface RateLimiterStats {
  queueLength: number;
  unitsConsumed: number;
  unitsLimit: number;
  currentWindow: Date;
  totalExecuted: number;
  totalRetried: number;
  totalFailed: number;
}

export class RateLimiter {
  private queue: QueuedTask<any>[] = [];
  private processing = false;
  private unitsConsumed = 0;
  private windowStart = Date.now();
  private readonly windowMs = 1000; // 1 second window

  // Statistics
  private totalExecuted = 0;
  private totalRetried = 0;
  private totalFailed = 0;

  // Configuration
  private readonly maxRetries = 5;
  private readonly baseDelayMs = 1000; // 1 second initial delay
  private readonly maxQueueSize = 1000;

  constructor(
    private readonly serviceName: string,
    private readonly unitsPerSecond: number = 150 // Default: 150 units/sec (buffer for Gmail's 250 limit)
  ) {
    console.log(`🚦 Rate limiter initialized for ${serviceName}: ${unitsPerSecond} units/sec`);
  }

  /**
   * Execute a function with rate limiting
   * @param fn Function to execute
   * @param quotaCost Quota units consumed by this operation (default: 5)
   * @returns Promise resolving to function result
   */
  async execute<T>(fn: () => Promise<T>, quotaCost: number = 5): Promise<T> {
    return new Promise((resolve, reject) => {
      // Check queue size
      if (this.queue.length >= this.maxQueueSize) {
        reject(new Error(`Rate limiter queue full (${this.maxQueueSize} tasks)`));
        return;
      }

      // Add to queue
      const task: QueuedTask<T> = {
        fn,
        quotaCost,
        resolve,
        reject,
        retries: 0,
        addedAt: new Date()
      };

      this.queue.push(task);

      // Start processing if not already running
      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  /**
   * Process queued tasks with rate limiting
   */
  private async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const task = this.queue[0];

      // Reset window if needed
      const now = Date.now();
      if (now - this.windowStart >= this.windowMs) {
        this.unitsConsumed = 0;
        this.windowStart = now;
      }

      // Check if we can execute this task within quota
      if (this.unitsConsumed + task.quotaCost > this.unitsPerSecond) {
        // Wait until next window
        const waitTime = this.windowMs - (now - this.windowStart);
        await this.sleep(waitTime);
        continue;
      }

      // Remove from queue and execute
      this.queue.shift();
      await this.executeTask(task);
    }

    this.processing = false;
  }

  /**
   * Execute a single task with retry logic
   */
  private async executeTask<T>(task: QueuedTask<T>): Promise<void> {
    try {
      // Execute the function
      const result = await task.fn();

      // Update stats
      this.unitsConsumed += task.quotaCost;
      this.totalExecuted++;

      // Resolve promise
      task.resolve(result);

    } catch (error: any) {
      // Check if it's a rate limit error (429)
      const isRateLimitError =
        error.code === 429 ||
        error.status === 429 ||
        error.message?.toLowerCase().includes('rate limit') ||
        error.message?.toLowerCase().includes('quota exceeded');

      if (isRateLimitError && task.retries < this.maxRetries) {
        // Exponential backoff
        const delay = this.calculateBackoffDelay(task.retries);

        console.warn(
          `⚠️  Rate limit hit for ${this.serviceName} ` +
          `(retry ${task.retries + 1}/${this.maxRetries}, ` +
          `waiting ${delay}ms)`
        );

        task.retries++;
        this.totalRetried++;

        // Wait and re-queue
        await this.sleep(delay);
        this.queue.unshift(task); // Add back to front of queue

      } else {
        // Max retries exceeded or non-retryable error
        if (task.retries >= this.maxRetries) {
          console.error(
            `❌ ${this.serviceName} task failed after ${this.maxRetries} retries:`,
            error.message
          );
        } else {
          console.error(`❌ ${this.serviceName} task failed:`, error.message);
        }

        this.totalFailed++;
        task.reject(error);
      }
    }
  }

  /**
   * Calculate exponential backoff delay
   * Formula: baseDelay * (2 ^ retries) + random jitter
   */
  private calculateBackoffDelay(retries: number): number {
    const exponentialDelay = this.baseDelayMs * Math.pow(2, retries);
    const jitter = Math.random() * 1000; // 0-1000ms jitter
    const maxDelay = 60000; // Cap at 60 seconds

    return Math.min(exponentialDelay + jitter, maxDelay);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current rate limiter statistics
   */
  getStats(): RateLimiterStats {
    return {
      queueLength: this.queue.length,
      unitsConsumed: this.unitsConsumed,
      unitsLimit: this.unitsPerSecond,
      currentWindow: new Date(this.windowStart),
      totalExecuted: this.totalExecuted,
      totalRetried: this.totalRetried,
      totalFailed: this.totalFailed
    };
  }

  /**
   * Clear the queue (use with caution)
   */
  clearQueue(): void {
    const rejected = this.queue.length;
    this.queue.forEach(task => {
      task.reject(new Error('Queue cleared'));
    });
    this.queue = [];
    console.log(`🗑️  Cleared ${rejected} tasks from ${this.serviceName} rate limiter`);
  }

  /**
   * Wait for queue to be empty
   */
  async waitForQueue(): Promise<void> {
    while (this.queue.length > 0 || this.processing) {
      await this.sleep(100);
    }
  }
}

/**
 * Gmail-specific rate limiter instance
 * Uses 150 units/second (60% of Gmail's 250 limit) for safety buffer
 */
export const gmailRateLimiter = new RateLimiter('Gmail API', 150);

/**
 * Create a rate limiter for a specific user
 * Each user has their own 250 units/second quota
 */
export function createUserRateLimiter(
  userId: string,
  unitsPerSecond: number = 150
): RateLimiter {
  return new RateLimiter(`User ${userId}`, unitsPerSecond);
}

export default RateLimiter;
