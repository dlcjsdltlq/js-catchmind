const { send } = require('process');
const utils = require('../utils');

const userList = {};
const roomList = {};
const StringList = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const wordList = ['컴퓨터', '자동차', '비행기', '휴대전화', '자전거'];

/* 
Room Schema
{
    id: {
        name: name,
        draw: userId,
        guess: userId,
        currentWord: '예시'
    }
}
User Schema
{
    id: {
        roomId: id,
        currentTurn: 'DRAW' | 'GUESS',
        participant: userId
    }
}
*/

const sendRandomWord = (io, userId) => {
    const randomWord = wordList[utils.randInt(0, wordList.length - 1)]
    io.to(userId).emit('server_msg', { type: 'WORD_PRESENT', result: randomWord });
    console.log(randomWord);
    return randomWord
};

const reqWord = (io, socket) => {
    const word = roomList[userList[socket.id].roomId].currentWord;
    io.to(socket.id).emit('server_msg', { type: 'WORD_PRESENT', result: word });
};

const enterRoom = (io, socket, data) => {
    const userId = socket.id;
    try {
        if (!roomList[data.roomId]) {
            io.to(userId).emit('enter_response', { status: false, result: 'ERR_NO_SUCH_ROOM' });
            return;
        }
        const room = roomList[data.roomId];
        room.guess = socket.id;
        userList[userId] = { roomId: data.roomId, currentTurn: 'guess', participant: room.draw };
        userList[room.draw].participant = room.guess;
        io.to(userId).emit('enter_response', { status: true, result: { userId: userId, roomId: data.roomId, roomName: room.roomName } });
        io.to(room.draw).emit('server_msg', { type: 'PARTICIPANT_IN', result: null });
    } catch (e) {
        io.to(userId).emit('enter_response', { status: false, result: 'ERR_SERVER' });
    }
};

const createRoom = (io, socket, data) => {
    const userId = socket.id;
    try {
        let roomId = '';
        [...Array(8)].forEach(() => roomId += StringList[utils.randInt(0, 51)]);
        while (roomList[roomId]) {
            roomId = '';
            [...Array(8)].forEach(() => roomId += StringList[utils.randInt(0, 51)]);
        }
        roomList[roomId] = { name: data.roomName, draw: userId, guess: null, currentWord: '' };
        const room = roomList[roomId];
        userList[userId] = { roomId: roomId, currentTurn: 'draw', participant: null };
        room.roomName = data.roomName;
        io.to(userId).emit('enter_response', { status: true, result: { userId: userId, roomId: roomId, roomName: data.roomName } });
        room.currentWord = sendRandomWord(io, userId);
    } catch (e) {
        io.to(userId).emit('enter_response', { status: false, result: 'ERR_SERVER' });
    }
}; 

const getCanvasData = (io, socket, data) => {
    try {
        const userId = socket.id;
        const participantId = userList[userId].participant;
        io.to(participantId).emit('canvas_data',  data);
    } catch (e) { }
};

const getGuessData = (io, socket, data) => {
    try {
        const userId = socket.id;
        const word = roomList[userList[userId].roomId].currentWord;
        const participantId = userList[userId].participant;
        const room = roomList[userList[userId].roomId];
        if (data.guessWord === word) { 
            io.to(userId).to(participantId).emit('server_msg', { type: 'CORRECT', result: null });
            [userList[userId].currentTurn, userList[participantId].currentTurn] = [userList[participantId].currentTurn, userList[userId].currentTurn];
            [room.draw, room.guess] = [room.guess, room.draw];
            room.currentWord = sendRandomWord(io, userId);
        }
        io.to(participantId).emit('guess_data', data);
    } catch (e) { }
};

const handleDisconnection = (io, socket) => {
    try {
        const userId = socket.id;
        const participantId = userList[userId].participant;
        const roomId = userList[userId].roomId;
        io.to(participantId).emit('server_msg', { type: 'PARTICIPANT_DISCONNECT', result: null });
        delete(userList[userId]);
        delete(userList[participantId]);
        delete(roomList[roomId]);
    } catch (e) { }
}; 

module.exports = {
    enterRoom,
    createRoom,
    getCanvasData,
    getGuessData,
    reqWord,
    handleDisconnection
};