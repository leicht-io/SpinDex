import { BaseRoute } from '../core/BaseRoute';

export class Profile extends BaseRoute {
    private static tableName = 'profile';

    public static createProfile(name: string) {
        return new Promise((resolve, reject) => {
            const now = Date.now();

            this.ORM.executeStatement('UPDATE ' + this.tableName + ' SET finish = ' + now + ', active = false WHERE finish IS NULL');

            const statement = this.database.prepare('INSERT INTO ' + this.tableName + ' VALUES (?, ?, ?, ?, ?)');
            statement.run(name, this.generateUUID(), now, null, true).finalize();

            resolve({status: 'OK'});
        });
    }

    public static deleteProfile(id: string) {
        return new Promise(((resolve, reject) => {
            // TODO: delete data
            this.ORM.executeStatement('DELETE FROM ' + this.tableName + ' WHERE id = "' + id + '"');

            resolve();
        }));
    }

    public static hasActiveProfile(): Promise<{ active: boolean, id: string | null }> {
        return new Promise((resolve, reject) => {
            this.database.all('SELECT * FROM ' + this.tableName, (error: any, data: any) => {
                let hasActiveProfile: boolean = false;
                let id: string | null = null;

                (data as []).forEach((profile) => {
                    if ((profile as any).finish === null) {
                        hasActiveProfile = true;
                        id = (profile as any).id;
                    }
                });

                resolve({active: hasActiveProfile, id: id});
            });
        });
    }

    public static getProfiles() {
        return new Promise((resolve, reject) => {
            this.database.all('SELECT * FROM ' + this.tableName, (error: any, data: any) => {
                const profiles = {type: 'profiles', data: data};

                resolve(profiles);
            });
        });
    }
}
