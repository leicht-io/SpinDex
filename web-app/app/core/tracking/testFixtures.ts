import {Sample} from '../storage/db';

export const sample = (timestamp: number, value: number): Sample => ({trackingId: 't1', timestamp, value});
