import Anthropic from '@anthropic-ai/sdk';

// ── IDs dos modelos Claude ──────────────────────────────────────
export const CLAUDE_MODELS = {
  SONNET: 'claude-sonnet-4-5-20250514',
  HAIKU: 'claude-haiku-4-5-20251001',
} as const;

// ── Cliente Anthropic ───────────────────────────────────────────

const apiKey = process.env.ANTHROPIC_API_KEY;

export const claudeClient = apiKey ? new Anthropic({ apiKey }) : null;

function getClient(): Anthropic {
  if (!claudeClient) {
    throw {
      code: 'ERR_AI_NOT_CONFIGURED',
      message: 'ANTHROPIC_API_KEY nao configurada. Funcionalidades de IA indisponiveis.',
      status: 503,
    };
  }
  return claudeClient;
}

// ── Helper para gerar JSON estruturado ──────────────────────────

interface GenerateStructuredJSONParams {
  model: string;
  system: string;
  prompt: string;
  maxTokens: number;
}

/**
 * Chama a API do Claude e parseia a resposta como JSON.
 * Faz 1 retry em caso de falha no parse.
 */
export async function generateStructuredJSON<T>(
  params: GenerateStructuredJSONParams,
): Promise<T> {
  const { model, system, prompt, maxTokens } = params;

  let lastError: Error | null = null;

  // Tenta ate 2 vezes (1 tentativa + 1 retry)
  for (let attempt = 0; attempt < 2; attempt++) {
    const client = getClient();
    const response = await client.messages.create({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: prompt }],
    });

    // Extrai texto da resposta
    const textBlock = response.content.find((block) => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      lastError = new Error('Resposta do Claude nao contem texto');
      continue;
    }

    const rawText = textBlock.text;

    try {
      // Tenta extrair JSON de blocos de codigo markdown ou texto puro
      const jsonString = extractJSON(rawText);
      const parsed = JSON.parse(jsonString) as T;
      return parsed;
    } catch (parseErr) {
      lastError = new Error(
        `Falha ao parsear JSON da resposta do Claude (tentativa ${attempt + 1}): ${
          parseErr instanceof Error ? parseErr.message : String(parseErr)
        }`,
      );
    }
  }

  throw {
    code: 'ERR_AI_PARSE_FAILED',
    message: lastError?.message ?? 'Falha ao gerar JSON estruturado via Claude',
    status: 502,
  };
}

/**
 * Extrai conteudo JSON de uma string que pode conter blocos de codigo markdown.
 * Aceita tanto ```json ... ``` quanto JSON puro.
 */
function extractJSON(text: string): string {
  // Tenta extrair de bloco de codigo markdown
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch?.[1]) {
    return codeBlockMatch[1].trim();
  }

  // Tenta encontrar JSON puro (objeto ou array)
  const jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (jsonMatch?.[1]) {
    return jsonMatch[1].trim();
  }

  // Retorna o texto original para tentar o parse
  return text.trim();
}
