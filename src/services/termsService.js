import axios from 'axios';

export const uploadTermsDocument = async (file) => {
  return new Promise((resolve, reject) => {
    if (file.type !== 'application/pdf') {
      reject(new Error('Apenas arquivos PDF são permitidos'));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      reject(new Error('O arquivo deve ter no máximo 5MB'));
      return;
    }

    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const base64 = e.target.result;
        
        
        localStorage.setItem('termsDocument', JSON.stringify({
          name: file.name,
          size: file.size,
          type: file.type,
          data: base64,
          uploadedAt: new Date().toISOString()
        }));
        
        
        await axios.patch(`${import.meta.env.VITE_API_URL}/settings/1`, {
          termsDocumentUrl: base64,
          termsDocumentName: file.name
        });
        
        resolve({ documentUrl: base64, fileName: file.name });
      } catch (error) {
        reject(new Error('Erro ao processar o arquivo'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Erro ao ler o arquivo'));
    };
    
    reader.readAsDataURL(file);
  });
};

export const getTermsDocument = async () => {
  try {
  
    const stored = localStorage.getItem('termsDocument');
    
    if (stored) {
      const doc = JSON.parse(stored);
      return { 
        documentUrl: doc.data, 
        fileName: doc.name,
        uploadedAt: doc.uploadedAt 
      };
    }
    
    
    const response = await axios.get(`${import.meta.env.VITE_API_URL}/settings/1`);
    if (response.data.termsDocumentUrl) {
      return {
        documentUrl: response.data.termsDocumentUrl,
        fileName: response.data.termsDocumentName || 'documento.pdf'
      };
    }
    
    return { documentUrl: '', fileName: '' };
  } catch (error) {
    console.error('Erro ao carregar documento:', error);
    return { documentUrl: '', fileName: '' };
  }
};

export const deleteTermsDocument = async () => {
  try {
    localStorage.removeItem('termsDocument');
    
    await axios.patch(`${import.meta.env.VITE_API_URL}/settings/1`, {
      termsDocumentUrl: '',
      termsDocumentName: ''
    });
    
    return { success: true };
  } catch (error) {
    throw new Error('Erro ao remover documento');
  }
};
