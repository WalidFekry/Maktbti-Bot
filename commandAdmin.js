import error_handling from './module/error_handling.js';
import get_database_telegram from './module/get_database_telegram.js';

export default async function commandAdmin(client, config) {
    try {

        // Command to send multiple photos to all specified users
        client.command('sendphoto', async (ctx) => {
            try {
                const message_id = ctx?.message?.message_id;
                // Check if the command is sent by the bot owner
                if (!isBotOwner(ctx)) {
                    return await ctx.reply('This command can only be executed by the bot owner.', { parse_mode: 'HTML', reply_to_message_id: message_id });
                }

                const photo = ctx?.message?.reply_to_message?.photo?.[0] || ctx?.message?.photo?.[0];
                if (!photo) return
                const caption = ctx.message.caption || ctx.message.reply_to_message.caption || '';
                const userType = ctx.message.text.split(' ')[1];


                if (!userType || !['all', 'private', 'group', 'supergroup', 'channel'].includes(userType)) {
                    return await ctx.reply('Invalid user type. Usage: /sendphoto &lt;userType&gt;', { parse_mode: 'HTML', reply_to_message_id: message_id });

                }

                const users = await getDatabaseUsers(userType);
                await sendMediaToAll(users, 'photo', photo, caption); // Pass photo array instead of single photo
            } catch (error) {
                console.log(error);
            }
        });

        // Command to send multiple videos to all specified users
        client.command('sendvideo', async (ctx) => {
            try {
                const message_id = ctx?.message?.message_id;
                // Check if the command is sent by the bot owner
                if (!isBotOwner(ctx)) {
                    return await ctx.reply('This command can only be executed by the bot owner.', { parse_mode: 'HTML', reply_to_message_id: message_id });
                }

                const video = ctx?.message?.reply_to_message?.video || ctx?.message?.video;
                if (!video) return
                const caption = ctx.message.caption || ctx.message.reply_to_message.caption || '';
                const userType = ctx.message.text.split(' ')[1]; // Get the user type argument

                if (!userType || !['all', 'private', 'group', 'supergroup', 'channel'].includes(userType)) {
                    return await ctx.reply('Invalid user type. Usage: /sendvideo &lt;userType&gt;', { parse_mode: 'HTML', reply_to_message_id: message_id });

                }

                const users = await getDatabaseUsers(userType);
                await sendMediaToAll(users, 'video', video, caption); // Pass video as array with single item
            } catch (error) {
                console.log(error);
            }
        });

        // Command to send multiple audio files to all specified users
        client.command('sendaudio', async (ctx) => {
            try {
                const message_id = ctx?.message?.message_id;
                // Check if the command is sent by the bot owner
                if (!isBotOwner(ctx)) {
                    return await ctx.reply('This command can only be executed by the bot owner.', { parse_mode: 'HTML', reply_to_message_id: message_id });
                }

                const audio = ctx?.message?.reply_to_message?.audio || ctx?.message?.audio;
                if (!audio) return
                const caption = ctx.message.caption || ctx.message.reply_to_message.caption || '';
                const userType = ctx.message.text.split(' ')[1]; // Get the user type argument

                if (!userType || !['all', 'private', 'group', 'supergroup', 'channel'].includes(userType)) {
                    return await ctx.reply('Invalid user type. Usage: /sendaudio &lt;userType&gt;', { parse_mode: 'HTML', reply_to_message_id: message_id });
                }

                const users = await getDatabaseUsers(userType);
                await sendMediaToAll(users, 'audio', audio, caption); // Pass audio as array with single item
            } catch (error) {
                console.log(error);
            }
        });

        // Command to send multiple documents (PDFs) to all specified users
        client.command('senddocument', async (ctx) => {
            try {
                const message_id = ctx?.message?.message_id;
                // Check if the command is sent by the bot owner
                if (!isBotOwner(ctx)) {
                    return await ctx.reply('This command can only be executed by the bot owner.', { parse_mode: 'HTML', reply_to_message_id: message_id });
                }

                const document = ctx?.message?.reply_to_message?.document || ctx?.message?.document;
                if (!document) return
                const caption = ctx.message.caption || ctx.message.reply_to_message.caption || '';
                const userType = ctx.message.text.split(' ')[1]; // Get the user type argument

                if (!userType || !['all', 'private', 'group', 'supergroup', 'channel'].includes(userType)) {
                    return await ctx.reply('Invalid user type. Usage: /senddocument &lt;userType&gt;', { parse_mode: 'HTML', reply_to_message_id: message_id });
                }

                const users = await getDatabaseUsers(userType);
                await sendMediaToAll(users, 'document', document, caption); // Pass document as array with single item
            } catch (error) {
                console.log(error);
            }
        });

        // Command to send text message to all specified users
        client.command('sendtext', async (ctx) => {
            try {
                const message_id = ctx?.message?.message_id;
                // Check if the command is sent by the bot owner
                if (!isBotOwner(ctx)) {
                    return await ctx.reply('This command can only be executed by the bot owner.', { parse_mode: 'HTML', reply_to_message_id: message_id });
                }

                const message = ctx.message.text.split(' ').slice(2).join(' ') || ctx.message.reply_to_message?.text // Get text message from command
                if (!message) return
                const userType = ctx.message.text.split(' ')[1]; // Get the user type argument

                if (!userType || !['all', 'private', 'group', 'supergroup', 'channel'].includes(userType)) {
                    return await ctx.reply('Invalid user type. Usage: /sendtext &lt;userType&gt;', { parse_mode: 'HTML', reply_to_message_id: message_id });
                }

                const users = await getDatabaseUsers(userType);
                await sendMessageToAll(users, message); // Send text message to all users
            } catch (error) {
                console.log(error);
            }
        });

        // Function to fetch users from database based on user type
        async function getDatabaseUsers(userType) {
            const GetAllUsers = await get_database_telegram(userType);
            return GetAllUsers.filter(user => user?.permissions?.canSendMessages || user?.type === "private");
        }

        // Function to send multiple media files to all users
        async function sendMediaToAll(users, type, media, caption = '') {
            for (const user of users) {
                try {
                    await sendMediaWithRetry(user.id, media.file_id, `send${type.charAt(0).toUpperCase() + type.slice(1)}`, caption);
                } catch (error) {
                    await error_handling(error, client);
                }
            }
        }

        // Function to send text message to all users
        async function sendMessageToAll(users, message) {
            for (const user of users) {
                try {
                    await sendMessageWithRetry(user.id, message, 'sendMessage');
                } catch (error) {
                    await error_handling(error, client);
                }
            }
        }

        // Function to send media with retry mechanism
        async function sendMediaWithRetry(chatId, media, method, caption = '') {
            try {
                await client.telegram[method](chatId, media, { parse_mode: 'HTML', caption });
            } catch (error) {
                if (error.response && error.response.ok === false && error.response.error_code === 504) {
                    console.log("Network timeout, retry after a delay (e.g., 5 seconds)");
                    setTimeout(() => sendMediaWithRetry(chatId, media, method, caption), 5000);
                } else {
                    await error_handling(error, client);
                }
            }
        }

        // Function to send message with retry mechanism
        async function sendMessageWithRetry(chatId, message, method) {
            try {
                await client.telegram[method](chatId, message, { parse_mode: 'HTML' });
            } catch (error) {
                if (error.response && error.response.ok === false && error.response.error_code === 504) {
                    console.log("Network timeout, retry after a delay (e.g., 5 seconds)");
                    setTimeout(() => sendMessageWithRetry(chatId, message, method), 5000);
                } else {
                    await error_handling(error, client);
                }
            }
        }

        // Function to check if the command is sent by the bot owner
        function isBotOwner(ctx) {
            const BOT_OWNER_USERNAME = config.BOT_OWNER_USERNAME; // Replace with your bot's username
            const commandSenderUsername = ctx.message.from.username.toLowerCase();
            return commandSenderUsername === BOT_OWNER_USERNAME.toLowerCase();
        }
    } catch (error) {
        console.log(error);
    }
}
