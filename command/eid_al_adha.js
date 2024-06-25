import error_handling from '../module/error_handling.js';
import get_database_telegram from '../module/get_database_telegram.js';
import eid_al_adha_generator from '../module/eid_al_adha_generator/index.js';

export default async function eid_al_adha(client, config) {

    client.command("eid_al_adha", async (ctx) => {

        const message_id = ctx?.message?.message_id;

        // Check if the command is sent by the bot owner
        if (!isBotOwner(ctx)) {
            return await ctx.reply('This command can only be executed by the bot owner.', { parse_mode: 'HTML', reply_to_message_id: message_id });
        }

        const userType = ctx.message.text.split(' ')[1]; // Get the user type argument
        if (!userType || !['all', 'private', 'group', 'supergroup', 'channel'].includes(userType)) {
            return await ctx.reply('Invalid user type. Usage: /eid_al_adha &lt;userType&gt;', { parse_mode: 'HTML', reply_to_message_id: message_id });
        }

        // const users = await getDatabaseUsers(userType);
        const users = await get_database_telegram(userType);

        for (const user of users) {
            try {
                const htmlToImageBuffer = await eid_al_adha_generator(user?.name ? user.name : user.username, "./eid_al_adha.jpeg", config.executablePath);
                let caption = `ـ ❁ …\n\n${user?.name ? user.name : user.username}\n\n`
                caption += `دامت بهجة أعيادكم\nوتقبل الله طاعاتكم\nوكل عام وأنتم بأتمِّ\nسرور وعافية`
                await client.telegram["sendPhoto"](user.id, { source: htmlToImageBuffer }, { parse_mode: 'HTML', caption });
            } catch (error) {
                await error_handling(error, client);
            }
        }

    });

    // async function getDatabaseUsers(userType) {
    //     const GetAllUsers = await get_database_telegram(userType);
    //     return GetAllUsers.filter(user => user?.permissions?.canSendMessages || user?.type === "private");
    // }

    // Function to check if the command is sent by the bot owner
    function isBotOwner(ctx) {
        const BOT_OWNER_USERNAME = config.BOT_OWNER_USERNAME; // Replace with your bot's username
        const commandSenderUsername = ctx.message.from.username.toLowerCase();
        return commandSenderUsername === BOT_OWNER_USERNAME.toLowerCase();
    }
}