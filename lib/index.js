'use strict';

var app           = require('electron').app;
var Promise       = require('bluebird');
var express       = require('express');
var isAbsoluteUrl = require('is-absolute-url');
var bodyParser    = require('body-parser');
var pool          = require('./pool');
var stringScheme  = require('./stringScheme');
var util          = require('util');

var tmp  = require('tmp');
var fs   = require('fs');
var http = require('http');

function readPrintingOptions(req) {
    var orientation   = req.get('x-pdf-orientation');
    var noBackgrounds = req.get('x-pdf-no-backgrounds');
    var margins       = req.get('x-pdf-margins');
    var pageSize      = req.get('x-pdf-pageSize');

    var landscape   = orientation ? orientation.toLowerCase() === 'landscape' : false;
    var marginsType = margins && {
            none   : 1,
            minimum: 2
        }[margins.toLowerCase()] || 0; // default = 0

    return {
        landscape      : landscape,
        pageSize       : pageSize,
        printBackground: !noBackgrounds,
        marginsType    : marginsType
    };
}


function printToPdf(url, options) {
    return pool.loadUrl(url, function (window) {
        // !!! Make sure to return a promise here that only resolves when the window
        // can be released again
        return Promise.fromNode(function (callback) {
            window.webContents.printToPDF(options, callback);
        });
    });
}

app.on('ready', function () {

    function printAndRespond(url, req, res, next) {
        var options = readPrintingOptions(req);
        return printToPdf(url, options)
            .then(function (pdf) {
                res.contentType('application/pdf').send(pdf);
            }, next);
    }

    express()
        .get('/proxy', function (req, res, next) {
            var filename = req.query.filename;

            if (filename.indexOf('/tmp/') === -1) {
                return res.status(500).send("You do not have access to this resource.");
            }

            return res.status(200).contentType('text/html').sendFile(filename);
        })
        .get('/*', function (req, res, next) {
            var url = req.url.replace(/^\//, '');
            if (!isAbsoluteUrl(url)) {
                return next();
            }

            printAndRespond(url, req, res, next);
        })

        .post('/', bodyParser.json({type: '*/*', limit:'50mb'}), function (req, res, next) {

            var tmpobj = tmp.fileSync();
            fs.writeSync(tmpobj.fd, req.body.html);

            const url     = 'http://localhost:3000/proxy?filename=' + tmpobj.name;
            const options = readPrintingOptions(req);

            printAndRespond(url, req, res, next).then(function() {
                tmpobj.removeCallback();
            })

        })
        .use(function (err, req, res, next) { //eslint-disable-line no-unused-vars
            if (err instanceof pool.StatusError) {
                return res.status(400)
                    .send(util.format('Url responded with %d', err.code));
            }

            if (err instanceof pool.CefError) {
                return res.status(400)
                    .send(util.format('Request failed "%s"', err.code));
            }

            console.error(err.stack);
            res.sendStatus(500);
        })
        .use(function (req, res) {
            res.sendStatus(404);
        })
        .listen(3000, function () {
            console.log('listening');
        });

});

app.on('before-quit', function (event) {
    // Prevent the app from quitting when the last window closes
    event.preventDefault();
});
