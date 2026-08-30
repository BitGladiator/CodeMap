import { createUser, findUser } from "../user.js";
import { connectDB } from "../database.js";
import { query } from "../database.js";
import { logInfo } from "../utils.js";

export function registerUserRoutes() {}

export function getUsersRoute() {
  logInfo("fetching users");
  return query("SELECT * FROM users");
}
