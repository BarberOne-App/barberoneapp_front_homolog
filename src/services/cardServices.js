import api from "./api.js";

const BASE = "/savedCards";


export async function getUserCards(userId) {
  try {
    const res = await api.get(`${BASE}?userId=${userId}`);
    return res.data;
  } catch (error) {
    console.error("Erro ao buscar cartões:", error);
    return [];
  }
}


export async function saveCard(cardData) {
  try {
    const res = await api.post(BASE, {
      ...cardData,
      createdAt: new Date().toISOString()
    });
    return res.data;
  } catch (error) {
    console.error("Erro ao salvar cartão:", error);
    throw error;
  }
}


export async function deleteCard(cardId) {
  try {
    await api.delete(`${BASE}/${cardId}`);
    return true;
  } catch (error) {
    console.error("Erro ao deletar cartão:", error);
    throw error;
  }
}


export async function updateCard(cardId, data) {
  try {
    const res = await api.patch(`${BASE}/${cardId}`, data);
    return res.data;
  } catch (error) {
    console.error("Erro ao atualizar cartão:", error);
    throw error;
  }
}


export async function setMainCard(userId, cardId) {
  try {
    const userCards = await getUserCards(userId);
    

    await Promise.all(
      userCards.map(card => 
        updateCard(card.id, { isMain: false })
      )
    );
    

    await updateCard(cardId, { isMain: true });
    
    return true;
  } catch (error) {
    console.error("Erro ao definir cartão principal:", error);
    throw error;
  }
}