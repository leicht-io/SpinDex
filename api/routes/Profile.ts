export class Profile {
    private static databaseName = 'profile';

    private static uuidv4() {
        return 'xxxx-xxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16).toUpperCase();
        });
    }

    public static createProfile(name: string, database: any) {
        return new Promise((resolve, reject) => {
            const now = Date.now();

            const statement2 = database.prepare('UPDATE ' + this.databaseName + ' SET finish = ' + now + ', active = false WHERE finish IS NULL');
            statement2.run().finalize();

            const statement = database.prepare('INSERT INTO ' + this.databaseName + ' VALUES (?, ?, ?, ?, ?)');
            statement.run(name, this.uuidv4(), now, null, true).finalize();

            resolve({status: 'OK'});
        });
    }

    public static deleteProfile(id: string, database: any) {
        return new Promise(((resolve, reject) => {
            // TODO: delete data
            const statement2 = database.prepare('DELETE FROM ' + this.databaseName + ' WHERE id = "' + id + '"');
            statement2.run().finalize();

            resolve();
        }));
    }

    public static getProfiles(database: any) {
        return new Promise((resolve, reject) => {
            database.all('SELECT * FROM ' + this.databaseName, (error: any, data: any) => {
                const profiles = {type: 'profiles', data: data};

                resolve(profiles);
            });
        });
    }
}
