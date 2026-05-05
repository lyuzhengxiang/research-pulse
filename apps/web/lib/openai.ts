import 'server-only';

const SYSTEM_PROMPT = `You are a research assistant that writes ultra-concise TLDRs of AI/ML papers.
Given a title and abstract, produce 2-3 sentences (max 60 words) that answer:
1. What's the core contribution?
2. How does it differ from prior work?
Tone: plain, factual, no hype, no "this paper". Start directly with the contribution.`;

export async function generateTldr(input: {
  title: string;
  abstract: string;
}): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY missing');

  const resp = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-5.4',
      instructions: SYSTEM_PROMPT,
      input: `Title: ${input.title}\n\nAbstract: ${input.abstract}`,
      max_output_tokens: 200,
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    throw new Error(`gpt-5.4 ${resp.status}: ${errText.slice(0, 200)}`);
  }

  type ResponsesPayload = {
    output_text?: string;
    output?: Array<{
      type?: string;
      content?: Array<{ type?: string; text?: string }>;
    }>;
    status?: string;
    incomplete_details?: { reason?: string };
  };
  const json = (await resp.json()) as ResponsesPayload;

  let text = json.output_text?.trim();
  if (!text) {
    const collected = (json.output ?? [])
      .filter((item) => item.type === 'message')
      .flatMap((item) => item.content ?? [])
      .filter((c) => c.type === 'output_text' && typeof c.text === 'string')
      .map((c) => c.text!)
      .join('')
      .trim();
    if (collected) text = collected;
  }

  if (!text) {
    const reason =
      json.incomplete_details?.reason ?? json.status ?? 'no output_text in response';
    throw new Error(`gpt-5.4 returned no text (${reason})`);
  }
  return text;
}
