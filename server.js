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

// 🎰 የአራዳ ቢንጎ ትክክለኛ የክፍሎች አወቃቀር (የተለያዩ ሰከንዶች እና በሰው ልክ የሚጨምር ደርሻ)
let rooms = {
    10: { stake: 10, basePlayers: 12, countdown: 45, status: "Waiting", calledNumbers: [] },
    20: { stake: 20, basePlayers: 5, countdown: 30, status: "Waiting", calledNumbers: [] },
    50: { stake: 50, basePlayers: 62, countdown: 15, status: "Waiting", calledNumbers: [] }
};

let userBalances = {};

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    if (!userBalances[chatId]) userBalances[chatId] = 59; // የእርስዎ ባላንስ 59 ETB
    bot.sendMessage(chatId, "🎯 **እንኳን ወደ ኢትዮ ቢንጎ ጌም በሰላም መጡ!**", {
        reply_markup: {
            keyboard: [[{ text: "🎮 Play" }], [{ text: "💰 Deposit" }, { text: "🏪 Withdraw" }]],
            resize_keyboard: true
        }
    });
});

bot.on('message', (msg) => {
    if (msg.text === "🎮 Play") {
        bot.sendMessage(msg.chat.id, "🎰 ጨዋታውን ለመጀመር የሊንክ ቁልፉን ይጫኑ፦", {
            reply_markup: { inline_keyboard: [[{ text: "🚀 Open Mini App", web_app: { url: `https://onrender.com` } }]] }
        });
    }
});

// ⏱️ እያንዳንዱ ክፍል በተለያየ ሰዓት እንዲቆጥር የማድረጊያ ሉፕ
setInterval(() => {
    for (let id in rooms) {
        let room = rooms[id];
        if (room.status === "Waiting") {
            room.countdown--;
            
            // የሰው ብዛት በየሰከንዱ በዘፈቀደ ትንሽ እንዲጨምር/እንዲቀንስ (ሰው እንደሚበዛ ለማሳየት)
            if (Math.random() > 0.7) {
                room.basePlayers += Math.floor(Math.random() * 3) - 1;
                if (room.basePlayers < 0) room.basePlayers = 0;
            }

            // ሰዓቱ ዜሮ ሲሆን ጨዋታውን አስጀምሮ ክፍሉን መዝጋት
            if (room.countdown <= 0) {
                room.status = "Playing";
                room.countdown = 0;
                setTimeout(() => { resetRoom(id); }, 15000); // ከ15 ሰከንድ ጨዋታ በኋላ ክፍሉን መልሰህ ክፈት
            }
        }
    }
    io.emit('rooms_update', getRoomsStatus());
}, 1000);

function resetRoom(id) {
    rooms[id].countdown = Math.floor(Math.random() * 20) + 30; // አዲስ የዘፈቀደ ሰከንድ መጀመሪያ መሥሪያ (እንዳይገናኙ)
    rooms[id].status = "Waiting";
    rooms[id].basePlayers = Math.floor(Math.random() * 20) + 5;
}

function getRoomsStatus() {
    let status = {};
    for (let id in rooms) {
        let room = rooms[id];
        // 💰 የደርሻ (Derash) ስሌት = የሰው ብዛት x ስቴክ x 80% (የ20% ኮሚሽን ተቀንሶ)
        let derashAmount = room.basePlayers * room.stake * 0.80;
        status[id] = {
            stake: room.stake,
            activePlayers: room.basePlayers,
            derash: derashAmount > 0 ? Math.floor(derashAmount) : 0,
            countdown: room.countdown,
            status: room.status
        };
    }
    return status;
}

io.on('connection', (socket) => {
    socket.emit('rooms_update', getRoomsStatus());
});

server.listen(PORT, () => console.log(`Arada Perfect Copy Backend Running`));
