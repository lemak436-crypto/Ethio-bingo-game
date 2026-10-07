const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.static('public'));

const PORT = process.env.PORT || 3000;
const TOKEN = process.env.TELEGRAM_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID; // የእርስዎ የቴሌግራም ID ቁጥር ከሬንደር ይነበባል

// የእርስዎ ትክክለኛ የክፍያ መቀበያ መረጃዎች (ሙሉ በሙሉ ኮዱ ውስጥ ተካተዋል)
const TELEBIRR_ACCOUNT = "0944123180";
const TELEBIRR_NAME = "Enyachew Amerga";
const CBE_ACCOUNT = "1000682528641";
const CBE_NAME = "Enyachew Amerga";

const bot = new TelegramBot(TOKEN, { polling: true });

// የተጫዋቾች ሂሳብ እና የትራንዛክሽን መመዝገቢያ ማህደር
let userBalances = {}; 
let usedTransactions = new Set(); 

function sendMainMenu(chatId) {
    bot.sendMessage(chatId, "🎯 **እንኳን ወደ ኢትዮ ቢንጎ ጌም በሰላም መጡ!** \n\nከታች ያሉትን አማራጮች በመጠቀም አካውንትዎን ያስተዳድሩ።", {
        parse_mode: "Markdown",
        reply_markup: {
            keyboard: [
                [{ text: "🚀 ጨዋታውን ጀምር (Play)" }],
                [{ text: "💰 ገንዘብ አስገባ (Deposit)" }, { text: "💸 ብር አውጣ (Withdraw)" }],
                [{ text: "📊 የእኔ ሂሳብ (Balance)" }]
            ],
            resize_keyboard: true
        }
    });
}

bot.onText(/\/start/, (msg) => {
    if (!userBalances[msg.chat.id]) userBalances[msg.chat.id] = 0;
    sendMainMenu(msg.chat.id);
});

bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    if (!userBalances[chatId]) userBalances[chatId] = 0;

    if (text === "💰 ገንዘብ አስገባ (Deposit)") {
        bot.sendMessage(chatId, "💸 እባክዎ የክፍያ መንገድ ይምረጡ፦", {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "📱 በቴሌብር (Telebirr)", callback_data: "dep_telebirr" }],
                    [{ text: "🏦 በንግድ ባንክ (CBE)", callback_data: "dep_cbe" }]
                ]
            }
        });
    }
    else if (text === "💸 ብር አውጣ (Withdraw)") {
        if (userBalances[chatId] <= 0) {
            return bot.sendMessage(chatId, "⚠️ ይቅርታ፣ ማውጣት የሚችሉት ሂሳብ የለዎትም።");
        }
        bot.sendMessage(chatId, "🏦 የት ላይ መላክ አለበት? ይምረጡ፦", {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "📱 በቴሌብር ማውጫ", callback_data: "with_telebirr" }],
                    [{ text: "🏦 በንግድ ባንክ ማውጫ", callback_data: "with_cbe" }]
                ]
            }
        });
    }
    else if (text === "📊 የእኔ ሂሳብ (Balance)") {
        bot.sendMessage(chatId, `💰 **የአሁኑ የሂሳብዎ መጠን፦ ${userBalances[chatId].toFixed(2)} ETB**`, { parse_mode: "Markdown" });
    }
    else if (text === "🚀 ጨዋታውን ጀምር (Play)") {
        bot.sendMessage(chatId, "🎮 ጨዋታውን ለመጀመር ከታች ያለውን ቁልፍ ይጫኑ፦", {
            reply_markup: {
                inline_keyboard: [[
                    { text: "🎰 መጫወቻ ሰሌዳውን ክፈት", web_app: { url: `https://onrender.com` } } 
                ]]
            }
        });
    }
    // ተጫዋቹ የባንክ ትራንዛክሽን ፅሁፍ (Txn ID) በቀጥታ ሲልክ
    else if (text && (text.toUpperCase().startsWith("FT") || text.toUpperCase().startsWith("R") || text.toUpperCase().startsWith("N"))) {
        const txnId = text.trim().toUpperCase();
        if (usedTransactions.has(txnId)) {
            return bot.sendMessage(chatId, "❌ ይህ የትራንዛክሽን ቁጥር ቀደም ብሎ ጥቅም ላይ ውሏል!");
        }
        usedTransactions.add(txnId);
        bot.sendMessage(chatId, "🔄 ትራንዛክሽኑ እየተመረመረ ነው... እባክዎ የአድሚኑን ማረጋገጫ ይጠብቁ።");
        
        // ለአድሚኑ (ለእርስዎ) ማረጋገጫ መልዕክት ይልካል
        bot.sendMessage(ADMIN_CHAT_ID, `📥 **አዲስ የዲፖዚት ጥያቄ**\n\n ተጫዋች ቴሌግራም ID: \`\${chatId}\`\n የላከው Txn ID: \`\${txnId}\`\n\nእባክዎ ባንክዎን አይተው ብሩ መግባቱን ካረጋገጡ በኋላ ያጽድቁ።`, {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "✅ 50 ብር አውርድለት", callback_data: `approve_dep_\${chatId}_50_\${txnId}` }],
                    [{ text: "✅ 100 ብር አውርድለት", callback_data: `approve_dep_\${chatId}_100_\${txnId}` }],
                    [{ text: "❌ ውድቅ አድርግ (Reject)", callback_data: `reject_dep_\${chatId}` }]
                ]
            }
        });
    }
});

bot.on('callback_query', (callbackQuery) => {
    const msg = callbackQuery.message;
    const chatId = msg.chat.id;
    const data = callbackQuery.data;

    if (data === "dep_telebirr") {
        bot.sendMessage(chatId, `📱 **በቴሌብር ገንዘብ ማስገቢያ**\n\n1. ወደዚህ የቴሌብር ቁጥር ብር ያስተላልፉ፦ \`\${TELEBIRR_ACCOUNT}\`\n2. ስም፦ **\${TELEBIRR_NAME}**\n\n3. ብር ካስተላለፉ በኋላ ከቴሌብር የደረሰዎትን የትራንዛክሽን ቁጥር (Txn ID) ለምሳሌ (\`R12345...\`) ቀጥታ እዚህ ቦቱ ላይ በጽሑፍ ብቻ ይላኩት። ቦቱ መርምሮ ያሳውቀናል።`);
    }
    else if (data === "dep_cbe") {
        bot.sendMessage(chatId, `🏦 **በባንክ ገንዘብ ማስገቢያ**\n\n1. ወደዚህ የንግድ ባንክ አካውንት ብር ያስተላልፉ፦ \`\${CBE_ACCOUNT}\`\n2. ስም፦ **\${CBE_NAME}**\n\n3. ብር ካስተላለፉ በኋላ ከባንክ የደረሰዎትን የትራንዛክሽን ቁጥር (Txn ID) ለምሳሌ (\`FT1234...\`) ቀጥታ እዚህ ቦቱ ላይ በጽሑፍ ብቻ ይላኩት።`);
    }
    else if (data.startsWith("approve_dep_")) {
        const [,, targetChatId, amount, txn] = data.split("_");
        userBalances[targetChatId] = (userBalances[targetChatId] || 0) + parseFloat(amount);
        bot.sendMessage(targetChatId, `✅ **የዲፖዚት ጥያቄዎ ጸድቋል!**\n\n💰 \`\${amount} ETB\` ወደ አካውንትዎ ገቢ ሆኗል። አሁን መጫወት ይችላሉ!`, { parse_mode: "Markdown" });
        bot.sendMessage(ADMIN_CHAT_ID, `🟢 ለተጫዋች \`\${targetChatId}\` \${amount} ብር በተሳካ ሁኔታ አጽድቀውለታል።`, { parse_mode: "Markdown" });
        bot.answerCallbackQuery(callbackQuery.id);
    }
    else if (data.startsWith("reject_dep_")) {
        const targetChatId = data.split("_");
        bot.sendMessage(targetChatId, `❌ ይቅርታ፣ የላኩት ትራንዛክሽን በአድሚኑ ውድቅ ተደርጓል። እባክዎ ትክክለኛውን ቁጥር መላክዎን ያረጋግጡ።`);
        bot.sendMessage(ADMIN_CHAT_ID, `🔴 የዲፖዚት ጥያቄውን ውድቅ አድርገዋል።`);
        bot.answerCallbackQuery(callbackQuery.id);
    }
    else if (data === "with_telebirr" || data === "with_cbe") {
        bot.sendMessage(chatId, "💸 እባክዎ ማውጣት የሚፈልጉትን የብር መጠን ብቻ በቁጥር ይጻፉ (ለምሳሌ፦ `100`)።");
    }
});

app.listen(PORT, () => console.log(`Arada Style Bingo Server Running`));
