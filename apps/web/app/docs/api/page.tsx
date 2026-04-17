import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { marked } from 'marked';
import type { Metadata } from 'next';
import './docs.css';

export const metadata: Metadata = {
  title: 'Endura Public API — Documentação',
  description: 'Referência completa da API pública do Endura. Autenticação via API Key, endpoints read-only.',
  robots: { index: true, follow: true },
};

// Revalida no maximo a cada 1 hora (docs raramente mudam em runtime).
export const revalidate = 3600;

// Memoize o HTML em module-scope para servir requests subsequentes sem re-parse
// ate proxima revalidacao.
let htmlCache: string | null = null;

async function loadMarkdown(): Promise<string> {
  // No dev, cwd = apps/web. Em Render build, cwd = apps/web (cd apps/web && next start).
  // Tentamos varios caminhos para resistir a diferentes layouts de deploy.
  const candidates = [
    resolve(process.cwd(), '../../docs/public-api.md'),
    resolve(process.cwd(), '../docs/public-api.md'),
    resolve(process.cwd(), 'docs/public-api.md'),
  ];
  for (const path of candidates) {
    try {
      return await readFile(path, 'utf-8');
    } catch {
      // tenta proximo
    }
  }
  throw new Error('docs/public-api.md nao encontrado');
}

export default async function ApiDocsPage() {
  if (!htmlCache) {
    const md = await loadMarkdown();
    htmlCache = (await marked.parse(md, { gfm: true, breaks: false })) as string;
  }
  const html = htmlCache;

  return (
    <div className="docs-root">
      <div className="docs-topbar">
        <a href="/" className="docs-brand">Endura</a>
        <span className="docs-badge">Public API v1</span>
      </div>
      <article className="docs-content" dangerouslySetInnerHTML={{ __html: html }} />
      <footer className="docs-footer">
        <span>Endura Public API — © {new Date().getFullYear()}</span>
      </footer>
    </div>
  );
}
