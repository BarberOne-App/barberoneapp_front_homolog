import api from './api';


export const getUserCards = async (userId) => {
  try {
   
    const response = await api.get(`/savedCards?userId=${userId}`);
    
    return response.data;
  } catch (error) {
    throw new Error('Não foi possível carregar os cartões');
  }
};


export const saveCard = async (cardData) => {
  try {
    const response = await api.post('/savedCards', {
      ...cardData,
      createdAt: new Date().toISOString()
    });
  
    return response.data;
  } catch (error) {

    throw new Error('Não foi possível salvar o cartão');
  }
};


export const deleteCard = async (cardId) => {
  try {
    await api.delete(`/savedCards/${cardId}`);
    
    return true;
  } catch (error) {
    console.error('❌ Erro ao deletar cartão:', error);
    throw new Error('Não foi possível remover o cartão');
  }
};


export const setMainCard = async (userId, cardId) => {
  try {
    
    const cards = await getUserCards(userId);
    await Promise.all(
      cards.map(card => 
        api.patch(`/savedCards/${card.id}`, { isMain: false })
      )
    );

  
    const response = await api.patch(`/savedCards/${cardId}`, { isMain: true });

    return response.data;
  } catch (error) {
  
    throw new Error('Não foi possível definir cartão principal');
  }
};
