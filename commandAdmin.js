// commandAdmin.js
import error_handling from './module/error_handling.js';
import get_database_telegram from './module/get_database_telegram.js';

export default async function commandAdmin(client, config) {
  try {
    const VALID_USER_TYPES = ['all', 'private', 'group', 'supergroup', 'channel'];

    // ✅ Utility: Check Bot Owner
    function isBotOwner(ctx) {
      const BOT_OWNER_USERNAME = config.BOT_OWNER_USERNAME;
      return ctx.message.from.username?.toLowerCase() === BOT_OWNER_USERNAME.toLowerCase();
    }

    // ✅ Utility: Retry Wrapper for Telegram API
    async function telegramWithRetry(method, chatId, payload) {
      try {
        await client.telegram[method](chatId, ...payload);
      } catch (error) {
        if (error.response?.error_code === 429) {
          const wait = (error.response.parameters?.retry_after || 5) * 1000;
          console.warn(`⚠️ Rate limit hit. Waiting ${wait / 1000}s...`);
          await new Promise((res) => setTimeout(res, wait));
          return telegramWithRetry(method, chatId, payload);
        }
        if (error.response?.error_code === 504) {
          console.warn("⏳ Timeout. Retrying in 5s...");
          await new Promise((res) => setTimeout(res, 5000));
          return telegramWithRetry(method, chatId, payload);
        }
        await error_handling(error, client);
      }
    }

    // ✅ Generalized Send Function with Batch
    async function sendToUsers(users, sendFn) {
      const BATCH_SIZE = 50;
      const BATCH_DELAY = 2000;

      let sent = 0;
      let failed = 0;

      for (let i = 0; i < users.length; i += BATCH_SIZE) {
        const batch = users.slice(i, i + BATCH_SIZE);

        await Promise.all(
          batch.map(async (user) => {
            try {
              await sendFn(user.id);
              sent++;
            } catch (err) {
              failed++;
              await error_handling(err, client);
            }
          })
        );

        console.log(
          `✅ Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(
            users.length / BATCH_SIZE
          )} done. Waiting ${BATCH_DELAY / 1000}s...`
        );

        if (i + BATCH_SIZE < users.length) {
          await new Promise((res) => setTimeout(res, BATCH_DELAY));
        }
      }

      console.log(`📊 Total: ${users.length} | ✅ Sent: ${sent} | ❌ Failed: ${failed}`);
    }

    // ✅ Fetch Users
    async function getDatabaseUsers(userType) {
      const GetAllUsers = await get_database_telegram(userType);
      return GetAllUsers.filter(
        (user) => user?.permissions?.canSendMessages || user?.type === 'private'
      );
    }

    // ✅ Register Media Command
    function registerMediaCommand(command, type, getMediaFn) {
      client.command(command, async (ctx) => {
        const message_id = ctx?.message?.message_id;

        if (!isBotOwner(ctx)) {
          return ctx.reply('❌ Only bot owner can run this command.', {
            parse_mode: 'HTML',
            reply_to_message_id: message_id,
          });
        }

        const media = getMediaFn(ctx);
        if (!media) return;

        const caption = ctx.message.caption || ctx.message.reply_to_message?.caption || '';
        const userType = ctx.message.text.split(' ')[1];

        if (!VALID_USER_TYPES.includes(userType)) {
          return ctx.reply(`Invalid user type. Usage: /${command} <userType>`, {
            parse_mode: 'HTML',
            reply_to_message_id: message_id,
          });
        }

        const users = await getDatabaseUsers(userType);

        await sendToUsers(users, (chatId) =>
          telegramWithRetry(
            `send${type.charAt(0).toUpperCase() + type.slice(1)}`,
            chatId,
            [media.file_id, { parse_mode: 'HTML', caption }]
          )
        );
      });
    }

    // ✅ Register Text Command
    client.command('sendtext', async (ctx) => {
      const message_id = ctx?.message?.message_id;

      if (!isBotOwner(ctx)) {
        return ctx.reply('❌ Only bot owner can run this command.', {
          parse_mode: 'HTML',
          reply_to_message_id: message_id,
        });
      }

      const userType = ctx.message.text.split(' ')[1];
      const message = ctx.message.text.split(' ').slice(2).join(' ')
        || ctx.message.reply_to_message?.text;

      if (!message || !VALID_USER_TYPES.includes(userType)) {
        return ctx.reply('Invalid usage. Example: /sendtext <userType> <message>', {
          parse_mode: 'HTML',
          reply_to_message_id: message_id,
        });
      }

      const users = await getDatabaseUsers(userType);

      await sendToUsers(users, (chatId) =>
        telegramWithRetry('sendMessage', chatId, [message, { parse_mode: 'HTML' }])
      );
    });

    // ✅ Register All Media Commands
    registerMediaCommand('sendphoto', 'photo', (ctx) => ctx?.message?.reply_to_message?.photo?.[0] || ctx?.message?.photo?.[0]);
    registerMediaCommand('sendvideo', 'video', (ctx) => ctx?.message?.reply_to_message?.video || ctx?.message?.video);
    registerMediaCommand('sendaudio', 'audio', (ctx) => ctx?.message?.reply_to_message?.audio || ctx?.message?.audio);
    registerMediaCommand('senddocument', 'document', (ctx) => ctx?.message?.reply_to_message?.document || ctx?.message?.document);

  } catch (error) {
    console.log(error);
  }
}
