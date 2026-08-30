import { loadConfig } from "./config.js";
import { login } from "./auth.js";

export function connectDB(config) {}

export function query(sql) {
  return [];
}

export function close() {}

export function connect() {
  console.log("connected to db");
}

export function forceLoginCheck() {
  return login();
}
