export const BARBERSHOPS = [
  // { id: '001', name: 'Barbearia Rodrigues', slug: 'rodrigues' },
  // { id: '002', name: 'Barbearia Lucas',     slug: 'lucas'     },
  // { id: '003', name: 'Barbearia Abilton',   slug: 'abilton'   },
  { id: '004', name: 'Barbearia Rodrigues',  slug: 'barbeariarodrigues'  }
];

export const DEFAULT_BARBERSHOP = BARBERSHOPS[0];

export function getActiveBarbershop() {
  try {
    const stored = localStorage.getItem('activeBarbershop');
    if (stored) return JSON.parse(stored);
  } catch (_) {}
  return DEFAULT_BARBERSHOP;
}

export function setActiveBarbershop(barbershop) {
  localStorage.setItem('activeBarbershop', JSON.stringify(barbershop));
}