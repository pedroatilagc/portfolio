// Datas do frontmatter viram Date em UTC (meia-noite). Formatamos em UTC para não
// "voltar um dia" no fuso de Fortaleza (UTC-3).
import { INTL_LOCALE, type Lang } from '../i18n';

export function formatarData(data: Date, lang: Lang = 'pt'): string {
  return new Intl.DateTimeFormat(INTL_LOCALE[lang], {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
    .format(data)
    .replace(/\./g, '')
    .replace(' de ', ' ');
}
