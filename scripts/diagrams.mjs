// Renderiza cada src/diagrams/*.mmd em um .svg ao lado, com o tema do site.
// Rode com `npm run diagrams` sempre que editar um diagrama, e versione o .svg.
// (Fica fora do `npm run build` de propósito: o Mermaid precisa de um Chromium
// headless, que é pesado e instável no ambiente de build da Vercel.)
import { readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const dir = 'src/diagrams';
const mmdc = join('node_modules', '.bin', process.platform === 'win32' ? 'mmdc.cmd' : 'mmdc');

for (const file of readdirSync(dir).filter((f) => f.endsWith('.mmd'))) {
  const input = join(dir, file);
  const output = input.replace(/\.mmd$/, '.svg');
  execFileSync(
    mmdc,
    ['-i', input, '-o', output, '-c', join(dir, 'mermaid.config.json'), '-b', 'transparent', '-q'],
    { stdio: 'inherit', shell: process.platform === 'win32' },
  );
  console.log(`✓ ${output}`);
}
