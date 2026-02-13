

const API_URL = 'http://localhost:3000';

export async function getPixKey() {
  try {
    const response = await fetch(`${API_URL}/settings`);
    const settings = await response.json();
    return settings.length > 0 ? settings[0].pixKey : '';
  } catch (error) {
    console.error('Erro ao buscar chave PIX:', error);
    return '';
  }
}


export async function savePixKey(pixKey) {
  try {
    const response = await fetch(`${API_URL}/settings`);
    const settings = await response.json();
    
    if (settings.length > 0) {

      await fetch(`${API_URL}/settings/${settings[0].id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pixKey }),
      });
    } else {

      await fetch(`${API_URL}/settings`, {
        method: 'POST',
        headers: {
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
    const response = await fetch(`${API_URL}/homeInfo`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const homeInfoArray = await response.json();

    if (homeInfoArray && homeInfoArray.length > 0) {
      return homeInfoArray[0];
    }

    return {
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
    const response = await fetch(`${API_URL}/homeInfo`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const homeInfoArray = await response.json();
    
    if (homeInfoArray && homeInfoArray.length > 0) {
      const updateResponse = await fetch(`${API_URL}/homeInfo/${homeInfoArray[0].id}`, {
        method: 'PUT',
        headers: {
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

      const createResponse = await fetch(`${API_URL}/homeInfo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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