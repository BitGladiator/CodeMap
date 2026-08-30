import { setupAuth, login, register } from "../auth.js";
import { connectDB } from "../database.js";
import { query } from "../database.js";
import { logInfo } from "../utils.js";

export function registerRoutes() {}

export function loginRoute() {
  logInfo("login attempt");
  return login();
}
