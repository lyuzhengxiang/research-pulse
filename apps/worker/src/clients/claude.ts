import Anthropic from '@anthropic-ai/sdk';
import { env } from '../env.js';

let _client: Anthropic | null = null;
function client(): Anthropic {
  if (!_client) _client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
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
  const msg = await client().messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 180,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Title: ${input.title}\n\nAbstract: ${input.abstract}`,
      },
    ],
  });
  const block = msg.content.find((b) => b.type === 'text');
  if (!block || block.type !== 'text') {
    throw new Error('Claude returned no text block');
  }
  return block.text.trim();
}
