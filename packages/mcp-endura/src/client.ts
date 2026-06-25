// Cliente REST fino para a API pública do Endura (/api/v1/public/*).
// Autentica via X-API-Key. Desembrulha o envelope { data } e converte
// erros { code, message, status } em EnduraError.

export interface EnduraClientOptions {
  baseUrl: string;
  apiKey: string;
}

export class EnduraError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'EnduraError';
    this.status = status;
    this.code = code;
  }
}

type Query = Record<string, unknown> | undefined;

export class EnduraClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(opts: EnduraClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/+$/, '');
    this.apiKey = opts.apiKey;
  }

  private async request(
    method: string,
    path: string,
    opts: { query?: Query; body?: unknown } = {},
  ): Promise<unknown> {
    const url = new URL(this.baseUrl + path);
    if (opts.query) {
      for (const [k, v] of Object.entries(opts.query)) {
        if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
      }
    }

    const headers: Record<string, string> = { 'X-API-Key': this.apiKey, Accept: 'application/json' };
    let bodyStr: string | undefined;
    if (opts.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      bodyStr = JSON.stringify(opts.body);
    }

    const res = await fetch(url, { method, headers, body: bodyStr });
    const text = await res.text();
    let parsed: unknown = null;
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = text;
      }
    }

    if (!res.ok) {
      const obj = (parsed ?? {}) as { code?: string; message?: string };
      throw new EnduraError(res.status, obj.code ?? 'ERR_HTTP', obj.message ?? res.statusText);
    }

    // Sucesso: API responde { data: ... }. 204 (delete) vem vazio.
    if (parsed && typeof parsed === 'object' && 'data' in parsed) {
      return (parsed as { data: unknown }).data;
    }
    return parsed ?? { ok: true };
  }

  get(path: string, query?: Query): Promise<unknown> {
    return this.request('GET', path, { query });
  }
  post(path: string, body?: unknown): Promise<unknown> {
    return this.request('POST', path, { body });
  }
  put(path: string, body?: unknown): Promise<unknown> {
    return this.request('PUT', path, { body });
  }
  patch(path: string, body?: unknown): Promise<unknown> {
    return this.request('PATCH', path, { body });
  }
  del(path: string): Promise<unknown> {
    return this.request('DELETE', path);
  }
}
