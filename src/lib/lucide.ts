/*
  Ícones de traço do Lucide (https://lucide.dev), licença ISC (Lucide Contributors).
  Guardamos só o conteúdo interno do <svg> (viewBox 0 0 24 24). Quem renderiza
  aplica fill="none" stroke="currentColor" stroke-width="2".
  Tudo é string estática: entra no HTML no build, sem JS no cliente.
*/
export const LUCIDE = {
  mapPin:
    '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
  mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.967 5.7a1.94 1.94 0 0 1-2.066 0L2 7"/>',
  gitCommit:
    '<circle cx="12" cy="12" r="3"/><line x1="3" x2="9" y1="12" y2="12"/><line x1="15" x2="21" y1="12" y2="12"/>',
  gitPullRequest:
    '<circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v7"/><line x1="6" x2="6" y1="9" y2="21"/>',
  gitMerge: '<circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M6 21V9a9 9 0 0 0 9 9"/>',
  folderPlus:
    '<path d="M12 10v6"/><path d="M9 13h6"/><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
} as const;

export type LucideName = keyof typeof LUCIDE;

/** Conteúdo interno de um SVG local (src/assets/icons), sem comentários nem o <svg> externo. */
export function innerSvg(raw: string): string {
  const m = raw.replace(/<!--[\s\S]*?-->/g, '').match(/<svg[^>]*>([\s\S]*)<\/svg>/);
  if (!m) throw new Error('SVG inválido');
  return m[1].trim();
}
