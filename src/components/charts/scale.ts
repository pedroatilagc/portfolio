/**
 * Matemática dos gráficos, rodando NO BUILD (no frontmatter dos componentes Astro).
 * Nada daqui vai para o navegador: o cliente recebe só o SVG já calculado.
 */

export type Formato = 'usd' | 'int' | 'tokens';
export type Serie = { id: string; nome: string; cor: string };
export type Dia = { dia: string; valores: Record<string, number> };

/* ---------- Escala "bonita" do eixo Y ----------
   Queremos 5 ticks (0 + 4 intervalos) em números redondos. Dividimos o máximo
   por 4 e arredondamos o passo PARA CIMA até o próximo valor "bonito"
   (1, 1.5, 2, 2.5, 3, 4, 5, 6, 7.5, 8 ou 10 × uma potência de 10). */
const BONITOS = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 7.5, 8, 10];

export function escalaY(maximo: number, intervalos = 4) {
  if (maximo <= 0) return { max: 1, ticks: [0, 0.25, 0.5, 0.75, 1], passo: 0.25 };
  const bruto = maximo / intervalos;
  const potencia = 10 ** Math.floor(Math.log10(bruto));
  const passo = (BONITOS.find((b) => b * potencia >= bruto - 1e-12) ?? 10) * potencia;
  const ticks = Array.from({ length: intervalos + 1 }, (_, i) => +(passo * i).toPrecision(12));
  return { max: passo * intervalos, ticks, passo };
}

/* ---------- Valor → pixel ----------
   Uma escala linear é só uma regra de três: o domínio [0, max] (dados) é
   mapeado no intervalo [altura, 0] (pixels). Invertido porque no SVG o y
   cresce para BAIXO: o valor 0 fica na base (y = altura) e o max no topo (y = 0). */
export function escalaLinear(max: number, altura: number) {
  return (v: number) => altura - (v / max) * altura;
}

/* ---------- Formatação ----------
   O painel da OpenRouter usa formato en-US ($0.51, 1.44K); mantemos o mesmo
   para o leitor reconhecer os números do dashboard. */
export function formatar(v: number, formato: Formato, opts: { eixo?: boolean; passo?: number } = {}): string {
  if (formato === 'usd') {
    if (v === 0) return '$0';
    if (opts.eixo && opts.passo) {
      // no eixo, todos os ticks usam as casas necessárias para escrever o passo (0.075 → 3)
      const passo = opts.passo;
      const casas = [2, 3, 4].find((c) => Math.abs(Math.round(passo * 10 ** c) - passo * 10 ** c) < 1e-6) ?? 4;
      return `$${v.toFixed(casas)}`;
    }
    return `$${v.toFixed(v >= 0.1 ? 3 : 4)}`;
  }
  if (formato === 'tokens') {
    if (v === 0) return '0';
    if (v >= 1e6) return `${+(v / 1e6).toFixed(2)}M`;
    return `${+(v / 1e3).toFixed(1)}K`;
  }
  return Math.round(v).toLocaleString('en-US');
}

/* ---------- Curva monotone (Fritsch–Carlson) ----------
   Uma curva suave que NUNCA passa acima/abaixo dos pontos vizinhos (sem
   "barrigas" que inventariam valores). Calcula uma tangente em cada ponto e
   desenha cúbicas de Bézier entre eles. Mesmo algoritmo do curveMonotoneX do d3. */
export function caminhoMonotone(pts: [number, number][]): string {
  const n = pts.length;
  if (n === 0) return '';
  if (n === 1) return `M${pts[0][0]},${pts[0][1]}`;
  const dx: number[] = [];
  const m: number[] = []; // inclinação de cada segmento
  for (let i = 0; i < n - 1; i++) {
    dx[i] = pts[i + 1][0] - pts[i][0];
    m[i] = (pts[i + 1][1] - pts[i][1]) / dx[i];
  }
  const t: number[] = new Array(n); // tangente em cada ponto
  t[0] = m[0];
  t[n - 1] = m[n - 2];
  for (let i = 1; i < n - 1; i++) {
    if (m[i - 1] * m[i] <= 0) t[i] = 0; // pico ou vale: tangente horizontal
    else {
      const w1 = 2 * dx[i] + dx[i - 1];
      const w2 = dx[i] + 2 * dx[i - 1];
      t[i] = (w1 + w2) / (w1 / m[i - 1] + w2 / m[i]);
    }
  }
  let d = `M${r(pts[0][0])},${r(pts[0][1])}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += `C${r(pts[i][0] + h)},${r(pts[i][1] + h * t[i])} ${r(pts[i + 1][0] - h)},${r(pts[i + 1][1] - h * t[i + 1])} ${r(pts[i + 1][0])},${r(pts[i + 1][1])}`;
  }
  return d;
}

export const r = (v: number) => Math.round(v * 100) / 100;
export const pct = (v: number, total: number) => `${r((v / total) * 100)}%`;
