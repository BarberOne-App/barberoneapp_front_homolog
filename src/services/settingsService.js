import { getToken } from "./authService";

const API_URL = 'https://barberone-backend.onrender.com';
const token = getToken();

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
  try {
    const response = await fetch(`${API_URL}/home-info`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const homeInfoData = await response.json();

    if (homeInfoData && typeof homeInfoData === 'object') {
      return {
        heroTitle: homeInfoData.hero_title ?? homeInfoData.heroTitle ?? "",
        heroSubtitle: homeInfoData.hero_subtitle ?? homeInfoData.heroSubtitle ?? "",
        heroImage: homeInfoData.hero_image ?? homeInfoData.heroImage ?? "",
        aboutTitle: homeInfoData.about_title ?? homeInfoData.aboutTitle ?? "Barbearia Rodrigues",
        aboutText1: homeInfoData.about_text1 ?? homeInfoData.aboutText1 ?? "A Barbearia Rodrigues é referência em cortes masculinos há mais de 10 anos.",
        aboutText2: homeInfoData.about_text2 ?? homeInfoData.aboutText2 ?? "Combinamos técnicas tradicionais com tendências modernas para garantir o melhor atendimento.",
        aboutText3: homeInfoData.about_text3 ?? homeInfoData.aboutText3 ?? "Nosso ambiente proporciona conforto e uma experiência única.",
        scheduleTitle: homeInfoData.schedule_title ?? homeInfoData.scheduleTitle ?? "Horário de Funcionamento",
        scheduleLine1: homeInfoData.schedule_line1 ?? homeInfoData.scheduleLine1 ?? "Seg - 14h as 20h",
        scheduleLine2: homeInfoData.schedule_line2 ?? homeInfoData.scheduleLine2 ?? "Terça a Sab. - 09h as 20h",
        scheduleLine3: homeInfoData.schedule_line3 ?? homeInfoData.scheduleLine3 ?? "Domingo: Fechado",
        locationTitle: homeInfoData.location_title ?? homeInfoData.locationTitle ?? "Localização",
        locationAddress: homeInfoData.location_address ?? homeInfoData.locationAddress ?? "Av. val paraíso,1396",
        locationCity: homeInfoData.location_city ?? homeInfoData.locationCity ?? "Jangurussu - Fortaleza/CE",
      };
    }

    return {
      heroTitle: "",
      heroSubtitle: "",
      heroImage: "",
      aboutTitle: "Barbearia Rodrigues",
      aboutText1: "A Barbearia Rodrigues é referência em cortes masculinos há mais de 10 anos.",
      aboutText2: "Combinamos técnicas tradicionais com tendências modernas para garantir o melhor atendimento.",
      aboutText3: "Nosso ambiente proporciona conforto e uma experiência única.",
      scheduleTitle: "Horário de Funcionamento",
      scheduleLine1: "Seg - 14h as 20h",
      scheduleLine2: "Terça a Sab. - 09h as 20h",
      scheduleLine3: "Domingo: Fechado",
      locationTitle: "Localização",
      locationAddress: "Av. val paraíso,1396",
      locationCity: "Jangurussu - Fortaleza/CE"
    };
  } catch (error) {
    console.error('Erro ao buscar informações da home:', error);

    return {
      heroTitle: "",
      heroSubtitle: "",
      heroImage: "",
      aboutTitle: "Barbearia Rodrigues",
      aboutText1: "A Barbearia Rodrigues é referência em cortes masculinos há mais de 10 anos.",
      aboutText2: "Combinamos técnicas tradicionais com tendências modernas para garantir o melhor atendimento.",
      aboutText3: "Nosso ambiente proporciona conforto e uma experiência única.",
      scheduleTitle: "Horário de Funcionamento",
      scheduleLine1: "Seg - 14h as 20h",
      scheduleLine2: "Terça a Sab. - 09h as 20h",
      scheduleLine3: "Domingo: Fechado",
      locationTitle: "Localização",
      locationAddress: "Av. val paraíso,1396",
      locationCity: "Jangurussu - Fortaleza/CE"
    };
  }
}


export async function saveHomeInfo(homeInfo) {
  try {
    const response = await fetch(`${API_URL}/home-info`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        hero_title: homeInfo.heroTitle ?? null,
        hero_subtitle: homeInfo.heroSubtitle ?? null,
        hero_image: homeInfo.heroImage ?? null,
        about_title: homeInfo.aboutTitle ?? null,
        about_text1: homeInfo.aboutText1 ?? null,
        about_text2: homeInfo.aboutText2 ?? null,
        about_text3: homeInfo.aboutText3 ?? null,
        schedule_title: homeInfo.scheduleTitle ?? null,
        schedule_line1: homeInfo.scheduleLine1 ?? null,
        schedule_line2: homeInfo.scheduleLine2 ?? null,
        schedule_line3: homeInfo.scheduleLine3 ?? null,
        location_title: homeInfo.locationTitle ?? null,
        location_address: homeInfo.locationAddress ?? null,
        location_city: homeInfo.locationCity ?? null,
      }),
    });

    if (!response.ok) {
      throw new Error(`Erro ao salvar: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Erro ao salvar informações da home:', error);
    throw error;
  }
}