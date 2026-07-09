const bcrypt = require("bcryptjs");
const { randomUUID } = require("crypto");

const defaultUser = {
  id: randomUUID(),
  name: "Demo User",
  email: "demo@example.com",
  passwordHash: bcrypt.hashSync("password123", 12),
  joinedAt: new Date()
};

const users = [defaultUser];

function getUsers() {
  return users;
}

function getUser(id) {
  return users.find((user) => user.id === id) || null;
}

function getUserByEmail(email) {
  return users.find((user) => user.email === email) || null;
}

function getUserByGoogleId(googleId) {
  return users.find((user) => user.googleId === googleId) || null;
}

function createUser(userData) {
  const user = {
    id: randomUUID(),
    joinedAt: new Date(),
    ...userData
  };

  users.push(user);
  return user;
}

function updateUser(id, updates) {
  const user = getUser(id);

  if (!user) {
    return null;
  }

  Object.assign(user, updates);
  return user;
}

module.exports = {
  createUser,
  getUser,
  getUserByEmail,
  getUserByGoogleId,
  getUsers,
  updateUser
};
