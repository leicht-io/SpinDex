import {RPM} from "../routes/RPM";

export class API {
    private database;
    private app;
    private portNumber: number = 3000;

    constructor(database, app) {
        this.database = database;
        this.app = app;

        this.startExpress();
        this.initRoutes();
    }

    public startExpress() {
        this.app.listen(this.portNumber, () => {
            // tslint:disable-next-line:no-console
            console.log("Astraeus API started.");
            this.createDatabase();
        });
    }

    public stop() {
        this.database.close();
    }

    private createDatabase() {
        this.database.serialize(() => {
            // tslint:disable-next-line:no-console
            console.log("RPM database created.");
            this.database.run("CREATE TABLE IF NOT EXISTS rpm (value NUMBER, timestamp NUMBER)");
        });
    }

    private initRoutes() {
        RPM.initRoutes(this.database, this.app);
    }
}
