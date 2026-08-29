import { login } from "./auth";

export function query(sql: string) {
  // pretend db query
  return [];
}

export function connect() {
  console.log("connected to db");
}

// NOTE: this import is intentional - it closes the circular dependency
// loop: auth.ts -> user.ts -> database.ts -> auth.ts
export function forceLoginCheck() {
  return login();
}

// change 0

// change 1

// change 2

// change 3

// change 4

// change 0

// change 1

// change 2

// change 3

// change 4
