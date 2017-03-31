var router = require('express').Router();
var jwt = require('jwt-simple');
var sql = require('mysql');
var path = require('path');
var settings = require('./config.json');
var https = require('https');

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

            checkPowerUsage();

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

router.get('/powerusage/week', function (req, res) {
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

function checkPowerUsage(){


    var dbConnection3 = sql.createConnection({
        host     : settings.dbHost,
        user     : settings.dbUser,
        password : settings.dbPassword,
        dateStrings: 'date'
    });

    dbConnection3.connect(function(err){
        if(!err) {
            console.log("Database is connected ...");
        } else {
            console.log("Error connecting database ...");
        }
    });

    try {
        dbConnection3.query('SELECT * FROM domotica.PowerUsage ORDER BY id DESC LIMIT 1', function (err, rows, fields){
            if (err) throw err;
            var kWh = parseInt(rows[0].kwatts.toString()) * 2; // Two times the amount of kilowatts in half an hour is kWh
            var date = rows[0].date.toString();

            var dataDate = new Date(date);

            var dbConnection2 = sql.createConnection({
                host     : settings.dbHost,
                user     : settings.dbUser,
                password : settings.dbPassword,
                dateStrings: 'date'
            });

            dbConnection2.connect(function(err){
                if(!err) {
                    console.log("Database is connected ...");
                } else {
                    console.log("Error connecting database ...");
                }
            });

            try {
                dbConnection2.query('SELECT * FROM domotica.PowerCalibration', function (err, rows, fields){
                    if (err) throw err;
                    var calibrationDates = [];

                    rows.forEach(function (row) {

                        var datapointDate = new Date();
                        var time = row.time.toString().split(':');
                        datapointDate.setHours(parseInt(time[0]), parseInt(time[1]), parseInt(time[2]));

                        var datapoint = {
                            kWh: parseInt(row.kWh.toString()),
                            time: datapointDate
                        };
                        calibrationDates.push(datapoint);
                    });

                    for (var i = 0; i < calibrationDates.length; i++){
                        // if it falls between certain times
                        if (dataDate > calibrationDates[i].time && dataDate < calibrationDates[i+1].time){
                            console.log("Dates: " + calibrationDates[i].toString() + " - " + calibrationDates[i+1].toString() );
                            // Check if there is more energy usage than the calibrated amount
                            if (calibrationDates[i].kWh < kWh){
                                sendUserWarning();
                            }
                        }
                    }
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

            dbConnection2.end();
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

    dbConnection3.end();
}

function sendUserWarning(){
    var body = JSON.stringify({
        "data": {},
        "to": "/topics/alphatester"
    });

    var options = {
        host: 'fcm.googleapis.com',
        port: 443,
        path: '/fcm/send',
        method: 'POST',
        headers: {'Content-Type' : 'application/json', 'Authorization': 'key=AAAApgfZqdU:APA91bEvz0B7BjV8tGWf1i5vqv2LgoJEVxrfchQ2JbuuU3Ndc1SSI3eF4gN6WkLDt3sL00DJm1262josUUCNjESpY5Vj5gZ17vgYDauP9GRuWJjm-jc2PJ_t9u55l7mCLk4xrPNZ9kWh'}
    };

    var req = https.request(options, function(res) {});

    req.write(body);
    req.end();

    console.log("Sent warning to user.")
}

module.exports = router;
