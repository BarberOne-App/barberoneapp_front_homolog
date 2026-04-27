import { getToken } from "./authService";

const API_URL = 'https://barberoneapp-back-homolog.onrender.com';
const token = getToken();
const HOME_INFO_LOCAL_KEY = 'barberone_home_info_local';

function getAuthHeaders() {
  return {
    Authorization: `Bearer ${getToken() || token}`,
  };
}

function normalizeHiddenBookingPaymentMethods(value) {
  if (!Array.isArray(value)) return [];
  const normalized = value
    .map((item) => String(item || '').trim().toLowerCase())
    .flatMap((item) => {
      if (item === 'online') return ['cartao', 'pix'];
      return item;
    })
    .filter((item) => item === 'cartao' || item === 'pix' || item === 'local');

  return Array.from(new Set(normalized));
}

function normalizeHeroImages(value) {
  if (!Array.isArray(value)) return [];

  const sanitized = value
    .map((item) => String(item || '').trim())
    .filter(Boolean);

  return Array.from(new Set(sanitized));
}

function normalizePaymentFrequency(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'weekly' || normalized === 'semanal') return 'weekly';
  if (normalized === 'biweekly' || normalized === 'quinzenal') return 'biweekly';
  if (normalized === 'monthly' || normalized === 'mensal') return 'monthly';
  return 'monthly';
}

function getLocalHomeInfo() {
  try {
    const raw = localStorage.getItem(HOME_INFO_LOCAL_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;

    return {
      heroTitle: String(parsed.heroTitle || ''),
      heroSubtitle: String(parsed.heroSubtitle || ''),
      heroImage: String(parsed.heroImage || ''),
      heroImages: normalizeHeroImages(parsed.heroImages),
      barberPaymentFrequency: normalizePaymentFrequency(parsed.barberPaymentFrequency),
      employeePaymentFrequency: normalizePaymentFrequency(parsed.employeePaymentFrequency),
    };
  } catch {
    return null;
  }
}

function saveLocalHomeInfo(homeInfo) {
  try {
    const dataToPersist = {
      heroTitle: String(homeInfo?.heroTitle || ''),
      heroSubtitle: String(homeInfo?.heroSubtitle || ''),
      heroImage: String(homeInfo?.heroImage || ''),
      heroImages: normalizeHeroImages(homeInfo?.heroImages),
      barberPaymentFrequency: normalizePaymentFrequency(homeInfo?.barberPaymentFrequency),
      employeePaymentFrequency: normalizePaymentFrequency(homeInfo?.employeePaymentFrequency),
    };
    localStorage.setItem(HOME_INFO_LOCAL_KEY, JSON.stringify(dataToPersist));
  } catch {
    // sem bloqueio: cache local é apenas fallback
  }
}

export async function getPaymentVisibilitySettings() {
  try {
    const response = await fetch(`${API_URL}/settings`, {
      headers: getAuthHeaders(),
    });

    const settings = await response.json();

    return {
      hiddenBookingPaymentMethods: normalizeHiddenBookingPaymentMethods(
        settings?.hiddenBookingPaymentMethods,
      ),
    };
  } catch (error) {
    console.error('Erro ao buscar configuração de visibilidade de pagamentos:', error);
    return { hiddenBookingPaymentMethods: [] };
  }
}

export async function savePaymentVisibilitySettings(hiddenBookingPaymentMethods) {
  try {
    const response = await fetch(`${API_URL}/settings`, {
      method: 'PUT',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        hiddenBookingPaymentMethods: normalizeHiddenBookingPaymentMethods(
          hiddenBookingPaymentMethods,
        ),
      }),
    });

    if (!response.ok) {
      throw new Error(`Erro ao salvar configuração: ${response.status}`);
    }

    const settings = await response.json();
    return {
      hiddenBookingPaymentMethods: normalizeHiddenBookingPaymentMethods(
        settings?.hiddenBookingPaymentMethods,
      ),
    };
  } catch (error) {
    console.error('Erro ao salvar configuração de visibilidade de pagamentos:', error);
    throw error;
  }
}

export async function getPixKey() {
  try {
    const response = await fetch(`${API_URL}/settings`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const settings = await response.json();
    return settings.length > 0 ? settings[0].pixKey : '';
  } catch (error) {
    console.error('Erro ao buscar chave PIX:', error);
    return '';
  }
}


export async function savePixKey(pixKey) {
  try {
    const response = await fetch(`${API_URL}/settings`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const settings = await response.json();

    if (settings.length > 0) {

      await fetch(`${API_URL}/settings/${settings[0].id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pixKey }),
      });
    } else {

      await fetch(`${API_URL}/settings`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: 1, pixKey }),
      });
    }
  } catch (error) {
    console.error('Erro ao salvar chave PIX:', error);
    throw error;
  }
}


export async function getHomeInfo() {
  const localHomeInfo = getLocalHomeInfo();

  try {
    const response = await fetch(`${API_URL}/home-info`,
      {
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const homeInfoData = await response.json();

    if (homeInfoData && typeof homeInfoData === 'object') {
      const heroImages = normalizeHeroImages(homeInfoData.hero_images ?? homeInfoData.heroImages);
      const remoteHeroImage = homeInfoData.hero_image ?? homeInfoData.heroImage ?? '';
      const heroImage = remoteHeroImage || heroImages[0] || localHomeInfo?.heroImage || '';
      const effectiveHeroImages = heroImages.length ? heroImages : normalizeHeroImages(localHomeInfo?.heroImages);

      const mapped = {
        heroTitle: homeInfoData.hero_title ?? homeInfoData.heroTitle ?? localHomeInfo?.heroTitle ?? "",
        heroSubtitle: homeInfoData.hero_subtitle ?? homeInfoData.heroSubtitle ?? localHomeInfo?.heroSubtitle ?? "",
        heroImage,
        heroImages: effectiveHeroImages,
        barberPaymentFrequency: normalizePaymentFrequency(
          homeInfoData.barber_payment_frequency ??
            homeInfoData.barberPaymentFrequency ??
            localHomeInfo?.barberPaymentFrequency,
        ),
        employeePaymentFrequency: normalizePaymentFrequency(
          homeInfoData.employee_payment_frequency ??
            homeInfoData.employeePaymentFrequency ??
            localHomeInfo?.employeePaymentFrequency,
        ),
        aboutTitle: homeInfoData.about_title ?? homeInfoData.aboutTitle ?? "Barbearia Rodrigues",
        aboutText1: homeInfoData.about_text1 ?? homeInfoData.aboutText1 ?? "A Barbearia Rodrigues é referência em cortes masculinos há mais de 10 anos.",
        aboutText2: homeInfoData.about_text2 ?? homeInfoData.aboutText2 ?? "Combinamos técnicas tradicionais com tendências modernas para garantir o melhor atendimento.",
        aboutText3: homeInfoData.about_text3 ?? homeInfoData.aboutText3 ?? "Nosso ambiente proporciona conforto e uma experiência única.",
        scheduleTitle: homeInfoData.schedule_title ?? homeInfoData.scheduleTitle ?? "Horário de Funcionamento",
        scheduleLine1: homeInfoData.schedule_line1 ?? homeInfoData.scheduleLine1 ?? "Seg - 14h as 20h",
        scheduleLine2: homeInfoData.schedule_line2 ?? homeInfoData.scheduleLine2 ?? "Terça a Sab. - 09h as 20h",
        scheduleLine3: homeInfoData.schedule_line3 ?? homeInfoData.scheduleLine3 ?? "Domingo: Fechado",
        whatsappNumber: homeInfoData.whatsapp_number ?? homeInfoData.whatsappNumber ?? "",
        locationTitle: homeInfoData.location_title ?? homeInfoData.locationTitle ?? "Localização",
        locationAddress: homeInfoData.location_address ?? homeInfoData.locationAddress ?? "Av. val paraíso,1396",
        locationCity: homeInfoData.location_city ?? homeInfoData.locationCity ?? "Jangurussu - Fortaleza/CE",
      };

      saveLocalHomeInfo(mapped);
      return mapped;
    }

    return {
      heroTitle: localHomeInfo?.heroTitle ?? "",
      heroSubtitle: localHomeInfo?.heroSubtitle ?? "",
      heroImage: localHomeInfo?.heroImage ?? "",
      heroImages: localHomeInfo?.heroImages ?? [],
      barberPaymentFrequency: normalizePaymentFrequency(localHomeInfo?.barberPaymentFrequency),
      employeePaymentFrequency: normalizePaymentFrequency(localHomeInfo?.employeePaymentFrequency),
      aboutTitle: "Barbearia Rodrigues",
      aboutText1: "A Barbearia Rodrigues é referência em cortes masculinos há mais de 10 anos.",
      aboutText2: "Combinamos técnicas tradicionais com tendências modernas para garantir o melhor atendimento.",
      aboutText3: "Nosso ambiente proporciona conforto e uma experiência única.",
      scheduleTitle: "Horário de Funcionamento",
      scheduleLine1: "Seg - 14h as 20h",
      scheduleLine2: "Terça a Sab. - 09h as 20h",
      scheduleLine3: "Domingo: Fechado",
      whatsappNumber: "",
      locationTitle: "Localização",
      locationAddress: "Av. val paraíso,1396",
      locationCity: "Jangurussu - Fortaleza/CE"
    };
  } catch (error) {
    console.error('Erro ao buscar informações da home:', error);

    return {
      heroTitle: localHomeInfo?.heroTitle ?? "",
      heroSubtitle: localHomeInfo?.heroSubtitle ?? "",
      heroImage: localHomeInfo?.heroImage ?? "",
      heroImages: localHomeInfo?.heroImages ?? [],
      barberPaymentFrequency: normalizePaymentFrequency(localHomeInfo?.barberPaymentFrequency),
      employeePaymentFrequency: normalizePaymentFrequency(localHomeInfo?.employeePaymentFrequency),
      aboutTitle: "Barbearia Rodrigues",
      aboutText1: "A Barbearia Rodrigues é referência em cortes masculinos há mais de 10 anos.",
      aboutText2: "Combinamos técnicas tradicionais com tendências modernas para garantir o melhor atendimento.",
      aboutText3: "Nosso ambiente proporciona conforto e uma experiência única.",
      scheduleTitle: "Horário de Funcionamento",
      scheduleLine1: "Seg - 14h as 20h",
      scheduleLine2: "Terça a Sab. - 09h as 20h",
      scheduleLine3: "Domingo: Fechado",
      whatsappNumber: "",
      locationTitle: "Localização",
      locationAddress: "Av. val paraíso,1396",
      locationCity: "Jangurussu - Fortaleza/CE"
    };
  }
}


export async function saveHomeInfo(homeInfo) {
  try {
    const heroImages = normalizeHeroImages(homeInfo.heroImages);
    const nextHomeInfo = {
      ...homeInfo,
      heroImage: homeInfo.heroImage ?? heroImages[0] ?? '',
      heroImages,
      barberPaymentFrequency: normalizePaymentFrequency(homeInfo?.barberPaymentFrequency),
      employeePaymentFrequency: normalizePaymentFrequency(homeInfo?.employeePaymentFrequency),
    };

    const payload = {
      hero_title: nextHomeInfo.heroTitle ?? null,
      hero_subtitle: nextHomeInfo.heroSubtitle ?? null,
      hero_image: nextHomeInfo.heroImage ?? null,
      hero_images: heroImages,
      barber_payment_frequency: nextHomeInfo.barberPaymentFrequency,
      employee_payment_frequency: nextHomeInfo.employeePaymentFrequency,
      about_title: nextHomeInfo.aboutTitle ?? null,
      about_text1: nextHomeInfo.aboutText1 ?? null,
      about_text2: nextHomeInfo.aboutText2 ?? null,
      about_text3: nextHomeInfo.aboutText3 ?? null,
      schedule_title: nextHomeInfo.scheduleTitle ?? null,
      schedule_line1: nextHomeInfo.scheduleLine1 ?? null,
      schedule_line2: nextHomeInfo.scheduleLine2 ?? null,
      schedule_line3: nextHomeInfo.scheduleLine3 ?? null,
      whatsapp_number: nextHomeInfo.whatsappNumber ?? null,
      location_title: nextHomeInfo.locationTitle ?? null,
      location_address: nextHomeInfo.locationAddress ?? null,
      location_city: nextHomeInfo.locationCity ?? null,
      barberPaymentFrequency: nextHomeInfo.barberPaymentFrequency,
      employeePaymentFrequency: nextHomeInfo.employeePaymentFrequency,
    };

    saveLocalHomeInfo(nextHomeInfo);

    const response = await fetch(`${API_URL}/home-info`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Erro ao salvar: ${response.status}`);
    }

    const saved = await response.json().catch(() => null);

    return {
      ...nextHomeInfo,
      barberPaymentFrequency: normalizePaymentFrequency(
        saved?.barber_payment_frequency ??
          saved?.barberPaymentFrequency ??
          nextHomeInfo.barberPaymentFrequency,
      ),
      employeePaymentFrequency: normalizePaymentFrequency(
        saved?.employee_payment_frequency ??
          saved?.employeePaymentFrequency ??
          nextHomeInfo.employeePaymentFrequency,
      ),
    };
  } catch (error) {
    console.error('Erro ao salvar informações da home:', error);
    throw error;
  }
}
