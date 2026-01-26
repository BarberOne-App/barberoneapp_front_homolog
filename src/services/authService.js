import api from "./api";

export async function login(email, password) {
  try {
  
    const { data } = await api.get("/users");
    
   
    const user = data.find(u => u.email === email && u.password === password);
    
    if (!user) return null;
    
    
    saveSession(user);
    
    return user;
  } catch (error) {

    return null;
  }
}

export async function register(userData) {
  try {
    const { data } = await api.post("/users", {
      ...userData,
      role: userData.role || 'client',
      isAdmin: userData.isAdmin || false,
      createdAt: new Date().toISOString()
    });
    
  
    saveSession(data);
    
    return data;
  } catch (error) {

    throw error;
  }
}

export function saveSession(user) {
  localStorage.setItem("currentUser", JSON.stringify(user));
}

export function getSession() {
  try {
    const user = localStorage.getItem("currentUser");
    return user ? JSON.parse(user) : null;
  } catch (error) {

    return null;
  }
}

export function logout() {
  localStorage.removeItem("currentUser");
}

export const getRedirectPath = () => {
  const user = getSession();
  if (!user) return '/login';
  if (user.role === 'admin' || user.isAdmin) return '/admin';
  if (user.role === 'barber') return '/barber';
  return '/appointments';
};
