import { z } from "zod";
import { createToolCallAccuracyScorerCode } from "@mastra/evals/scorers/code";
import { createCompletenessScorer } from "@mastra/evals/scorers/code";
import { createScorer } from "@mastra/core/scores";

/**
 * ✅ Tool Call Appropriateness Scorer
 * Ensures the MailboxLayer tool is called correctly when verifying emails.
 */
export const mailtoolCallAppropriatenessScorer = createToolCallAccuracyScorerCode({
  expectedTool: "mailboxlayerTool",
  strictMode: false,
});

/**
 * ✅ Completeness Scorer
 * Checks that the response contains all expected verification fields
 * (e.g., format_valid, smtp_check, score, etc.)
 */
export const mailcompletenessScorer = createCompletenessScorer();

/**
 * ✅ Custom LLM-judged scorer:
 * Evaluates if the assistant’s verification explanation matches the API’s actual findings.
 * For example, if the email is disposable or invalid, does the agent explain why?
 */
export const mailexplanationAccuracyScorer = createScorer({
  name: "Explanation Accuracy",
  description:
    "Evaluates whether the assistant accurately explains email verification results (validity, disposability, deliverability, and syntax correctness).",
  type: "agent",
  judge: {
    model: "google/gemini-2.5-pro",
    instructions: `
      You are an expert evaluator of email verification explanations.
      Given the user's request and the assistant's response, determine if the explanation
      correctly reflects the email verification results.

      Focus on:
      - Whether the assistant correctly identifies if the email is valid or invalid.
      - Whether it correctly notes if the email is disposable or from a free provider.
      - Whether the assistant avoids contradictions or hallucinations.

      Return JSON strictly matching the provided schema.
    `,
  },
})
  .preprocess(({ run }) => {
    const userText =
      (run.input?.inputMessages?.[0]?.content as string) || "";
    const assistantText =
      (run.output?.[0]?.content as string) || "";
    return { userText, assistantText };
  })
  .analyze({
    description:
      "Compare user intent and assistant response for factual consistency in email verification results.",
    outputSchema: z.object({
      accurate: z.boolean(),
      confidence: z.number().min(0).max(1).default(1),
      explanation: z.string().default(""),
    }),
    createPrompt: ({ results }) => `
      You are evaluating the accuracy of an email verification explanation.
      User text:
      """
      ${results.preprocessStepResult.userText}
      """
      Assistant response:
      """
      ${results.preprocessStepResult.assistantText}
      """

      Tasks:
      1. Check if the assistant correctly reports whether the email is valid, deliverable, or disposable.
      2. Verify that it does not include contradictory or fabricated information.
      3. Be forgiving about stylistic differences — focus on factual accuracy.

      Return JSON with fields:
      {
        "accurate": boolean,
        "confidence": number, // 0-1
        "explanation": string
      }
    `,
  })
  .generateScore(({ results }) => {
    const r = (results as any)?.analyzeStepResult || {};
    if (r.accurate)
      return Math.max(0, Math.min(1, 0.7 + 0.3 * (r.confidence ?? 1)));
    return 0;
  })
  .generateReason(({ results, score }) => {
    const r = (results as any)?.analyzeStepResult || {};
    return `Explanation scoring: accurate=${r.accurate ?? false}, confidence=${r.confidence ?? 0}. Score=${score}. ${r.explanation ?? ""}`;
  });

/**
 * ✅ Export all scorers
 */
export const scorers = {
  mailtoolCallAppropriatenessScorer,
  mailcompletenessScorer,
  mailexplanationAccuracyScorer,
};
