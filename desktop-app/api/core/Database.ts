import EnvironmentPath from 'env-paths';
import fs from 'fs';
import * as path from 'path';
import { Sequelize } from 'sequelize-typescript';
import { Profile } from '../models/Profile';
import { RPM } from '../models/RPM';
import { Temperature } from '../models/Temperature';

export class Database {
    private database: Sequelize | undefined = undefined;
    private paths = EnvironmentPath('Astraeus', {suffix: ''});

    public initialize() {
        if (!fs.existsSync(this.paths.data)) {
            fs.mkdirSync(this.paths.data, {recursive: true});
        }

        const databasePath = path.normalize(this.paths.data + '/astraeus.db');

        this.database = new Sequelize({dialect: 'sqlite', storage: databasePath, logging: false});

        this.database.addModels([RPM, Temperature, Profile]);

        this.database
            .authenticate()
            .then(() => {
                console.log('Connection has been established successfully.');
            })
            .catch((err) => {
                console.error('Unable to connect to the database:', err);
            });

        this.database.sync().then((sync) => {
            console.log('Database is in sync.');
        });

    }

    public close() {
        if (this.database) {
            this.database.close();
        }
    }
}
