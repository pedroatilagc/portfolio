/*
  Dados do GitHub buscados NO BUILD (frontmatter da home), nunca no navegador.

  - Calendário de contribuições: só existe na API GraphQL, e a GraphQL do GitHub
    exige autenticação mesmo para dados públicos → precisa de GITHUB_TOKEN.
  - Atividade recente: REST /users/:user/events/public (o token só aumenta o
    limite de requisições).

  O token é lido de import.meta.env.GITHUB_TOKEN. Este módulo só roda no
  servidor/build: nada daqui é empacotado para o cliente. O token nunca é logado.

  Fallback: sem token ou com erro na API, o build NÃO quebra. Usa o último
  snapshot em src/data/github-snapshot.json; se não houver, retorna null e a
  seção some. A cada busca bem-sucedida fora de CI, o snapshot é regravado.
*/
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export const GITHUB_USER = 'pedroatilagc';

export type Level = 0 | 1 | 2 | 3 | 4;

export interface ContributionDay {
  date: string; // AAAA-MM-DD
  count: number;
  level: Level;
  weekday: number; // 0 = domingo
}

export type ActivityKind = 'push' | 'pr-open' | 'pr-merge' | 'repo';

export interface Activity {
  kind: ActivityKind;
  /** Nome curto do repositório (sem o dono, se for do próprio usuário). A frase é montada no idioma da página. */
  repo: string;
  url: string;
  date: string; // ISO
}

export interface GitHubData {
  total: number;
  weeks: ContributionDay[][];
  activity: Activity[];
  fetchedAt: string; // ISO
}

// process.cwd() e não import.meta.url: no build, este arquivo é empacotado em dist/,
// e o caminho relativo deixaria de apontar para src/.
const SNAPSHOT = join(process.cwd(), 'src', 'data', 'github-snapshot.json');

const LEVELS: Record<string, Level> = {
  NONE: 0,
  FIRST_QUARTILE: 1,
  SECOND_QUARTILE: 2,
  THIRD_QUARTILE: 3,
  FOURTH_QUARTILE: 4,
};

const QUERY = `query($login: String!) {
  user(login: $login) {
    contributionsCollection {
      contributionCalendar {
        totalContributions
        weeks { contributionDays { date contributionCount contributionLevel weekday } }
      }
    }
  }
}`;

const warn = (msg: string) => console.warn(`\x1b[33m[github]\x1b[0m ${msg}`);

function headers(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'portfolio-build',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

async function fetchCalendar(token: string) {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { ...headers(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: QUERY, variables: { login: GITHUB_USER } }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`GraphQL respondeu HTTP ${res.status}`);
  const json = await res.json();
  if (json.errors?.length) throw new Error(`GraphQL: ${json.errors[0].message}`);
  const cal = json.data?.user?.contributionsCollection?.contributionCalendar;
  if (!cal) throw new Error('GraphQL sem contributionCalendar');

  const weeks: ContributionDay[][] = cal.weeks.map((w: { contributionDays: any[] }) =>
    w.contributionDays.map((d) => ({
      date: d.date,
      count: d.contributionCount,
      level: LEVELS[d.contributionLevel] ?? 0,
      weekday: d.weekday,
    })),
  );
  return { total: cal.totalContributions as number, weeks };
}

const shortRepo = (full: string) => full.replace(`${GITHUB_USER}/`, '');

/** Nome do repositório de uma atividade. Snapshots antigos não têm `repo`: deriva da URL. */
export function activityRepo(a: Activity): string {
  if (a.repo) return a.repo;
  const full = a.url.replace('https://github.com/', '').split('/').slice(0, 2).join('/');
  return shortRepo(full);
}

/** Converte um evento da API num item de atividade (ou null, se não for push/PR/repo). */
function toActivity(e: any): Activity | null {
  const repo: string = e.repo?.name ?? '';
  const repoUrl = `https://github.com/${repo}`;
  const name = shortRepo(repo);
  switch (e.type) {
    case 'PushEvent':
      return { kind: 'push', repo: name, url: repoUrl, date: e.created_at };
    case 'PullRequestEvent': {
      const pr = e.payload?.pull_request;
      const url = pr?.html_url ?? `${repoUrl}/pulls`;
      const merged = e.payload?.action === 'merged' || (e.payload?.action === 'closed' && pr?.merged);
      if (merged) return { kind: 'pr-merge', repo: name, url, date: e.created_at };
      if (e.payload?.action === 'opened') return { kind: 'pr-open', repo: name, url, date: e.created_at };
      return null;
    }
    case 'CreateEvent':
      return e.payload?.ref_type === 'repository'
        ? { kind: 'repo', repo: name, url: repoUrl, date: e.created_at }
        : null;
    default:
      return null;
  }
}

async function fetchActivity(token: string): Promise<Activity[]> {
  const res = await fetch(`https://api.github.com/users/${GITHUB_USER}/events/public?per_page=30`, {
    headers: headers(token),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`events/public respondeu HTTP ${res.status}`);
  const events: any[] = await res.json();
  events.sort((a, b) => b.created_at.localeCompare(a.created_at));

  // Vários pushes seguidos no mesmo repo viram um item só: a lista mostra 4 coisas diferentes.
  const seen = new Set<string>();
  const out: Activity[] = [];
  for (const e of events) {
    const a = toActivity(e);
    if (!a) continue;
    const key = `${a.kind}:${a.repo}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(a);
    if (out.length === 4) break;
  }
  return out;
}

async function readSnapshot(): Promise<GitHubData | null> {
  try {
    return JSON.parse(await readFile(SNAPSHOT, 'utf8')) as GitHubData;
  } catch {
    return null;
  }
}

async function load(): Promise<GitHubData | null> {
  const token = import.meta.env.GITHUB_TOKEN;
  try {
    if (!token) throw new Error('GITHUB_TOKEN não definido');
    const [cal, activity] = await Promise.all([fetchCalendar(token), fetchActivity(token)]);
    const data: GitHubData = { ...cal, activity, fetchedAt: new Date().toISOString() };
    // Em CI/Vercel o arquivo seria descartado; só grava na máquina local (dev ou build).
    if (!process.env.CI && !process.env.VERCEL) {
      await writeFile(SNAPSHOT, JSON.stringify(data, null, 2) + '\n').catch(() => {});
    }
    return data;
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'erro desconhecido';
    const snap = await readSnapshot();
    warn(
      snap
        ? `${reason}. Usando o snapshot de ${snap.fetchedAt.slice(0, 10)} (src/data/github-snapshot.json).`
        : `${reason}. Sem snapshot salvo: a seção "Atividade no GitHub" não será exibida.`,
    );
    return snap;
  }
}

// Uma busca por build, mesmo que mais de uma página importe isto.
let cached: Promise<GitHubData | null> | undefined;
export function getGitHubData(): Promise<GitHubData | null> {
  return (cached ??= load());
}
