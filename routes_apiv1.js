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
        console.log("KwCount: " + count);
        res.status(200);
        res.json({
            "status": 200,
            "message": "Count submitted"
        });
    } /*else {
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
            dbConnection.query('SELECT * FROM SVVirgo.offers WHERE updated > \''+update_date+'\'', function (err, rows, fields) {

                res.status(200);
                res.json(response);

            });
        } catch (err){
            console.log("Server error");
            res.status(500);
            res.json({
                "status": 500,
                "message": "Server error."
            });
            throw err;
        }
        dbConnection.end();
    }*/

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
