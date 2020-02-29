/*
 * IoT Hub Raspberry Pi NodeJS - Microsoft Sample Code - Copyright (c) 2017 - Licensed MIT
 */
const wpi = require('wiring-pi');

/*
- Send event data to Azure IoT Hub.
- Receive messages from IoT Hub.
- Communicate with the service via MQTT (optionally over WebSockets), AMQP (optionally over WebSockets), or HTTP.
Synchronize an Azure IoT Hub device Twin with Azure IoT Hub from a device
Implement Azure IoT Hub Direct Device Methods on devices
Implement Azure IoT Device Mangement features on devices
*/
const Client = require('azure-iot-device').Client;
const Message = require('azure-iot-device').Message;
const Protocol = require('azure-iot-device-mqtt').Mqtt;
const BME280 = require('bme280-sensor');

const BME280_OPTION = {
    i2cBusNo: 1, // defaults to 1
    i2cAddress: BME280.BME280_DEFAULT_I2C_ADDRESS() // defaults to 0x77
};

//Datos de conexión con IoT Hub
//Permiso device connect
const connectionString = 'HostName=miprueba.azure-devices.net;DeviceId=raspberrypi;SharedAccessKey=26YIKlTE31UkUCWxLjXWcpBZtUj8tn0PLIPRGI8XrYk=';

const LEDPin = 4;

var sendingMessage = false;
var messageId = 0;
var client, sensor;
var blinkLEDTimeout = null;

//Prepara un mensaje con los datos leidos en el sensor
function getMessage(cb) {
    messageId++;
    //Lee datos del sensor
    sensor.readSensorData()
        .then(function(data) {
            //pasa al callback un json con datos
            cb(JSON.stringify({
                messageId: messageId,
                deviceId: 'Raspberry Pi Web Client',
                temperature: data.temperature_C,
                humidity: data.humidity
            }), data.temperature_C > 30);
        })
        .catch(function(err) {
            console.error('Failed to read out sensor data: ' + err);
        });
}

//helper para enviar datos al IoT Hub
function sendMessage() {
    if (!sendingMessage) { return; }

    //Lee datos del sensor, de forma asíncrona, y llama al callback cuando los datos se han leido
    getMessage(function(content, temperatureAlert) {
        //Prepara un mensaje con la información leida del sensor
        var message = new Message(content);
        message.properties.add('temperatureAlert', temperatureAlert.toString());
        console.log('Sending message: ' + content);

        //Usa el cliente IoT Hub para enviar los datos al Hub
        client.sendEvent(message, function(err) {
            if (err) {
                console.error('Failed to send message to Azure IoT Hub');
            } else {
                //Si se envian correctamente, el led parpadea
                blinkLED();
                console.log('Message sent to Azure IoT Hub');
            }
        });
    });
}

function onStart(request, response) {
    console.log('Try to invoke method start(' + request.payload + ')');
    sendingMessage = true;

    response.send(200, 'Successully start sending message to cloud', function(err) {
        if (err) {
            console.error('[IoT hub Client] Failed sending a method response:\n' + err.message);
        }
    });
}

function onStop(request, response) {
    console.log('Try to invoke method stop(' + request.payload + ')');
    sendingMessage = false;

    response.send(200, 'Successully stop sending message to cloud', function(err) {
        if (err) {
            console.error('[IoT hub Client] Failed sending a method response:\n' + err.message);
        }
    });
}

//Recibimos información desde el IoT Hub
function receiveMessageCallback(msg) {
    //Parpadea el Led
    blinkLED();
    //Escribe en el log lo que hemos recibido
    var message = msg.getData().toString('utf-8');
    client.complete(msg, function() {
        console.log('Receive message: ' + message);
    });
}

//Hace que parpadee el blink - salida 4
function blinkLED() {
    // Light up LED for 500 ms
    if (blinkLEDTimeout) {
        clearTimeout(blinkLEDTimeout);
    }
    wpi.digitalWrite(LEDPin, 1);
    blinkLEDTimeout = setTimeout(function() {
        wpi.digitalWrite(LEDPin, 0);
    }, 500);
}

// set up wiring
wpi.setup('wpi');
wpi.pinMode(LEDPin, wpi.OUTPUT);

//Inicializa el sensor, y pone la marca para enviar mensajes
sensor = new BME280(BME280_OPTION);
sensor.init()
    .then(function() {
        sendingMessage = true;
    })
    .catch(function(err) {
        console.error(err.message || err);
    });

// representa un dispositivo que se conecta con el IoT Hub para enviar o recibir datos
//Indicamos los datos de conexión y el protocolo a utilizar
client = Client.fromConnectionString(connectionString, Protocol);

//Nos conectamos con el IoT Hub
client.open(function(err) {
    if (err) {
        console.error('[IoT hub Client] Connect error: ' + err.message);
        return;
    }

    // set C2D and device method callback
    client.onDeviceMethod('start', onStart);
    client.onDeviceMethod('stop', onStop);

    //Event Handler que gestiona la recepción de un mensaje desde el IoT Hub
    client.on('message', receiveMessageCallback);

    //Cada 2 segs enviaremos un mensaje el IoT Hub
    setInterval(sendMessage, 2000);
});