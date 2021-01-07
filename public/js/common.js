const ERR_LIST = {
    ERR_NO_SUCH_ROOM: {
        msg: '해당 방이 존재하지 않습니다.'
    },
    ERR_CREATE_ROOM: {
        msg: '방을 생성하는 중 오류가 발생했습니다.'
    },
    ERR_SERVER: {
        msg: '서버에 오류가 발생했습니다. 관리자에게 문의 바랍니다.'
    },
    ERR_ELSE: {
        msg: '오류가 발생했습니다.'
    }
};

const drawCanvas = document.querySelector('#draw-canvas');
const drawCtx = drawCanvas.getContext('2d');
const guessCanvas = document.querySelector('#guess-canvas');
const guessCtx = guessCanvas.getContext('2d');
const participantWordElement = document.querySelector('#participant-word');
let gameData = {};
let sendData = {};

const resetGameData = (socket = null, roomName = '', roomId = '') => {
    gameData = {
        currentTurn: 'DRAW',
        currentWord: '',
        isMouseDown: false,
        lineWidth: 2,
        x: undefined, 
        y: undefined,
        userId: '',
        roomName: roomName,
        roomId: roomId,
        color: '#343637',
        socket: socket
    };
    sendData = {
        x: 0,
        y: 0,
        color: '#343637',
        lineWidth: 2,
        operation: 'DRAW',
    };
};

const drawLine = async (newX, newY, ctx) => {
    if (gameData.isMouseDown) {
        ctx.beginPath();
        ctx.moveTo(gameData.x, gameData.y);
        ctx.lineTo(newX, newY);
        ctx.stroke();
        [gameData.x, gameData.y] = [newX, newY];
    }
};

const rgbToHex = (text) => {
    const rgb = (a, b, c) => {
        return '#' + a.toString(16) + b.toString(16) + c.toString(16);
    };
    return eval(text);
};

const changeColor = async (color, ctx) => ctx.strokeStyle = color;

const removeAll = async (canvas, ctx) => {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
};

const drawEventHandler = async (eType, event) => {
    switch (eType) {
        case 'START_DRAW':
            gameData.isMouseDown = true;
            [gameData.x, gameData.y] = [event.offsetX, event.offsetY];
            sendData.x = gameData.x;
            sendData.y = gameData.y;
            sendData.operation = 'START_DRAW';
            drawLine(gameData.x, gameData.y, drawCtx);
            emitDrawData(sendData);
            break;
        case 'DRAW_LINE':
            let [newX, newY] = [event.offsetX, event.offsetY];
            sendData.x = newX;
            sendData.y = newY;
            sendData.operation = 'DRAW';
            drawLine(newX, newY, drawCtx);
            if (gameData.isMouseDown) emitDrawData(sendData);
            break;
        case 'CHANGE_COLOR':
            const style = getComputedStyle(event);
            gameData.color = rgbToHex(style.backgroundColor);
            sendData.operation = 'CHANGE_COLOR';
            sendData.color = gameData.color;
            changeColor(gameData.color, drawCtx);
            emitDrawData(sendData);
            break;
        case 'CHANGE_WIDTH':
            gameData.lineWidth = event;
            sendData.operation = 'CHANGE_WIDTH';
            sendData.lineWidth = gameData.lineWidth;
            emitDrawData(sendData);
            drawCtx.lineWidth = gameData.lineWidth;
            break;
        case 'RESET':
            sendData.operation = 'RESET';
            emitDrawData(sendData);
            removeAll(drawCanvas, drawCtx);
            break;
    }
};

const guessEventHandler = (data) => {
    switch (data.operation) {
        case 'START_DRAW':
            gameData.x = data.x;
            gameData.y = data.y;
            drawLine(data.x, data.y, guessCtx);
            break;
        case 'DRAW':
            drawLine(data.x, data.y, guessCtx);
            break;
        case 'CHANGE_COLOR':
            gameData.color = data.color;
            changeColor(gameData.color, guessCtx);
            break;
        case 'CHANGE_WIDTH':
            gameData.lineWidth = data.lineWidth;
            guessCtx.lineWidth = gameData.lineWidth;
            break;
        case 'RESET':
            removeAll(guessCanvas, guessCtx);
            break;
    }
};

const getGuessText = (element) => {
    const text = element.value;
    emitGuessData({ userID: gameData.userID, guessWord: text });
    element.value = '';
};

const emitDrawData = async (data) => {
    gameData.socket.emit('draw_data', data);
}

const emitGuessData = async (data) => {
    gameData.socket.emit('guess_data', data);
}

const initDrawCanvas = async () => {
    drawCanvas.addEventListener('mousedown', (e) => drawEventHandler('START_DRAW', e));
    drawCanvas.addEventListener('mousemove', (e) => drawEventHandler('DRAW_LINE', e));
    drawCanvas.addEventListener('mouseup', () => gameData.isMouseDown = false);
    //canvas.addEventListener('mouseout', stopDrawing);
    drawCtx.lineWidth = gameData.lineWidth; 
    drawCtx.lineCap = 'round';
    $('#size-slider').range({
        min: 2,
        max: 50,
        start: 2,
        onChange: (value) => drawEventHandler('CHANGE_WIDTH', value)
    })
};

const initGuessCanvas = async () => {
    gameData.isMouseDown = true;
    guessCtx.lineWidth = gameData.lineWidth; 
    guessCtx.lineCap = 'round';
};

const gameReady = () => {
    hideElement('#connect-area');
    showElement('#game-info-area')
    document.querySelector('#room-name').textContent = gameData.roomName;
    document.querySelector('#room-url').textContent = 'http://localhost:3000/r/' + gameData.roomId;
    if (gameData.currentTurn === 'DRAW') {
        showElement('#game-draw-area');
        initDrawCanvas();
    } else {
        showElement('#game-guess-area');
        initGuessCanvas();
    }
    alert('서버와 연결되었습니다.');
};

const listenCanvasData = (data) => {
    //console.log(data)
    guessEventHandler(data);
};

const listenGuessData = (data) => {
    participantWordElement.innerHTML = data.guessWord;    
}

const hideElement = (...selectors) => {
    selectors.forEach(selector => {
        document.querySelector(selector).classList.add('hide');
    })
};

const showElement = (...selectors) => {
    selectors.forEach(selector => {
        document.querySelector(selector).classList.remove('hide');
    })
};

const toggleClass = (className, ...selectors) => {
    selectors.forEach(selector => {
        const element = document.querySelector(selector);
        const classList = element.classList;
        if (classList.contains(className)) classList.remove(className);
        else classList.add(className);
    })
};

const listenServerMsg = async (data) => {
    switch (data.type) {
        case 'WORD_PRESENT':
            gameData.currentWord = data.result;
            document.querySelector('#presented-word').textContent = gameData.currentWord;
            break;
        case 'WORD_PARTICIPANT':
            document.querySelector('#participant-word').textContent = data.result;
            break;
        case 'CORRECT':
            alert('정답입니다!');
            switchTurn();
            break;
        case 'PARTICIPANT_DISCONNECT':
            handleDisconnection('상대방과 ');
            break;
        case 'PARTICIPANT_IN':
            if (!gameData.currentWord) {
                console.log('asdf');
                gameData.socket.emit('req_word', {});
            }
            toggleClass('loading', '#word-segment', '#canvas-segment');
            document.querySelector('#presented-word').textContent = gameData.currentWord;
            alert('상대방이 입장했습니다.');
            break;
        case 'NO_SUCH_ROOM':
            alert('방이 존재하지 않습니다.');
            break
    }
};

const switchTurn = () => {
    document.querySelector('#presented-word').textContent = '';
    document.querySelector('#participant-word').textContent = '';
    if (gameData.currentTurn === 'DRAW') {
        removeAll(drawCanvas, drawCtx);
        resetGameData(gameData.socket, gameData.roomName, gameData.roomId);
        gameData.currentTurn = 'GUESS';
        hideElement('#game-draw-area');
        showElement('#game-guess-area');
        initGuessCanvas();
    } else {
        removeAll(guessCanvas, guessCtx);
        resetGameData(gameData.socket, gameData.roomName, gameData.roomId);
        showElement('#game-draw-area');
        hideElement('#game-guess-area');
        initDrawCanvas();
    }
};

const handleDisconnection = (type = 'server') => {
    let msg = '';
    if (type == 'client') msg = '상대방과 ';
    alert(`${msg}연결이 끊어졌습니다. 로비로 이동합니다.`);
    gameData.socket.close();
    removeAll();
    resetGameData();
    hideElement('#game-draw-area', '#game-guess-area', '#game-info-area');
    showElement('#connect-area');
};

const bindSocket = async (socket) => {
    await socket.on('canvas_data', listenCanvasData);
    await socket.on('guess_data', listenGuessData);
    await socket.on('server_msg', listenServerMsg);
    await socket.on('disconnect', handleDisconnection);
};

const connectRoom = async () => {
    const roomIdElement = document.querySelector('#room-id-input');
    const segmentClassList = roomIdElement.parentElement.classList;
    segmentClassList.add('loading');
    try {
        const socket = await io();
        socket.emit('enter_room', { roomId: roomIdElement.value });
        const res = await new Promise((resolve, reject) => socket.on('enter_response', data => resolve(data)));
        if (!res.status) throw res.result;
        resetGameData();
        gameData.userId = res.result.userId;
        gameData.roomId = res.result.roomId;
        gameData.roomName = res.result.roomName;
        gameData.currentTurn = 'GUESS';
        await bindSocket(socket);
        gameData.socket = socket;
        gameReady();
    } catch (e) {
        console.log(e in ERR_LIST ? e : 'ERR_ELSE')
        const ERR_MSG = ERR_LIST[e in ERR_LIST ? e : 'ERR_ELSE'].msg;
        alert(ERR_MSG);
    } finally {
        segmentClassList.remove('loading');
    }
};

const createRoom = async () => {
    const roomNameElement = document.querySelector('#room-name-input');
    const segmentClassList = roomNameElement.parentElement.classList;
    segmentClassList.add('loading');
    try {
        const socket = await io();
        socket.emit('create_room', { roomName: roomNameElement.value });
        const res = await new Promise((resolve, reject) => socket.on('enter_response', data => resolve(data)));
        if (!res.status) throw res.result;
        resetGameData();
        gameData.userId = res.result.userId;
        gameData.roomId = res.result.roomId;
        gameData.roomName = res.result.roomName;
        gameData.currentTurn = 'DRAW';
        await bindSocket(socket);
        gameData.socket = socket;
        gameReady();
        console.log(gameData.roomId);
        toggleClass('loading', '#word-segment', '#canvas-segment');
    } catch (e) {
        console.log(e in ERR_LIST ? e : 'ERR_ELSE')
        const ERR_MSG = ERR_LIST[e in ERR_LIST ? e : 'ERR_ELSE'].msg;
        alert(ERR_MSG);
    } finally {
        segmentClassList.remove('loading');
    }
};