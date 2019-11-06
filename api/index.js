const express = require("express");
const app = express();
var sqlite3 = require('sqlite3').verbose()
var db = new sqlite3.Database('astraeus.db');

app.listen(3000, () => {
    console.log("Server running on port 3000");

    db.serialize(function () {
        db.run('CREATE TABLE IF NOT EXISTS rpm (value NUMBER)');
    })

    //TODO: CloseDB
    // db.close()
});


app.get("/url", (req, res, next) => {
    var stmt = db.prepare('INSERT INTO rpm VALUES (?)');
    stmt.run(20.2).finalize();

    return res.json({status: "OK"});
});

app.get("/rpm/latest", (req, res, next) => {
    db.all("SELECT * FROM rpm", (data) => {
        res.json(data);
    });
});

app.get("/rpm/all", (req, res, next) => {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM rpm", function (err, rows) {
            res.json(rows);
        });
    })
});
