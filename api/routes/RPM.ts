import { BaseRoute } from '../core/BaseRoute';

export class RPM extends BaseRoute {
    private static tableName = 'rpm';

    public static add(value: string, id: string | null) {
        return new Promise((resolve, reject) => {
            if (value !== null && !isNaN(Number(value))) {
                const statement = this.database.prepare('INSERT INTO ' + this.tableName + ' VALUES (?, ?, ?)');
                const now = Date.now();
                statement.run(value, id, now).finalize();
                resolve({value, id: id, timestamp: now});
            }
        });
    }

    public static getAll() {
        return new Promise((resolve, reject) => {
            this.database.all('SELECT * FROM ' + this.tableName, (err: any, rows: any) => {
                resolve(rows);
            });
        });
    }

    public static getLatest(database: any) {
        return new Promise((resolve, reject) => {
            this.database.all('SELECT * FROM rpm', (error: any, data: any) => {
                resolve(data[data.length - 1]);
            });
        });
    }
}
