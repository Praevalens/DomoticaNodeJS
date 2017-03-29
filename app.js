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

// Autoupdate
AsyncPolling(function (end) {

	end();
	// This will schedule the next call.
}, 1800000).run(); // check every half hour
