// Test setup: deterministic env defaults so fail-closed paths are testable.
// NODE_ENV is managed by the runner (vitest sets "test")
process.env.RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET ?? "test-webhook-secret";
process.env.CRON_SECRET = process.env.CRON_SECRET ?? "test-cron-secret";
process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? "test-gemini-key";
