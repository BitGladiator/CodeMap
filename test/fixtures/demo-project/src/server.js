import { connectDB } from "./database.js";
import { setupAuth } from "./auth.js";
import { loadConfig } from "./config.js";
import { registerRoutes } from "./routes/auth.js";
import { registerUserRoutes } from "./routes/users.js";
import { getUsersRoute } from "./routes/users.js";
import { loginRoute } from "./routes/auth.js";
import { connect } from "./database.js";
import { config } from "./config.js";

const loadedConfig = loadConfig();
const db = connectDB(loadedConfig);

setupAuth(db);
registerRoutes();
registerUserRoutes();

connect();
console.log(`Server starting on port ${config.port}`);
getUsersRoute();
loginRoute();
