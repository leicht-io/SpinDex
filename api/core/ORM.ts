import EnvironmentPath from 'env-paths';
import fs from 'fs';
import { Database, verbose } from 'sqlite3';

const sqlite3 = verbose();

export class ORM {
    private static instance: ORM;
    // @ts-ignore
    private database: Database;
    private paths = EnvironmentPath('Astraeus', {suffix: ''});

    private constructor() {
        this.createDatabase();
    }

    public createDatabase() {
        if (!this.database) {
            if (!fs.existsSync(this.paths.data)) {
                fs.mkdirSync(this.paths.data, {recursive: true});
            }

            this.database = new Database(this.paths.data + '/astraeus.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE);
        }
    }

    public getDatabase() {
        if (this.database) {
            return this.database;
        } else {
            throw Error('Database is null');
        }
    }

    public executeStatement(sql: string) {
        const statement = this.database.prepare(sql);
        statement.run().finalize();
    }

    public static getInstance(): ORM {
        if (!ORM.instance) {
            ORM.instance = new ORM();
        }

        return ORM.instance;
    }
}
