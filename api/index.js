const express = require("express");
const app = express();
var sqlite3 = require('sqlite3').verbose()
var db = new sqlite3.Database('astraeus.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE);

app.listen(3000, () => {
    console.log("Server running on port 3000");

    db.serialize(function () {
        db.run('CREATE TABLE IF NOT EXISTS rpm (value NUMBER)');
    })

    //TODO: CloseDB
    // db.close()
});


app.get("/rpm/add", (req, res, next) => {
    var stmt = db.prepare('INSERT INTO rpm VALUES (?)');
    stmt.run(20).finalize();

    res.json({status: "OK"});
});

app.get("/rpm/latest", (req, res, next) => {
    db.all("SELECT * FROM rpm", (error, data) => {
        res.json(data[data.length - 1]);
    });
});

app.get("/rpm/all", (req, res, next) => {
    db.all("SELECT * FROM rpm", function (err, rows) {
        res.json(rows);
    });
});
