
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
const SLUG = import.meta.env.VITE_BARBERSHOP_SLUG;

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_SIZE_MB = 5;


export const uploadImagem = async (file, tipo, publicId = null) => {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Formato inválido. Use JPG, PNG, GIF ou WebP.');
  }

  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    throw new Error(`Imagem muito grande. Máximo ${MAX_SIZE_MB}MB.`);
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);

  formData.append('folder', `${SLUG}/${tipo}`);

  if (publicId) {
    formData.append('public_id', String(publicId));
  }

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'Falha no upload para o Cloudinary');
  }

  const data = await res.json();
  return data.secure_url;
};


export const criarPreviewLocal = (file) => URL.createObjectURL(file);