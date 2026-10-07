const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.static('public'));

const PORT = process.env.PORT || 3000;
const TOKEN = process.env.TELEGRAM_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID; // የእርስዎ የቴሌግራም ID ከሬንደር ይነበባል

// የእርስዎ ትክክለኛ የክፍያ መቀበያ መረጃዎች (ሙሉ በሙሉ ኮዱ ውስጥ ተካተዋል)
const TELEBIRR_ACCOUNT = "0944123180";
const TELEBIRR_NAME = "Enyachew Amerga";
const CBE_ACCOUNT = "1000682528641";
const CBE_NAME = "Enyachew Amerga";

const bot = new TelegramBot(TOKEN, { polling: true });

let userBalances = {}; 
let usedTransactions = new Set(); 

// ዋናው ሜኑ (የአራዳ ቢንጎ ቀጥታ ኮፒ በቋሚ በተን)
function sendMainMenu(chatId) {
    bot.sendMessage(chatId, "🎯 **እንኳን ወደ ኢትዮ ቢንጎ ጌም በሰላም መጡ!** \n\nከታች ያሉትን አማራጮች በመጠቀም አካውንትዎን ያስተዳድሩ።", {
        parse_mode: "Markdown",
        reply_markup: {
            keyboard: [
                [{ text: "🎮 Play" }],
                [{ text: "💰 Deposit" }, { text: "🏪 Withdraw" }],
                [{ text: "💳 Check Balance" }],
                [{ text: "👥 Invite" }, { text: "📘 How To Play" }],
                [{ text: "☎️ Contact Us" }, { text: "👥 Join Us" }]
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

    if (text === "💰 Deposit") {
        bot.sendMessage(chatId, `📖 **መመሪያ**\n\n1. በመጀመሪያ ወደዚህ የቴሌብር ቁጥር የፈለጉትን የብር መጠን ያስገቡ፦ \`\${TELEBIRR_ACCOUNT}\`\nስም፦ **\${TELEBIRR_NAME}**\n\n2. ብሩን ሲልኩ ከቴሌብር የደረሰዎትን አጭር የጽሁፍ መልዕክት (sms) ሙሉ በሙሉ ኮፒ (copy) በማድረግ እዚህ ላይ ይላኩት።\n\n3. ሲስተሙ መልዕክቱን አንብቦ በራስ-ሰር ብሩን ያስገባልዎታል።`);
    }
    else if (text === "🏪 Withdraw") {
        if (userBalances[chatId] <= 0) {
            return bot.sendMessage(chatId, "⚠️ ይቅርታ፣ ማውጣት የሚችሉት ሂሳብ የለዎትም።");
        }
        bot.sendMessage(chatId, "💸 እባክዎ ማውጣት የሚፈልጉትን የብር መጠን እና የባንክ አካውንትዎን በዚህ መልክ ይጻፉ፦\n\n`Withdraw [የብር መጠን] [ባንክ ስም] [አካውንት ቁጥር]`");
    }
    else if (text === "💳 Check Balance") {
        bot.sendMessage(chatId, `💰 **የአሁኑ የሂሳብዎ መጠን፦ \${userBalances[chatId].toFixed(2)} ETB**`, { parse_mode: "Markdown" });
    }
    else if (text === "🎮 Play") {
        bot.sendMessage(chatId, "🎮 ጨዋታውን ለመጀመር ከታች ያለውን ቁልፍ ይጫኑ፦", {
            reply_markup: {
                inline_keyboard: [[
                    { text: "🎰 መጫወቻ ሰሌዳውን ክፈት", web_app: { url: `https://onrender.com` } } 
                ]]
            }
        });
    }
    // 📱 ከቴሌብር የመጣን ሙሉ የኤስኤምኤስ (SMS) ጽሑፍ በራስ-ሰር የማንበብ ሎጅክ
    else if (text && (text.includes("Telebirr") || text.includes("transferred") || text.includes("የቴሌብር") || text.includes("Transaction"))) {
        // የትራንዛክሽን ቁጥሩን (Txn ID) ከጽሑፉ ውስጥ ፈልጎ ማውጫ (Regex)
        const txnMatch = text.match(/\b([A-Z0-9]{10,12})\b/);
        // የብር መጠኑን ከጽሑፉ ውስጥ ፈልጎ ማውጫ
        const amountMatch = text.match(/(?:ETB|ብር)\s*([\d.]+)/i) || text.match(/([\d.]+)\s*(?:ETB|ብር)/i);

        if (!txnMatch) {
            return bot.sendMessage(chatId, "❌ ይቅርታ፣ የላኩት የኤስኤምኤስ ጽሑፍ ትክክለኛውን የትራንዛክሽን ቁጥር መያዙን ማረጋገጥ አልተቻለም። እባክዎ ሙሉውን ኮፒ አድርገው ይላኩ።");
        }

        const txnId = txnMatch[1];
        let amount = amountMatch ? parseFloat(amountMatch[1]) : 50; // ካልተገኘ መሠረታዊ 50 ብር ይወስዳል

        if (usedTransactions.has(txnId)) {
            return bot.sendMessage(chatId, "❌ ይህ የትራንዛክሽን ቁጥር ቀደም ብሎ ጥቅም ላይ ውሏል!");
        }

        usedTransactions.add(txnId);
        bot.sendMessage(chatId, `🔄 የትራንዛክሽን ቁጥር \`\${txnId}\` እየተመረመረ ነው... እባክዎ የአድሚኑን ማረጋገጫ ይጠብቁ።`, { parse_mode: "Markdown" });
        
        // ለእርስዎ (ለአድሚኑ) የማረጋገጫ ቁልፍ ይልካል
        bot.sendMessage(ADMIN_CHAT_ID, `📥 **አውቶማቲክ የዲፖዚት ጥያቄ**\n\n👤 ተጫዋች ID: \`\${chatId}\`\n🔍 የተነበበ Txn ID: \`\${txnId}\`\n💰 የተነበበ የብር መጠን: \`\${amount} ETB\`\n\nእባክዎ ብሩ መግባቱን ካረጋገጡ በኋላ ያጽድቁ።`, {
            parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: [
                    [{ text: `✅ \${amount} ብር አውርድለት`, callback_data: `approve_dep_\${chatId}_\${amount}_\${txnId}` }],
                    [{ text: "❌ ውድቅ አድርግ (Reject)", callback_data: `reject_dep_\${chatId}` }]
                ]
            }
        });
    }
});

bot.on('callback_query', (callbackQuery) => {
    const msg = callbackQuery.message;
    const data = callbackQuery.data;

    if (data.startsWith("approve_dep_")) {
        const [,, targetChatId, amount, txn] = data.split("_");
        userBalances[targetChatId] = (userBalances[targetChatId] || 0) + parseFloat(amount);
        bot.sendMessage(targetChatId, `✅ **የዲፖዚት ጥያቄዎ ጸድቋል!**\n\n💰 \`\${amount} ETB\` ወደ አካውንትዎ ገቢ ሆኗል። አሁን መጫወት ይችላሉ!`, { parse_mode: "Markdown" });
        bot.sendMessage(ADMIN_CHAT_ID, `🟢 ለተጫዋች \`\${targetChatId}\` \${amount} ብር በተሳካ ሁኔታ አጽድቀውለታል።`, { parse_mode: "Markdown" });
        bot.answerCallbackQuery(callbackQuery.id);
    }
    else if (data.startsWith("reject_dep_")) {
        const targetChatId = data.split("_")[2];
        bot.sendMessage(targetChatId, `❌ ይቅርታ፣ የላኩት የኤስኤምኤስ ጽሑፍ መረጃ በአድሚኑ ውድቅ ተደርጓል። እባክዎ ትክክለኛውን መልዕክት መላክዎን ያረጋግጡ።`);
        bot.sendMessage(ADMIN_CHAT_ID, `🔴 የዲፖዚት ጥያቄውን ውድቅ አድርገዋል።`);
        bot.answerCallbackQuery(callbackQuery.id);
    }
});

app.listen(PORT, () => console.log(`Arada SMS Style Bingo Server Running`));
