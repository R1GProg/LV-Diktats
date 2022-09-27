import * as dotenv from 'dotenv'
dotenv.config();
import express from 'express';
import mongoose from 'mongoose';
import { Logger, LogLevel } from 'yatsl';
import { workspaceRouter } from './routes/workspace';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { registerHandler } from './services/WebsocketManager';
import cors from 'cors';

export const logger = new Logger({
	minLevel: parseInt(process.env["LOGLEVEL"] as string) as LogLevel | undefined
});

mongoose.connect(`mongodb+srv://admin:${process.env["DBPASS"]}@diktatify.hpuzt56.mongodb.net/${process.env["DBNAME"]}?retryWrites=true&w=majority`, {}).catch((e) => {
	logger.error(e);
}).then(() => {
	logger.info("Connected to MongoDB!");
});

// Express to listen for REST API requests.
const app = express();
app.use(cors());
app.use(workspaceRouter);

// Pass express to Socket.IO and start a Socket.IO to listen for Websocket Requests
const server = createServer(app);
export const io = new Server(server, {
	cors: {
		origin: process.env["FRONTEND_URL"]
	}
});

// app.get('/', (req: Request, res: Response) => {
// 	res.sendStatus(200);
// });

let prod = process.env["PRODUCTION"] === "yes";
const PORT = process.env.PORT || 3001;

// app.listen(PORT, () => {
// 	logger.info(`The application is listening on port ${PORT}!`);
// });

io.on("connection", (socket) => {
	logger.log("An user has connected to the socket.");
	registerHandler(io, socket);
});

server.listen(PORT);
logger.info(`The server is now listening on port ${PORT}!`);