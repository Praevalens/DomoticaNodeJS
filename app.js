var app 		= require('express')();
var path			= require('path');
var bodyParser 		= require('body-parser');
var fs 				= require('fs');
var moment			= require('moment');
var routes_apiv1 	= require('./routes_apiv1');
var sql				= require('mysql');
var AsyncPolling	= require('async-polling');
var https			= require('https');

// 
// Override default log to terminal and/or to file
//
var log_file = fs.createWriteStream(__dirname + '/logs/app.log', {flags : 'a'});
var log_stdout = process.stdout;

console.log = function(msg){
	var now = moment(new Date()).format('MMMM Do YYYY, h:mm:ss a');
	log_file.write(require('util').format( '[' + now +'] ' + msg) + '\n');
	// Uncomment if you want screen output
	log_stdout.write(require('util').format( '[' + now +'] ' + msg) + '\n');
};

// Read all app settings 
var settings = require('./config.json');
app.set('secretkey', settings.secretkey);
app.set('dbHost', settings.dbHost);
app.set('dbUser', settings.dbUser);
app.set('dbPassword', settings.dbPassword);
app.set('webPort', settings.webPort);
app.set('project_description', settings.project_description);

//Vangt alle exceptions af, proces moet wel opnieuw gestart worden.
process.on('uncaughtException', function (err) {
	var now = moment(new Date()).format('MMMM Do YYYY, h:mm:ss a');
	log_file.write(require('util').format( '[' + now +'] '+ err.stack) + '\n');
	// Uncomment als je ook naar scherm wilt loggen
	log_stdout.write(require('util').format( '[' + now +'] '+ err.stack) + '\n');
});

// 
app.use(bodyParser.urlencoded({ extended:true }));
app.use(bodyParser.json());

// Middelware, voor alle * request
app.all('*', function(req, res, next) 
{
	// Log alle request
	console.log(req.method + " " + req.url) ;
	next();
});



// Middelware, voor alle /apiv* request
app.all('/apiv*', function(req, res, next)
{

	// Set respons header (geen idee of dit compleet is)
	res.header("Access-Control-Allow-Origin","*");
	res.header("Access-Control-Allow-Methods","GET,PUT,POST,DELETE,OPTIONS");
	res.header("Access-Control-Allow-Headers","X-Requested-With,Content-type,Accept,X-Access-Token,X-Key");

	// Set response contenttype
	res.contentType('application/json');

	if (req.method === "OPTIONS"){

		// Set respons headers
		var responseHeaders = {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
			"Access-Control-Allow-Headers": "X-Requested-With,Content-type,Accept,X-Access-Token,X-Key",
			"Content-Type": "application/json"
		};

		res.writeHead(200, responseHeaders);
		res.end();

		return next;
	}
	next();
});

// Middleware statische bestanden (HTML, CSS, images)
// app.use(express.static(__dirname + '/public'));

console.log("Adding routes...");
// Routing with versions
app.use('/apiv1', routes_apiv1);
// add new versions below here
console.log("Routes added");

// Start server
var port = process.env.PORT || app.get('webPort');
var server = app.listen( port , function() {
	console.log('Listening server on port ' + server.address().port );
});

// Autoupdate database by facebook events
AsyncPolling(function (end) {
	var options = {
		hostname: 'graph.facebook.com',
		port: 443,
		path: '/v2.8/svvirgo/events?fields=updated_time&access_token=198117933946526|50ab8a52a4eaa6d2aa3fb9b31cb0daf2',
		method: 'GET'
	};

	https.request(options, function(res2) {
		var resultBody = "";
		res2.setEncoding('utf8');
		res2.on('data', function (chunk) {
			resultBody = resultBody + chunk;
		});
		
		res2.on('end', function () {
			dbConnection = sql.createConnection({
									host     : settings.dbHost,
									user     : settings.dbUser,
									password : settings.dbPassword,
									dateStrings: 'date'
		                        });
		    dbConnection.connect(function(err){
		            if(!err) {
		                console.log("Database is connected ... nn");
		            } else {
		                console.log("Error connecting database ... nn");
		            }
		    });

			var json = JSON.parse(resultBody);
			var events = json.data;
			for(var eventId in events){
				//console.log("Name: " + events[eventId].id + ", Updated: " + events[eventId].updated_time);
				// for every event check if it exists in the database:
				
		        checkForUpdates(events[eventId]);
			}
			dbConnection.end();
		})
	}).end();

	end();
	// This will schedule the next call.
}, 1800000).run(); // check every half hour

function checkForUpdates(eventObj){
	try {
		var updated_time = eventObj.updated_time;
		var query = 'SELECT id, updated FROM SVVirgo.activities WHERE facebook=\''+eventObj.id+'\'';
		//console.log("Query: " + query);
        dbConnection.query(query, function (err, rows, fields) {
            if (err) throw err;

            if (rows.length === 1){
            	var fbupdated = new Date(updated_time);
            	var dbupdated = new Date(rows[0].updated.toString());

            	//console.log(fbupdated + " > " + dbupdated);
            	if (fbupdated > dbupdated){
            		//console.log("FB event is newer");
            		FBEvent(eventObj.id, true);
            	}
            } if (rows.length === 0){
            	FBEvent(eventObj.id, false);
            }
            
            rows.forEach(function (row) {
                //console.log("Rows: " + row.id.toString());
            });

        });
    } catch (err){
            console.log("Database timeout error");
            throw err;
    }
}

function FBEvent(facebookId, update){
	console.log("Getting event: " + facebookId);

	var options = {
		hostname: 'graph.facebook.com',
		port: 443,
		path: '/v2.8/'+facebookId+'?fields=name,description,start_time,end_time,place,photos{images}&access_token=198117933946526|50ab8a52a4eaa6d2aa3fb9b31cb0daf2',
		method: 'GET'
	};

	https.request(options, function(res2) {
		var resultBody = "";
		res2.setEncoding('utf8');
		res2.on('data', function (chunk) {
			resultBody = resultBody + chunk;
		});
		
		res2.on('end', function () {
			dbConnection = sql.createConnection({
									host     : settings.dbHost,
									user     : settings.dbUser,
									password : settings.dbPassword,
									dateStrings: 'date'
		                        });

		    dbConnection.connect(function(err){
		            if(!err) {
		                console.log("Database is connected ... nn");
		            } else {
		                console.log("Error connecting database ... nn");
		            }
		    });
			
			var json = JSON.parse(resultBody);

			//console.log(resultBody);

			if (json != undefined){
				var eventName = sql.escape(json.name);
				eventName = eventName.substring(1, eventName.length-1);
				var eventStart = json.start_time;
				var eventEnd = json.end_time;
				var eventDescription = sql.escape(json.description);
				eventDescription = eventDescription.substring(1, eventDescription.length-1);
				if (json.place != undefined){
					var eventPlace = sql.escape(json.place.name);
					eventPlace = eventPlace.substring(1, eventPlace.length-1);
				} else {
					var eventPlace = "Onbekend";
				}
				var eventPoster = json.photos.data[json.photos.data.length-1].images[0].source;
				var eventId = json.id;

				//console.log("name: " + eventName + ", start: " + eventStart + ", end: " + eventEnd + ", place: " + eventPlace + ", Poster: " + eventPoster);
				//console.log("Description: " + eventDescription);

				if (update){
					console.log("Updating existing event: " + eventName);
					dbConnection.query('UPDATE SVVirgo.activities SET title="'+eventName+'", description="'+eventDescription+'", image="'+eventPoster+'", start="'+eventStart+'", end="'+eventEnd+'", price=0, location="'+eventPlace+'", facebook="'+eventId+' WHERE facebook="' + facebookId + '"', function (err, result){});
				} else {
					console.log("Adding new event: " + eventName);
					dbConnection.query('INSERT INTO SVVirgo.activities(title, description, image, start, end, price, location, facebook) VALUES ("'+eventName+'","'+eventDescription+'","'+eventPoster+'","'+eventStart+'","'+eventEnd+'",0,"'+eventPlace+'","'+eventId+'")', function (err, result){});
				}
			}

			dbConnection.end();
		})
	}).end();
}