/**
 * Sanitizes error messages to prevent leaking sensitive database information
 * @param err - The error object or unknown error
 * @returns A safe, user-friendly error message
 */
export const safeError = (err: unknown): string => {
  if (typeof err === 'object' && err && 'message' in err) {
    const message = (err as { message: string }).message;
    // Remove sensitive database details (UUID, SQL, query details)
    return message.replace(/(uuid|query|sql|syntax|postgresql|invalid input).*/gi, '[Database error]');
  }
  return 'An unexpected error occurred';
};

/**
 * Logs the full error details for debugging while showing safe message to users
 * @param err - The error to log
 * @param context - Context about where the error occurred
 */
export const logError = (err: unknown, context: string): void => {
  console.error(`[${context}]`, err);
};
