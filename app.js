const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const http = require('http');
const socket = require('socket.io');
const routes = require('./routes');
//const model = require('./models')

const app = express();

const server = http.Server(app);

const io = socket(server);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.set('views', './views');
app.set('view engine', 'ejs');

app.use('/static', express.static('public'));
app.use('/', routes.router);
app.use(cors());

io.on('connection', socket => routes.socketRouter(io, socket));

server.listen(3000, () => {
    console.log('App started on port 3000');
});

/*
app.listen(3000, () => {
    console.log('App started on port 3000');
});

module.exports = {
    app
}
*/