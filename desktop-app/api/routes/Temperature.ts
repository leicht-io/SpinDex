import { BaseRoute } from '../core';
import { Temperature as TemperatureModel } from '../models';

export class Temperature extends BaseRoute {
  public static add(value: string, id: string | null) {
    return new Promise((resolve, reject) => {
      if (value !== null && !isNaN(Number(value))) {
        const now = Date.now();

        TemperatureModel.create({ profileId: id, value: value, timestamp: now } as any).then(() => {
          resolve({ value, id: id, timestamp: now });
        });
      }
    });
  }

}
