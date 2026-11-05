/*
  Dados da faixa de stack (StackMarquee). Para adicionar uma tecnologia, acrescente
  um item aqui: nome, ícone e cor de hover.

  - Os ícones vêm do pacote `simple-icons` e são lidos NO BUILD: só o `path` do SVG
    vai parar no HTML. Nada é buscado em runtime.
  - Ícones que não existem na versão instalada ficam em src/assets/icons/ (origem e
    licença comentadas em cada arquivo) e entram via `?raw`, também no build.
  - `brandHex` é a cor do hover. Por padrão é o `hex` oficial do Simple Icons. Marcas
    escuras demais para o fundo #191919 (contraste < 3:1, critério WCAG 1.4.11 para
    elementos gráficos) usam uma variante clareada da mesma matiz em OKLCH.
*/
import {
  siDjango,
  siFastapi,
  siLangchain,
  siPandas,
  siPostgresql,
  siPydantic,
  siPython,
  siRailway,
  siReact,
} from 'simple-icons';
import openaiRaw from '../assets/icons/openai.svg?raw';
import playwrightRaw from '../assets/icons/playwright.svg?raw';
import databaseRaw from '../assets/icons/database.svg?raw';

export interface StackIcon {
  /** Conteúdo interno do <svg> (paths), viewBox 0 0 24 24. */
  body: string;
  /** 'fill' para logos sólidos (Simple Icons); 'stroke' para ícones de traço (Lucide). */
  paint: 'fill' | 'stroke';
}

export interface StackItem {
  name: string;
  icon: StackIcon;
  /** Cor aplicada ao ícone no hover/focus, com '#'. */
  brandHex: string;
}

const fromSimpleIcon = (icon: { path: string }): StackIcon => ({
  body: `<path d="${icon.path}"/>`,
  paint: 'fill',
});

/** Remove comentários e o <svg> externo de um arquivo local, deixando só o conteúdo. */
const fromRawSvg = (raw: string, paint: StackIcon['paint'] = 'fill'): StackIcon => {
  const inner = raw.replace(/<!--[\s\S]*?-->/g, '').match(/<svg[^>]*>([\s\S]*)<\/svg>/);
  if (!inner) throw new Error('SVG inválido em src/assets/icons');
  return { body: inner[1].trim(), paint };
};

export const STACK: StackItem[] = [
  { name: 'Python', icon: fromSimpleIcon(siPython), brandHex: `#${siPython.hex}` },
  { name: 'FastAPI', icon: fromSimpleIcon(siFastapi), brandHex: `#${siFastapi.hex}` },
  // #092E20 dá 1,19:1 sobre #191919 → clareado na mesma matiz.
  { name: 'Django', icon: fromSimpleIcon(siDjango), brandHex: '#4D7160' },
  // #150458 dá 1,00:1 → clareado na mesma matiz.
  { name: 'pandas', icon: fromSimpleIcon(siPandas), brandHex: '#5B62B8' },
  { name: 'React', icon: fromSimpleIcon(siReact), brandHex: `#${siReact.hex}` },
  // Um só ícone (PostgreSQL); o Supabase roda sobre ele.
  { name: 'PostgreSQL / Supabase', icon: fromSimpleIcon(siPostgresql), brandHex: `#${siPostgresql.hex}` },
  // #0B0D0E é praticamente preto neutro (1,11:1) → branco.
  { name: 'Railway', icon: fromSimpleIcon(siRailway), brandHex: '#FFFFFF' },
  // #412991 dá 1,63:1 → clareado na mesma matiz. Ícone local (fora do simple-icons atual).
  { name: 'OpenAI', icon: fromRawSvg(openaiRaw), brandHex: '#6959C4' },
  { name: 'LangChain', icon: fromSimpleIcon(siLangchain), brandHex: `#${siLangchain.hex}` },
  // Ícone local (fora do simple-icons atual). #2EAD33 dá 5,98:1.
  { name: 'Playwright', icon: fromRawSvg(playwrightRaw), brandHex: '#2EAD33' },
  // Sem marca oficial: ícone genérico de banco (Lucide).
  { name: 'SQL', icon: fromRawSvg(databaseRaw, 'stroke'), brandHex: '#4479A1' },
  { name: 'Pydantic', icon: fromSimpleIcon(siPydantic), brandHex: `#${siPydantic.hex}` },
];
