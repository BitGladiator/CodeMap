import { query } from "./database";

export function getUser() {
  return query("SELECT * FROM users LIMIT 1");
}
