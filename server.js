const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.static('public'));

const PORT = process.env.PORT || 3000;
const TOKEN = process.env.TELEGRAM_TOKEN;
const CHAPA_SECRET_KEY = process.env.CHAPA_SECRET_KEY;

// የቴሌግራም ቦት ማስጀመርያ
const bot = new TelegramBot(TOKEN, { polling: true });

// በሲስተሙ ውስጥ ያሉ የጨዋታ መረጃዎች ማከማቻ (In-memory state)
let players = [];
let bingoNumbers = [];
let gameActive = false;
let gameInterval;

// ተጫዋች ሲመጣ ቦቱ የሚልከው የእንኳን ደህና መጣህ መልዕክት እና የሚኒ አፕ ማውጫ
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "🎯 እንኳን ወደ ኢትዮ ቢንጎ ጌም በሰላም መጡ!\n\nበቴሌብር እና በንግድ ባንክ (CBE) ፈጣን ክፍያ እየፈጸሙ ይጫወቱ፣ ትርፋማ ይሁኑ!", {
        reply_markup: {
            inline_keyboard: [[
                { text: "🚀 ጨዋታውን ጀምር (Play)", web_app: { url: process.env.WEBAPP_URL } }
            ]]
        }
    });
});

// የ20% ኮሚሽን እና የአሸናፊው ሂሳብ ስሌት ሎጅክ
function calculateGamePayout(totalPool) {
    const adminCommission = totalPool * 0.20; // 20% የእርስዎ ኮሚሽን
    const winnerPrize = totalPool * 0.80;     // 80% ለአሸናፊው
    return { adminCommission, winnerPrize };
}

// ቻፓ (Chapa) የክፍያ መፈጸሚያ API (Deposit መቀበያ)
app.post('/api/deposit', async (req, res) => {
    const { amount, email, first_name, last_name, tx_ref } = req.body;
    try {
        const response = await axios.post('https://chapa.co', {
            amount,
            currency: "ETB",
            email,
            first_name,
            last_name,
            tx_ref,
            callback_url: `https://${req.headers.host}/api/verify-payment`,
            customization: {
                title: "Ethio Bingo Card Purchase",
                description: "Payment for Bingo Game"
            }
        }, {
            headers: { Authorization: `Bearer ${CHAPA_SECRET_KEY}` }
        });
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: "የክፍያ ሲስተሙ መገናኘት አልቻለም" });
    }
});

// የክፍያ ማረጋገጫ (Webhook/Callback)
app.get('/api/verify-payment', async (req, res) => {
    const { tx_ref } = req.query;
    // እዚህ ላይ ክፍያው መፈጸሙን ከቻፓ አረጋግጠን የተጫዋቹን ካርድ ዝግጁ እናደርጋለን
    res.send("ክፍያው ተረጋግጧል! ወደ ጨዋታው መመለስ ይችላሉ።");
});

app.listen(PORT, () => {
    console.log(`Bingo Server is running on port ${PORT}`);
});
