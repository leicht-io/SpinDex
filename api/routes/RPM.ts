export class RPM {

    public static initRoutes(database, app) {
        app.post("/rpm/add", (req, res, next) => {
            let value: number | null = null;

            try {
                value = Number(req.body.value);
            } catch (e) {
                value = null;
            }

            if (value === null || isNaN(value)) {
                res.status(500);
                res.json({error: "value is NaN"});
            } else {
                const statement = database.prepare("INSERT INTO " + this.databaseName + " VALUES (?, ?)");
                statement.run(value, Date.now()).finalize();

                res.json();
            }
        });

        app.get("/rpm/latest", (req, res, next) => {
            database.all("SELECT * FROM rpm", (error, data) => {
                res.json(data[data.length - 1]);
            });
        });

        app.get("/rpm/all", (req, res, next) => {
            database.all("SELECT * FROM " + this.databaseName, (err, rows) => {
                res.json(rows);
            });
        });
    }

    private static databaseName = "rpm";
}
