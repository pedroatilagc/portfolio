// Datas do frontmatter viram Date em UTC (meia-noite). Formatamos em UTC para não
// "voltar um dia" no fuso de Fortaleza (UTC-3).
export function formatarData(data: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
    .format(data)
    .replace(/\./g, '')
    .replace(' de ', ' ');
}
