import { createTool } from "@mastra/core/tools";
import { z } from "zod";

const MAILBOXLAYER_API_KEY = process.env.MAILBOXLAYER_API_KEY;

export const mailboxlayerTool = createTool({
  id: "mailboxlayer-verify",
  description:
    "Verify an email address using the MailboxLayer API. Returns structured verification data (format, mx, smtp, disposable, score, etc.).",
  inputSchema: z.object({
    email: z
      .string()
      .email()
      .describe("The email address to verify (e.g. user@example.com)"),
  }),
  outputSchema: z.object({
    email: z.string().describe("Normalized email returned by MailboxLayer"),
    did_you_mean: z.string().nullable().describe("Typo suggestion from MailboxLayer"),
    format_valid: z.boolean().describe("Whether the email format is valid"),
    mx_found: z.boolean().describe("Whether MX records were found for the domain"),
    smtp_check: z.boolean().describe("Whether SMTP check passed (deliverable)"),
    catch_all: z.boolean().describe(
      "Whether the domain is a catch-all (accepts all emails)"
    ),
    disposable: z.boolean().describe("Whether the email is from a disposable provider"),
    free: z.boolean().describe("Whether the email is from a free provider (Gmail, Yahoo, etc.)"),
    score: z.number().nullable().describe("Confidence score from MailboxLayer (0-1)"),
    domain: z.string().nullable().describe("Domain portion of the email"),
    error: z.string().nullable().describe("Error message when success is false"),
  }),
  
  execute: async ({ context }) => {
    if (!MAILBOXLAYER_API_KEY) {
      return {
        error: "Missing MAILBOXLAYER_API_KEY environment variable",
      };
    }

    try {
      const url = `https://apilayer.net/api/check?access_key=${encodeURIComponent(
        MAILBOXLAYER_API_KEY
      )}&email=${encodeURIComponent(context.email)}`;

      const resp = await fetch(url);
      if (!resp.ok) {
        return {
          success: false,
          error: `MailboxLayer HTTP error: ${resp.status} ${resp.statusText}`,
        };
      }

      const data = await resp.json();

      // Map MailboxLayer fields into our output shape
      return {
        success: true,
        email: data.email ?? context.email,
        did_you_mean: data.did_you_mean ?? null,
        format_valid: Boolean(data.format_valid),
        mx_found: Boolean(data.mx_found),
        smtp_check: Boolean(data.smtp_check),
        catch_all: Boolean(data.catch_all),
        disposable: Boolean(data.disposable),
        free: Boolean(data.free),
        score: typeof data.score === "number" ? data.score : null,
        domain: data.domain ?? null,
        error: null,
      };
    } catch (err: any) {
      return {
        success: false,
        email: context.email,
        did_you_mean: null,
        format_valid: false,
        mx_found: false,
        smtp_check: false,
        catch_all: false,
        disposable: false,
        free: false,
        score: null,
        domain: null,
        error: `Exception while contacting MailboxLayer: ${err.message ?? String(err)}`,
      };
    }
  },
});
