// Small helper to sanitize objects before logging so we don't accidentally
// print access/refresh/id tokens, client secrets, or other sensitive fields.
export function sanitizeForLog(obj: any): any {
  try {
    if (obj == null) return obj;
    if (typeof obj === 'string') {
      // Mask long-looking token-like strings
      return obj.replace(/([A-Za-z0-9_-]{20,})/g, '[REDACTED]');
    }

    if (typeof obj === 'object') {
      const sensitiveKeys = new Set([
        'access_token',
        'refresh_token',
        'id_token',
        'client_secret',
        'KEYCLOAK_CLIENT_SECRET',
        'password',
        'token',
        'secret',
      ]);

      return JSON.parse(
        JSON.stringify(obj, (k, v) => {
          if (!k) return v;
          if (sensitiveKeys.has(k)) return '[REDACTED]';
          if (typeof v === 'string' && v.length > 100) {
            // redact very long strings that may contain tokens
            return '[REDACTED]';
          }
          return v;
        })
      );
    }

    return obj;
  } catch (e) {
    return '[UNAVAILABLE]';
  }
}

export default sanitizeForLog;
