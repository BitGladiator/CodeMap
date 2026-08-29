import { query } from "../database";
import { logInfo } from "../utils";

export function getUsersRoute() {
  logInfo("fetching users");
  return query("SELECT * FROM users");
}
