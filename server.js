const app = require('express')();
const http = require('http').Server(app);
const mongo = require('mongodb').MongoClient;
const client = require('socket.io').listen(4000).sockets;
const chalk = require('chalk');

const port = process.env.PORT || 3000;

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

// Connect to mongo
mongo.connect('mongodb://127.0.0.1/mongochat').then(function(db) {

    console.log('MongoDB connected %s', chalk.green('✓'));

    // Connect to socket.io
    client.on('connection', function(socket) {
        let chat = db.collection('chats');

        // Create a function to send status
        sendStatus = (s) => {
            socket.emit('status', s);
        }

        // Get chats from mongodb
        chat.find().limit(100).sort({_id:1}).toArray(function(err, res) {

            if(err) { throw err; }

            // Emit the messages
            socket.emit('output', res);
        });

        // Handle input events
        socket.on('input', function(data) {
            let name = data.name;
            let message = data.message;

            // Check for name & message
            if(name == '' || message == '') {
                // Send error status
                sendStatus('Enter a name & message!');
            } else {

                // Insert message in mongodb
                chat.insert({
                    name: name,
                    message: message,
                    createdAt: Date.now()
                },
                function(){
                    client.emit('output', [data]);

                    // Send status object
                    sendStatus({
                        message: 'Message sent!',
                        clear: true
                    });
                });
            }
        });

        // Handle clear
        socket.on('clear', function(data) {

            // Clear all chats from the collection
            chat.remove({}, function() {
                // Emit cleared
                socket.emit('cleared');
            });
        });

    });
}).catch(function(err) {
    throw err;
});

http.listen(port, function(){
  console.log('listening on %d %s', port, chalk.green('✓'));
});
