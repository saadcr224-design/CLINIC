// Runs once when the Next.js server starts. On a long-running server (not Vercel, where
// Vercel Cron calls /api/cron/automation instead) start the 10-minute automation timer.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs' && !process.env.VERCEL) {
    const automation = (await import('./lib/automation')).default;
    automation.start();
  }
}
