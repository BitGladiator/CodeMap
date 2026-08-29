import { query } from "../database";
import { logInfo } from "../utils";
import { login } from "../auth";

export function loginRoute() {
  logInfo("login attempt");
  return login();
}
