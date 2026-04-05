/**
 * Retry delay strategies for `ConnectionManager`: after disconnect/error, the manager calls the
 * strategy to get milliseconds to wait before the next `adapter.open()`. Return `null` to stop
 * retrying and move to `error`.
 *
 * @example Default (exponential backoff) — same as omitting the second ctor arg:
 * ```ts
 * new ConnectionManager(adapter);
 * ```
 *
 * @example Pick a built-in factory:
 * ```ts
 * new ConnectionManager(adapter, RetryStrategies.exponential(500, 20000, 6, 3));
 * new ConnectionManager(adapter, RetryStrategies.fibonacci(1000, 8, 3));
 * new ConnectionManager(adapter, RetryStrategies.polling(3000, 10, 3));
 * ```
 *
 * @example Custom strategy:
 * ```ts
 * const custom: RetryStrategy = {
 *   allowSelfRecoverCount: 2,
 *   delay: ({ retryCount, lastDelay }) =>
 *     retryCount >= 3 ? null : (lastDelay ?? 1000) * 2,
 * };
 * new ConnectionManager(adapter, custom);
 * ```
 */

interface RetryStrategyInput {
  retryCount: number;
  lastDelay: number | undefined;
}

const DEFAULT_ALLOW_SELF_RECOVER_COUNT = 3;

export type RetryDelayStrategy = (input: RetryStrategyInput) => number | null;

export type RetryStrategy = {
  /**
   * Number of retries allowed for silent self-recovery before exposing `reconnecting`.
   */
  allowSelfRecoverCount?: number;
  delay: RetryDelayStrategy;
};

export const RetryStrategies = {
  // 1. Exponential Backoff
  exponential: (
    base = 1000,
    max = 30000,
    maxRetries = 5,
    allowSelfRecoverCount = DEFAULT_ALLOW_SELF_RECOVER_COUNT
  ): RetryStrategy => ({
    allowSelfRecoverCount,
    delay: ({ retryCount }) => {
      if (retryCount >= maxRetries) return null;
      return Math.min(base * 2 ** retryCount, max);
    },
  }),

  // 2. Fibonacci Backoff
  fibonacci: (
    base = 1000,
    maxRetries = 8,
    allowSelfRecoverCount = DEFAULT_ALLOW_SELF_RECOVER_COUNT
  ): RetryStrategy => {
    const fib = (n: number): number => (n <= 1 ? n : fib(n - 1) + fib(n - 2));
    return {
      allowSelfRecoverCount,
      delay: ({ retryCount }) => {
        if (retryCount >= maxRetries) return null;
        return base * fib(retryCount + 1);
      },
    };
  },

  // 3. Fixed Interval
  polling: (
    interval = 3000,
    maxRetries = 10,
    allowSelfRecoverCount = DEFAULT_ALLOW_SELF_RECOVER_COUNT
  ): RetryStrategy => ({
    allowSelfRecoverCount,
    delay: ({ retryCount }) => (retryCount >= maxRetries ? null : interval),
  }),
} as const;
