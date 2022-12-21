import * as fs from 'fs';
import * as path from 'path';
import { Sequelize } from 'sequelize-typescript';
import { Temperature, RPM, Profile } from '../models';

export class Database {
  private database: Sequelize | undefined = undefined;
  private paths = { data: './' };

  public initialize() {
    if (!fs.existsSync(this.paths.data)) {
      fs.mkdirSync(this.paths.data, { recursive: true });
    }

    const databasePath = path.normalize(this.paths.data + '/astraeus.db');

    this.database = new Sequelize({ dialect: 'sqlite', storage: databasePath, logging: false });

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
