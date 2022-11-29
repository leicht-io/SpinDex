import { BaseRoute } from '../core/BaseRoute';
import { Temperature as TemperatureModel } from '../models/Temperature';

export class Temperature extends BaseRoute {
    public static add(value: string, id: string | null) {
        return new Promise((resolve, reject) => {
            if (value !== null && !isNaN(Number(value))) {
                const now = Date.now();

                TemperatureModel.create({profileId: id, value: value, timestamp: now}).then(() => {
                    resolve({value, id: id, timestamp: now});
                });
            }
        });
    }

}