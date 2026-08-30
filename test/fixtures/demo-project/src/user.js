import { connectDB } from "./database.js";
import { hashPassword } from "./utils.js";
import { query } from "./database.js";

export function createUser(name, email) {}
export function findUser(id) {}

export function getUser() {
  return query("SELECT * FROM users LIMIT 1");
}
