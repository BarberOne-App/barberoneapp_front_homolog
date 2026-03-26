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

    const homeInfoArray = await response.json();

    if (homeInfoArray && homeInfoArray.length > 0) {
      return homeInfoArray[0];
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
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const homeInfoArray = await response.json();

    if (homeInfoArray && homeInfoArray.length > 0) {
      const updateResponse = await fetch(`${API_URL}/home-info/${homeInfoArray[0].id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...homeInfo,
          id: homeInfoArray[0].id
        }),
      });

      if (!updateResponse.ok) {
        throw new Error(`Erro ao atualizar: ${updateResponse.status}`);
      }

      return await updateResponse.json();
    } else {

      const createResponse = await fetch(`${API_URL}/home-info`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...homeInfo,
          id: 1
        }),
      });

      if (!createResponse.ok) {
        throw new Error(`Erro ao criar: ${createResponse.status}`);
      }

      return await createResponse.json();
    }
  } catch (error) {
    console.error('Erro ao salvar informações da home:', error);
    throw error;
  }
}