const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.json());
app.use(express.static('public'));

const PORT = process.env.PORT || 3000;
const TOKEN = process.env.TELEGRAM_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;

const bot = new TelegramBot(TOKEN, { polling: true });

// የመጫወቻ ክፍሎች መዋቅር (Rooms State)
let rooms = {
    10: { stake: 10, players: {}, countdown: 45, status: "Waiting", timer: null, calledNumbers: [] },
    20: { stake: 20, players: {}, countdown: 45, status: "Waiting", timer: null, calledNumbers: [] },
    50: { stake: 50, players: {}, countdown: 45, status: "Waiting", timer: null, calledNumbers: [] }
};

let userBalances = {};

// የቴሌግራም ቦት ዋና ቁልፎች (Keyboard)
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    if (!userBalances[chatId]) userBalances[chatId] = 100; // ለሙከራ 100 ብር ስጦታ
    bot.sendMessage(chatId, "🎯 **እንኳን ወደ ኢትዮ ቢንጎ ጌም በሰላም መጡ!**\n\nእባክዎ ከታች ካሉት አማራጮች አንዱን ይምረጡ።", {
        parse_mode: "Markdown",
        reply_markup: {
            keyboard: [
                [{ text: "🎮 Play" }],
                [{ text: "💰 Deposit" }, { text: "🏪 Withdraw" }],
                [{ text: "💳 Check Balance" }]
            ],
            resize_keyboard: true
        }
    });
});

bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    if (msg.text === "🎮 Play") {
        bot.sendMessage(chatId, "🎰 ለመጫወት ከታች ያለውን ቁልፍ ተጭነው ሚኒ አፑን ይክፈቱ፦", {
            reply_markup: {
                inline_keyboard: [[
                    { text: "🚀 መጫወቻ ክፍሎችን ክፈት", web_app: { url: `https://onrender.com` } }
                ]]
            }
        });
    }
});

// --- 🎮 የሶኬት (Socket.io) ባለብዙ ተጫዋች ሎጅክ ---
io.on('connection', (socket) => {
    
    // ተጫዋች ክፍሎችን ለመመልከት ሲገባ የክፍሎቹን ሁኔታ ይልካል
    socket.emit('rooms_update', getRoomsStatus());

    socket.on('join_room', ({ roomId, userId, name }) => {
        socket.join(roomId);
        const room = rooms[roomId];

        if (room.status === "Playing") {
            socket.emit('error_message', "ጨዋታው ስለተጀመረ ክፍሉ ተዘግቷል! እባክዎ ቀጣዩን ዙር ይጠብቁ።");
            return;
        }

        room.players[socket.id] = { userId, name, board: [] };
        io.emit('rooms_update', getRoomsStatus());

        // ⏱️ የመጀመሪያው ተጫዋች ሲገባ የ45 ሰከንድ ቆጠራ ይጀምራል
        if (Object.keys(room.players).length === 1 && !room.timer) {
            startRoomCountdown(roomId);
        }
    });

    socket.on('disconnect', () => {
        for (let roomId in rooms) {
            if (rooms[roomId].players[socket.id]) {
                delete rooms[roomId].players[socket.id];
                io.emit('rooms_update', getRoomsStatus());
                if (Object.keys(rooms[roomId].players).length === 0) {
                    resetRoom(roomId);
                }
            }
        }
    });
});

function startRoomCountdown(roomId) {
    const room = rooms[roomId];
    room.status = "Waiting";
    room.countdown = 45;

    room.timer = setInterval(() => {
        room.countdown--;
        io.to(roomId).emit('countdown_update', room.countdown);
        io.emit('rooms_update', getRoomsStatus());

        // ሰዓቱ ዜሮ ሲሆን ጨዋታው ይጀመራል፣ ክፍሉ ይዘጋል
        if (room.countdown <= 0) {
            clearInterval(room.timer);
            if (Object.keys(room.players).length >= 1) {
                startBingoGame(roomId);
            } else {
                resetRoom(roomId);
            }
        }
    }, 1000);
}

function startBingoGame(roomId) {
    const room = rooms[roomId];
    room.status = "Playing";
    room.calledNumbers = [];
    io.to(roomId).emit('game_started', { status: "Playing" });

    // የቢንጎ ቁጥሮችን በየ 4 ሰከንዱ ማውጣት መጀመር
    let gameInterval = setInterval(() => {
        if (room.calledNumbers.length >= 75 || Object.keys(room.players).length === 0) {
            clearInterval(gameInterval);
            resetRoom(roomId);
            return;
        }

        let nextNum;
        do { nextNum = Math.floor(Math.random() * 75) + 1; } while (room.calledNumbers.includes(nextNum));
        room.calledNumbers.push(nextNum);

        io.to(roomId).emit('next_number', nextNum);
    }, 4000);
}

function resetRoom(roomId) {
    if (rooms[roomId].timer) clearInterval(rooms[roomId].timer);
    rooms[roomId] = { stake: roomId, players: {}, countdown: 45, status: "Waiting", timer: null, calledNumbers: [] };
    io.emit('rooms_update', getRoomsStatus());
}

function getRoomsStatus() {
    let status = {};
    for (let id in rooms) {
        status[id] = {
            stake: rooms[id].stake,
            activePlayers: Object.keys(rooms[id].players).length,
            countdown: rooms[id].countdown,
            status: rooms[id].status
        };
    }
    return status;
}

server.listen(PORT, () => console.log(`Multiplayer Bingo Server running on port ${PORT}`));
