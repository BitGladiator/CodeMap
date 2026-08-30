import { connectDB } from "./database.js";
import { setupAuth } from "./auth.js";
import { loadConfig } from "./config.js";
import { registerRoutes } from "./routes/auth.js";
import { registerUserRoutes } from "./routes/users.js";

const config = loadConfig();
const db = connectDB(config);

setupAuth(db);
registerRoutes();
registerUserRoutes();
