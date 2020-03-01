const express = require('express');
const path = require('path');

var Client = require('azure-iothub').Client;
const iotHubClient = require('./IoTHub/iot-hub.js');
const WebSocket = require('ws');

//Para gestionar el tiempo
const moment = require('moment');

//Toma la configuracion de dos variables de entorno. Estas variables se han creado 
/*
az webapp config appsettings set --resource-group azuremolchapter20 --name molwebapp --settings consumergroup=yyyyyyyy
az webapp config appsettings set --resource-group azuremolchapter20 --name molwebapp --settings iot=xxxxxxxxxx
*/
var connectionString = process.env.iot;
var consumerGroup = process.env.consumergroup;

//Configura servidor
const app = express();

//Rutas
var index = require('./routes/index');
app.use('/', index);

//Configura puerto del servidor
app.set('port', process.env.PORT || 8080);

//Configura motor de vistas
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs')

//Arranca el servidor
var server = app.listen(app.get('port'), function() {
    console.log('Listening on port %d', server.address().port);
});

// Create Web Sockets server
const wss = new WebSocket.Server({ server });

// Log when WebSockets clients connect or disconnect
wss.on('connection', (ws) => {
    console.log('Client connected');
    ws.on('close', () => console.log('Client disconnected'));
});

// Broadcast data to all WebSockets clients
wss.broadcast = function broadcast(data) {
    wss.clients.forEach(function each(client) {
        if (client.readyState === WebSocket.OPEN) {
            try {
                console.log('sending data ' + data);
                client.send(data);
            } catch (e) {
                console.error(e);
            }
        }
    });
};

// Read in data from IoT Hub and then create broadcast to WebSockets client as new data is received from device
var iotHubReader = new iotHubClient(connectionString, consumerGroup);
iotHubReader.startReadMessage(function(obj, date) {
    try {
        console.log("recibi datos");
        console.log(obj);
        date = date || Date.now();
        console.log(date);
        //Envia a todos los clientes web-socket conectados un Json. 
        wss.broadcast(JSON.stringify(Object.assign(obj, { time: moment().format('LTS L') })));

    } catch (err) {
        console.log("error!!");
        console.error(err);
    }
});

module.exports = app;