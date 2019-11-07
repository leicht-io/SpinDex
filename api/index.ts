import bodyParser from "body-parser";
import express from "express";
import {verbose} from "sqlite3";
import {API} from "./core/API";

const app = express();
const sqlite3 = verbose();
// tslint:disable-next-line:no-bitwise
const database = new sqlite3.Database("astraeus.db", sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE);

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

const astraeusAPI = new API(database, app);

process.on("exit", () => {
    astraeusAPI.stop();
});
