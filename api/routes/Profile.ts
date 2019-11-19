export class Profile {
    private static databaseName = 'profile';

    private static uuidv4() {
        return 'xxxx-xxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16).toUpperCase();
        });
    };

    public static createProfile(name: string, database: any) {
        return new Promise((resolve, reject) => {

            const statement = database.prepare('INSERT INTO ' + this.databaseName + ' VALUES (?, ?, ?, ?)');
            const now = Date.now();
            statement.run(name, this.uuidv4(), now, null).finalize();

            resolve({status: 'OK'});
        });
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
