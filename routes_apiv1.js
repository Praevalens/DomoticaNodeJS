var router = require('express').Router();
var jwt = require('jwt-simple');
var sql = require('mysql');
var path = require('path');
var settings = require('./config.json');

var dbConnection;

router.post('/countkw', function (req, res) {
    var count = req.body.kWatts ||  '';

    if (count == '') {
        console.log("Incompatible data");
        res.status(500);
        res.json({
            "status": 500,
            "message": "Incompatible data"
        });
    } else {
        dbConnection = sql.createConnection({
            host     : settings.dbHost,
            user     : settings.dbUser,
            password : settings.dbPassword,
            dateStrings: 'date'
        });

        dbConnection.connect(function(err){
            if(!err) {
                console.log("Database is connected ...");
            } else {
                console.log("Error connecting database ...");
            }
        });

        try {
            dbConnection.query('INSERT INTO domotica.PowerUsage(kwatts) VALUES ("'+ count +'")', function (err, result){});

            res.status(200);
            res.json({
                "status": 200,
                "message": "Success!"
            });

        } catch (err){
            console.log("Server error");
            res.status(500);
            res.json({
                "status": 500,
                "message": "Server error"
            });
            throw err;
        }
        dbConnection.end();
    }

});

router.get('/powerusage', function (req, res) {

    dbConnection = sql.createConnection({
        host     : settings.dbHost,
        user     : settings.dbUser,
        password : settings.dbPassword,
        dateStrings: 'date'
    });

    dbConnection.connect(function(err){
        if(!err) {
            console.log("Database is connected ...");
        } else {
            console.log("Error connecting database ...");
        }
    });

    try {
        dbConnection.query('SELECT * FROM domotica.PowerUsage ORDER BY id DESC LIMIT 1', function (err, rows, fields){
            if (err) throw err;
            var kWhCount = parseInt(rows[0].kwatts.toString()) * 2; // Two times the amount of kilowatts in half an hour is kWh

            res.status(200);
            res.json({
                "status": 200,
                "kWh": kWhCount
            });
        });

    } catch (err){
        console.log("Server error");
        res.status(500);
        res.json({
            "status": 500,
            "message": "Server error"
        });
        throw err;
    }
    dbConnection.end();
});

router.get('/powerusage/today', function (req, res) {

    dbConnection = sql.createConnection({
        host     : settings.dbHost,
        user     : settings.dbUser,
        password : settings.dbPassword,
        dateStrings: 'date'
    });

    dbConnection.connect(function(err){
        if(!err) {
            console.log("Database is connected ...");
        } else {
            console.log("Error connecting database ...");
        }
    });

    try {
        dbConnection.query('SELECT * FROM domotica.PowerUsage WHERE date > CURDATE();', function (err, rows, fields){
            if (err) throw err;
            var response = [];

            rows.forEach(function (row) {
                var datapoint = {
                    kWh: parseInt(row.kwatts.toString())*2,
                    date: row.date.toString()
                };
                response.push(datapoint);
            });

            res.status(200);
            res.json({
                "status": 200,
                "data": response
            });
        });

    } catch (err){
        console.log("Server error");
        res.status(500);
        res.json({
            "status": 500,
            "message": "Server error"
        });
        throw err;
    }
    dbConnection.end();
});

router.get('/powerusage/thisMonth', function (req, res) {
    res.status(200);
    var project_description = req.app.get('project_description');
    res.json({
        "description": project_description
    });
});

// Fall back, display some info
router.get('/', function (req, res) {
    res.status(200);
    var project_description = req.app.get('project_description');
    res.json({
        "description": project_description
    });
});

module.exports = router;
