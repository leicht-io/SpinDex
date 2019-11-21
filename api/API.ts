import * as bodyParser from 'body-parser';
import cors from 'cors';
import express from 'express';
import { ORM } from './core/ORM';
import { SocketAPI } from './core/SocketAPI';

const app = express();

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(cors()); // TODO: Secure this to localhost

export class API {
    private api: SocketAPI = new SocketAPI(app);
    private orm: ORM = ORM.getInstance();

    public startAPI() {
        this.api.startAPI();
        this.orm.createDatabase();
    }

    public stopAPI() {
        this.api.stopAPI();
    }

}
