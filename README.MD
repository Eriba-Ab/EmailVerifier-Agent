# Telex MailboxLayer Agent

Simple Mastra-compatible A2A agent that verifies emails using MailboxLayer.

## Setup
1. Clone repo
2. Create `.env` with:
   MAILBOXLAYER_KEY=your_key
   MAILBOXLAYER_URL=https://apilayer.net/api/check
   PORT=8080

3. Install & run
   npm install
   npm run dev

4. Expose `/a2a/webhook` publicly (HTTPS). Use this URL in your Mastra workflow node `url` field.

## API
POST /a2a/webhook
- Accepts A2A JSON with `payload.email`.
- Returns A2A response JSON with `payload.verdict` (deliverable|risky|undeliverable|invalid_format|unknown) and `details`.

## Notes
- Tune heuristics in `interpretMailboxResult`.
- Consider caching (short TTL) to reduce API usage for repeated verifications.
