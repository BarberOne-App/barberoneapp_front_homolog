import { API_BASE_URL } from './api.js';

export const isLocalOrHomologEnvironment = () => {
  const hostname =
    typeof window !== 'undefined' ? String(window.location.hostname || '').toLowerCase() : '';
  const apiBaseUrl = String(API_BASE_URL || '').toLowerCase();
  const mode = String(import.meta.env.MODE || '').toLowerCase();
  const appEnv = String(
    import.meta.env.VITE_APP_ENV ||
      import.meta.env.VITE_ENV ||
      import.meta.env.VITE_STAGE ||
      '',
  ).toLowerCase();

  return [hostname, apiBaseUrl, mode, appEnv].some((value) =>
    value.includes('localhost') ||
    value.includes('127.0.0.1') ||
    value.includes('[::1]') ||
    value.includes('homolog') ||
    value.includes('homologacao'),
  );
};
