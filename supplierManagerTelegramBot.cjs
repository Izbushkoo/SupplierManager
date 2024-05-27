// const dotenv = require('dotenv');
// dotenv.config({ path: '.env.dev' });

// const TelegramBot = require('node-telegram-bot-api');

// const botToken = process.env.TELEGRAM_BOT_TOKEN;
// const bot = new TelegramBot(botToken, {polling: true});

// let updateControl = { stop: false };

// bot.onText(/\/start/, (msg) => {
//     const opts = {
//         reply_markup: {
//             inline_keyboard: [
//                 [
//                     {
//                         text: 'Update suppliers',
//                         callback_data: 'update'
//                     },
//                     {
//                         text: 'Stop update',
//                         callback_data: 'stop'
//                     }
//                 ]
//             ]
//         }
//     };

//     bot.sendMessage(msg.chat.id, 'What would you like to do?', opts);
// });

// bot.on('callback_query', (callbackQuery) => {
//     const msg = callbackQuery.message;
//     const data = callbackQuery.data;

//     if (data === 'update') {
//         updateControl.stop = false;
//         import('./update.js').then(update => {
//             update.updateAllSuppliers(updateControl)
//             .then(() => bot.sendMessage(msg.chat.id, 'Update script completed successfully.'))
//             .catch(error => bot.sendMessage(msg.chat.id, `Error running update: ${error}`));
//         });
//     } else if (data === 'stop') {
//         updateControl.stop = true;
//         bot.sendMessage(msg.chat.id, 'Update process will be stopped.');
//     }
// });

const dotenv = require('dotenv');
dotenv.config({ path: '.env.dev' });

const TelegramBot = require('node-telegram-bot-api');

const botToken = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(botToken, {polling: true});

let updateControl = { stop: false };

bot.onText(/\/start/, (msg) => {
    const opts = {
        reply_markup: {
            inline_keyboard: [
                [
                    {
                        text: '🔄 w/ multiplier',
                        callback_data: 'update_with_multiplier'
                    },
                    {
                        text: '🔄 w/o multiplier',
                        callback_data: 'update_without_multiplier'
                    },
                    {
                        text: '🛑 Stop',
                        callback_data: 'stop'
                    }
                ]
            ]
        }
    };

    bot.sendMessage(msg.chat.id, 'What would you like to do?', opts);
});

bot.on('callback_query', (callbackQuery) => {
    const msg = callbackQuery.message;
    const data = callbackQuery.data;

    if (data === 'update_without_multiplier') {
        // Start the update process without any multiplier (default of 1)
        startUpdate(msg.chat.id);

    } else if (data === 'update_with_multiplier') {
        bot.sendMessage(msg.chat.id, 'Please provide the multiplier value (e.g., 0.85).');
        bot.once('message', (msg) => {
            const multiplierValue = parseFloat(msg.text);
            if (!isNaN(multiplierValue) && multiplierValue > 0 && multiplierValue <= 1) {
                // Start the update process with the multiplier
                startUpdate(msg.chat.id, multiplierValue);
            } else {
                bot.sendMessage(msg.chat.id, 'Invalid multiplier. Please provide a valid number between 0 and 1.');
            }
        });
    } else if (data === 'stop') {
        updateControl.stop = true;
        bot.sendMessage(msg.chat.id, 'Update process will be stopped.');
    }
});

function startUpdate(chatId, multiplier = 1) {
    console.log('Starting update with multiplier:', multiplier);
    import('./update.js').then(update => {
        update.updateAllSuppliers(updateControl, multiplier)
        .then(() => {
            if (multiplier == 1) {
                bot.sendMessage(chatId, 'Update script without multiplier completed successfully.');
            } else {
                bot.sendMessage(chatId, `Update script with multiplier ${multiplier} completed successfully.`);
            }
        })
        .catch(error => bot.sendMessage(chatId, `Error running update: ${error}`));
    });
}