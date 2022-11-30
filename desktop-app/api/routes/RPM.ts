import { BaseRoute } from '../core/BaseRoute';
import { RPM as RPMModel } from '../models/RPM';

export class RPM extends BaseRoute {
    public static add(value: number, id: string) {
        return new Promise((resolve, reject) => {
            if (value !== null && !isNaN(Number(value))) {
                const now = Date.now();

                RPMModel.create({profileId: id, value: value, timestamp: now} as any).then(() => {
                    resolve({value, id: id, timestamp: now});
                });
            }
        });
    }

    public static getAll() {
        return RPMModel.findAll();
    }

    public static getLatest(database: any) {
        return new Promise((resolve, reject) => {
            RPMModel.findAll().then((data) => {
                resolve(data[data.length - 1]);
            });
        });
    }
}
