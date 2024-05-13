import { Telegraf } from 'telegraf';
import get_database_telegram from './module/get_database_telegram.js';
import error_handling from './module/error_handling.js';
import path from 'path';
import fs from 'fs-extra';

const __dirname = path.resolve();
const config = await fs.readJson(path.join(__dirname, './config.json'));
const options = { channelMode: true, voting: true };
const client = new Telegraf(config?.token_telegram, options);

async function main() {
    
    try {
        // node send.js --message "message"
        const messageIndex = process.argv.indexOf('--message');
        if (messageIndex === -1) {
            throw new Error('Error --message');
        }

        const message = process.argv[messageIndex + 1];
        
        const GetAllUsers = await get_database_telegram("all");
        
        for (const item of GetAllUsers) {
            if (item?.evenPost && item?.permissions?.canSendMessages || item?.type === "private") {
                try {
                    await sendMessageWithRetry(item?.id, message);
                } catch (error) {
                    await error_handling(error, client);
                }
            }
        }
    } catch (error) {
        console.log(error);
    } finally {
        console.log("-------------------------------")
        console.log("Done sent message");
        console.log("-------------------------------")
    }
}

async function sendMessageWithRetry(chatId, message) {
    await sendMediaWithRetry(chatId, message, 'sendMessage');
}

async function sendMediaWithRetry(chatId, media, method, caption) {
    try {
        await client.telegram[method](chatId, media, { parse_mode: 'HTML', caption });
    } catch (error) {
        if (error.response && error.response.ok === false && error.response.error_code === 504) {
            // Timeout de red, reintentar después de un retraso (por ejemplo, 5 segundos)
            console.log("Timeout de red, reintentar después de un retraso (por ejemplo, 5 segundos)");
            setTimeout(() => sendMediaWithRetry(chatId, media, method, caption), 5000);
        } else {
            // Manejar otros errores
            await error_handling(error, client);
        }
    }
}

main();