import { BaseRoute } from '../core/BaseRoute';
import { Profile as ProfileModel } from '../models/Profile';

export class Profile extends BaseRoute {
    public static createProfile(name: string) {
        return new Promise((resolve, reject) => {
            const now = Date.now();

            ProfileModel.update({finish: now, active: false}, {where: {finish: null}}).then(() => {
                ProfileModel.create({
                    name: name,
                    profileId: this.generateUUID(),
                    start: now,
                    finish: null,
                    active: true
                }).then(() => {
                    resolve({status: 'OK'});
                });
            });
        });
    }

    public static deleteProfile(id: string) {
        return new Promise(((resolve, reject) => {
            // TODO: delete data
            ProfileModel.destroy({where: {id: id}}).then(() => {
                resolve();
            });
        }));
    }

    public static hasActiveProfile(): Promise<{ active: boolean, id: string | null }> {
        return new Promise((resolve, reject) => {
            ProfileModel.findAll().then((data) => {
                let hasActiveProfile = false;
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
            ProfileModel.findAll().then((data) => {
                const profiles = {type: 'profiles', data: data};
                resolve(profiles);
            });
        });
    }
}
