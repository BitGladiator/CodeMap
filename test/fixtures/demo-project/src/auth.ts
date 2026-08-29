import { getUser } from "./user";

export function login() {
  const user = getUser();
  return !!user;
}
