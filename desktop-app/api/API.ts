import * as bodyParser from 'body-parser';
import cors from 'cors';
import express from 'express';
import { Database } from './core/Database';
import { SocketAPI } from './core/SocketAPI';

const app = express();

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(cors()); // TODO: Secure this to localhost

export class API {
    private api: SocketAPI = new SocketAPI(app);
    private database: Database = new Database();

    public startAPI() {
        this.database.initialize();

        this.api.startSocket();
    }

    public stopAPI() {
        this.api.stopSocket();
        this.database.close();
    }

}
