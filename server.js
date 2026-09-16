import http from 'http';
import app from "./src/app.js";
import connectDB from "./src/config/database.js";
import { initSocketIO } from "./src/sockets/index.js";

const server = http.createServer(app);
const io = initSocketIO(server);

// Store io in app for REST APIs to broadcast new messages (e.g. image uploads)
app.set('io', io);

connectDB().then(() => {
    server.listen(3000, () => {
    console.log("Server is running on port 3000");
  });
});
