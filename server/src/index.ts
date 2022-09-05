import * as dotenv from 'dotenv'
dotenv.config();
import { json, text, urlencoded } from 'body-parser';
import express, { Request, Response } from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { Logger } from 'yatsl';
import { debugRouter } from './routes/debug';
import { submissionRouter } from './routes/submissions';

const logger = new Logger();

mongoose.connect(`mongodb+srv://admin:${process.env["DBPASS"]}@diktatify.hpuzt56.mongodb.net/test?retryWrites=true&w=majority`, {}).then(() => {
	logger.info("Connected to MongoDB!");
}).catch((e) => {
	logger.error(e);
});

const app = express();
app.use(text({ limit: "50mb" }));
app.use(json());
app.use(urlencoded());
app.use(cors());
app.use(function (req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	next();
});
app.use(debugRouter);
app.use(submissionRouter);

app.get('/', (req: Request, res: Response) => {
	res.sendStatus(200);
});

let prod = process.env["PRODUCTION"] === "yes";
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
	logger.info('The application is listening on port 3000!');
});