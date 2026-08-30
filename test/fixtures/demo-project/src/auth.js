import { connectDB } from "./database.js";
import { loadConfig } from "./config.js";
import { hashPassword } from "./utils.js";
import { getUser } from "./user.js";

export function setupAuth(db) {}

export function login(user, password) {
  const currentUser = getUser();
  return !!currentUser;
}

export function register(user, password) {}
