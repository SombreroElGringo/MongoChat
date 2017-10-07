const mongo = require('mongodb').MongoClient;
const client = require('socket.io').listen(3000).sockets;
const chalk = require('chalk');


// Connect to mongo
mongo.connect('mongodb://127.0.0.1/mongochat', function(err, db) {

    if(err) { throw err; }

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
});
