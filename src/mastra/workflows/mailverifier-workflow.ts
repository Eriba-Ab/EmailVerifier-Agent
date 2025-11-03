import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";

/**
 * 🧩 Step 1 — Fetch Email Verification Data
 * Uses the MailboxLayer API to check email validity, deliverability, and more.
 */
const fetchEmailVerification = createStep({
  id: "fetch-email-verification",
  description: "Fetches email verification data from the MailboxLayer API",
  inputSchema: z.object({
    email: z.string().email().describe("The email address to verify"),
  }),
  outputSchema: z.object({
    email: z.string(),
    format_valid: z.boolean(),
    smtp_check: z.boolean(),
    mx_found: z.boolean(),
    disposable: z.boolean(),
    free: z.boolean(),
    score: z.number(),
    did_you_mean: z.string().nullable(),
  }),
  execute: async ({ inputData }) => {
    if (!inputData) throw new Error("Input data not found");

    const { email } = inputData;
    const API_KEY = process.env.MAILBOXLAYER_API_KEY;
    if (!API_KEY) throw new Error("Missing MailboxLayer API key");

    const url = `https://apilayer.net/api/check?access_key=${API_KEY}&email=${encodeURIComponent(
      email
    )}&smtp=1&format=1`;

    const response = await fetch(url);
    const data = await response.json();

    if (!data || typeof data !== "object") {
      throw new Error("Invalid response from MailboxLayer API");
    }

    return {
      email,
      format_valid: data.format_valid,
      smtp_check: data.smtp_check,
      mx_found: data.mx_found,
      disposable: data.disposable,
      free: data.free,
      score: data.score ?? 0,
      did_you_mean: data.did_you_mean || null,
    };
  },
});

/**
 * 🧠 Step 2 — Analyze Verification Result
 * Uses the Mail Verifier Agent (Gemini) to generate a clear, human-readable summary.
 */
const analyzeVerification = createStep({
  id: "analyze-verification",
  description: "Analyzes and explains the email verification results using the Mail Verifier Agent",
  inputSchema: z.object({
    email: z.string(),
    format_valid: z.boolean(),
    smtp_check: z.boolean(),
    mx_found: z.boolean(),
    disposable: z.boolean(),
    free: z.boolean(),
    score: z.number(),
    did_you_mean: z.string().nullable(),
  }),
  outputSchema: z.object({
    summary: z.string(),
  }),
  execute: async ({ inputData, mastra }) => {
    if (!inputData) throw new Error("Verification data not found");

    const agent = mastra?.getAgent("mail-verifier-agent");
    if (!agent) throw new Error("Mail Verifier Agent not found");

    const prompt = `
You are an AI Email Verification Analyst. Based on the following verification data, 
provide a concise, user-friendly summary explaining the email’s authenticity and deliverability.

Email verification data:
${JSON.stringify(inputData, null, 2)}

Please summarize your findings using this structure:

📧 **Email Address:** [email]

✅ **Verification Summary**
- Format Valid: [Yes/No]
- SMTP Check: [Passed/Failed]
- MX Records Found: [Yes/No]
- Disposable: [Yes/No]
- Free Provider: [Yes/No]
- Overall Confidence Score: [numeric value or rating out of 10]

💡 **Interpretation**
Explain in plain terms whether this email is likely valid, risky, or undeliverable, 
and include a recommendation (e.g., "Safe to use", "Check with caution", "Invalid email").

🛠️ **Suggestions**
- If invalid: recommend corrections (e.g., did_you_mean)
- If disposable: warn about temporary address use
- If score is low: advise re-checking or alternative contact
`;

    const stream = await agent.stream([
      { role: "user", content: prompt },
    ]);

    let summaryText = "";
    for await (const chunk of stream.textStream) {
      process.stdout.write(chunk);
      summaryText += chunk;
    }

    return { summary: summaryText };
  },
});

/**
 * ⚙️ Mail Verifier Workflow
 * Chain the steps together: fetch → analyze → summarize.
 */
const mailVerifierWorkflow = createWorkflow({
  id: "mail-verifier-workflow",
  inputSchema: z.object({
    email: z.string().email(),
  }),
  outputSchema: z.object({
    summary: z.string(),
  }),
})
  .then(fetchEmailVerification)
  .then(analyzeVerification);

mailVerifierWorkflow.commit();

export { mailVerifierWorkflow };
