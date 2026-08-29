import { getUsersRoute } from "./routes/users";
import { loginRoute } from "./routes/auth";
import { connect } from "./database";
import { config } from "./config";

connect();
console.log(`Server starting on port ${config.port}`);
getUsersRoute();
loginRoute();
