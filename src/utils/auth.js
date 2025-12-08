const USERS_KEY = 'barbearia_users';
const CURRENT_USER_KEY = 'barbearia_currentUser';

const parseJSON = (value, fallback) => {
  if (value === null || value === undefined) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

export const getUsers = () => {
  const raw = localStorage.getItem(USERS_KEY);
  return parseJSON(raw, []);
};

export const saveUsers = (users) => {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

export const userExists = (email) => {
  const users = getUsers();
  return users.some((user) => user.email === email);
};

export const createUser = ({ name, email, password }) => {
  const users = getUsers();
  const newUser = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    name,
    email,
    password,
  };
  const updated = [...users, newUser];
  saveUsers(updated);
  return newUser;
};

export const authenticate = ({ email, password }) => {
  const users = getUsers();
  return users.find((user) => user.email === email && user.password === password) || null;
};

export const setCurrentUser = (user) => {
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
};

export const clearCurrentUser = () => {
  localStorage.removeItem(CURRENT_USER_KEY);
};

export const storageKeys = {
  users: USERS_KEY,
  currentUser: CURRENT_USER_KEY,
};
