import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { marked } from 'marked';
import type { Metadata } from 'next';
import '../api/docs.css';

export const metadata: Metadata = {
  title: 'Endura — Manual para Agentes IA / LLM',
  description: 'Manual de operacao do Endura para agentes LLM: glossario de dominio, conceitos do modelo de dados, fluxos canonicos e regras invariantes.',
  robots: { index: true, follow: true },
};

export const revalidate = 3600;

let htmlCache: string | null = null;

async function loadMarkdown(): Promise<string> {
  const candidates = [
    resolve(process.cwd(), '../../docs/llm-manual.md'),
    resolve(process.cwd(), '../docs/llm-manual.md'),
    resolve(process.cwd(), 'docs/llm-manual.md'),
  ];
  for (const path of candidates) {
    try {
      return await readFile(path, 'utf-8');
    } catch {
      // tenta proximo
    }
  }
  throw new Error('docs/llm-manual.md nao encontrado');
}

export default async function LlmManualPage() {
  if (!htmlCache) {
    const md = await loadMarkdown();
    htmlCache = (await marked.parse(md, { gfm: true, breaks: false })) as string;
  }
  const html = htmlCache;

  return (
    <div className="docs-root">
      <div className="docs-topbar">
        <a href="/" className="docs-brand">Endura</a>
        <span className="docs-badge">LLM Manual</span>
      </div>
      <article className="docs-content" dangerouslySetInnerHTML={{ __html: html }} />
      <footer className="docs-footer">
        <span>Endura — Manual para Agentes IA — © {new Date().getFullYear()}</span>
      </footer>
    </div>
  );
}
