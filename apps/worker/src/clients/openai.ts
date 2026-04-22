import OpenAI from 'openai';
import { env } from '../env.js';

let _client: OpenAI | null = null;
function client(): OpenAI {
  if (!_client) _client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  return _client;
}

const SYSTEM_PROMPT = `You are a research assistant that writes ultra-concise TLDRs of AI/ML papers.
Given a title and abstract, produce 2-3 sentences (max 60 words) that answer:
1. What's the core contribution?
2. How does it differ from prior work?
Tone: plain, factual, no hype, no "this paper". Start directly with the contribution.`;

export async function generateTldr(input: {
  title: string;
  abstract: string;
}): Promise<string> {
  const resp = await client().responses.create({
    model: 'gpt-5.4',
    instructions: SYSTEM_PROMPT,
    input: `Title: ${input.title}\n\nAbstract: ${input.abstract}`,
    max_output_tokens: 200,
  });

  const text = resp.output_text?.trim();
  if (!text) throw new Error('gpt-5.4 returned empty output_text');
  return text;
}
