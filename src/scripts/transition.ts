import type { TransitionDirectionalAnimations } from 'astro';

// Animação da troca de página: a página antiga sai rápido (200ms) e a nova entra
// subindo 10px em 300ms com o expo. Só transform/opacity → roda no compositor.
const out = {
  name: 'vt-fade-out',
  duration: '0.2s',
  easing: 'cubic-bezier(0.33, 1, 0.68, 1)',
  fillMode: 'both',
};
const inn = {
  name: 'vt-fade-in',
  duration: '0.3s',
  easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
  fillMode: 'both',
};

export const pageTransition: TransitionDirectionalAnimations = {
  forwards: { old: out, new: inn },
  backwards: { old: out, new: inn },
};
