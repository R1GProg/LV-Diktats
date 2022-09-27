import * as dotenv from 'dotenv';
import * as config from "../config.json";
import path from 'path';
import { isMainThread, TransferListItem, Worker } from 'worker_threads';
import { Logger, LogLevel } from 'yatsl';
import { MessageType } from './services/types/MessageTypes';
dotenv.config();

// Teikums - The #1 Diktify Service Manager Service

if (isMainThread) {
	const name = config.serviceNames.main;
	const logger = new Logger({
		minLevel: parseInt(process.env["LOGLEVEL"] as string) as LogLevel | undefined,
		name: name
	});

	// TODO: Modularise this, add checks for whether services are up and automatically reboot them if not.
	// Activate Divdabis
	const dataService = new Worker(path.resolve(__dirname, './services/DataService.ts'));
	dataService.on("online", () => {
		logger.log("Divdabis is now online!");
	});
	dataService.on("error", (err: Error) => {
		logger.error(`Divdabis has crashed: ${err.message}`);
	});
	dataService.on("exit", () => {
		logger.info("Divdabis is now offline!");
	});

	// Activate Saiklis
	const networkService = new Worker(path.resolve(__dirname, './services/NetworkingService.ts'));
	networkService.on("online", () => {
		logger.log("Saiklis is now online!");
	});
	networkService.on("error", (err: Error) => {
		logger.error(`Saiklis has crashed: ${err.message}`);
	});
	networkService.on("exit", () => {
		logger.info("Saiklis is now offline!");
	});

	// Hook both up with a communication channel
	const { port1, port2 } = new MessageChannel();
	dataService.postMessage({
		origin: name,
		type: MessageType.CHANNEL_INIT,
		payload: {
			port: port1
		}
	}, [port1 as unknown as TransferListItem]);
	networkService.postMessage({
		origin: name,
		type: MessageType.CHANNEL_INIT,
		payload: {
			port: port2
		}
	}, [port2 as unknown as TransferListItem]);
}