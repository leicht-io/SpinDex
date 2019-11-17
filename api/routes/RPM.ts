export class RPM {
    private static databaseName = 'rpm';

    public static add(value: string, database: any) {
        return new Promise((resolve, reject) => {
            if (value !== null && !isNaN(Number(value))) {
                const statement = database.prepare('INSERT INTO ' + this.databaseName + ' VALUES (?, ?)');
                const now = Date.now();
                statement.run(value, now).finalize();

                resolve({value, timestamp: now});
            }
        });
    }

    public static getAll(database: any) {
        return new Promise((resolve, reject) => {
            database.all('SELECT * FROM ' + this.databaseName, (err: any, rows: any) => {
                resolve(rows);
            });
        });
    }

    public static getLatest(database: any) {
        return new Promise((resolve, reject) => {
            database.all('SELECT * FROM rpm', (error: any, data: any) => {
                resolve(data[data.length - 1]);
            });
        });
    }
}
