import * as bodyParser from 'body-parser';
import cors from 'cors';
import express from 'express';
import { verbose } from 'sqlite3';
import { SocketAPI } from './core/SocketAPI';

const app = express();
const sqlite3 = verbose();
const database = new sqlite3.Database('astraeus.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE);

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(cors()); // TODO: Secure this to localhost

export class API {
    private api: SocketAPI = new SocketAPI(database, app);

    public startAPI() {
        this.api.startAPI();
    }

    public stopAPI() {
        this.api.stopAPI();
    }

}
