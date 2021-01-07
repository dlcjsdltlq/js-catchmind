const express = require('express');

const controller = require('../controllers');

const router = express.Router();

router.get('/', (req, res) => {
    res.render('index', { connectId: '' });
})

router.get('/r/:connectId', (req, res) => {
    res.render('index', { connectId: req.params.connectId })
});

router.post('/enter_room', controller.enterRoom);

const socketRouter = (io, socket) => {
    console.log('Socket connection is established');
    socket.on('enter_room', data => controller.enterRoom(io, socket, data));
    socket.on('create_room', data => controller.createRoom(io, socket, data));
    socket.on('draw_data', data => controller.getCanvasData(io, socket, data));
    socket.on('guess_data', data => controller.getGuessData(io, socket, data));
    socket.on('req_word', () => controller.reqWord(io, socket));
    socket.on('disconnect', () => controller.handleDisconnection(io, socket));
}

module.exports = { 
    router,
    socketRouter 
};