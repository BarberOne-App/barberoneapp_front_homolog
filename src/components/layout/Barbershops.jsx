export const BARBERSHOPS = [
  { id: 'env', name: 'Barbearia Teste', slug: import.meta.env.VITE_BARBERSHOP_SLUG || 'barbearia-teste' },
  // { id: '002', name: 'Barbearia Lucas',     slug: 'lucas'     },
  // { id: '003', name: 'Barbearia Abilton',   slug: 'abilton'   },
];

export const DEFAULT_BARBERSHOP = BARBERSHOPS[0];

export function getActiveBarbershop() {
  try {
    const stored = localStorage.getItem('activeBarbershop');
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed;
    }
  } catch (_) {}
  return DEFAULT_BARBERSHOP;
}

export function setActiveBarbershop(barbershop) {
  localStorage.setItem('activeBarbershop', JSON.stringify(barbershop));
}
