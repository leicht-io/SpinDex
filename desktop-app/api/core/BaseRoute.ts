export class BaseRoute {
    public static generateUUID() {
        return 'xxxx-xxxx'.replace(/[xy]/g, (c) => {
            // tslint:disable-next-line:one-variable-per-declaration
            const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16).toUpperCase();
        });
    }
}
