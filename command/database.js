import get_database_telegram from '../module/get_database_telegram.js';

export default async function database(client, Markup) {

    const getPrivate = await get_database_telegram("private");
    const getGroup = await get_database_telegram("group");
    const getSupergroup = await get_database_telegram("supergroup");
    const getChannel = await get_database_telegram("channel");

    client.command("db_p", async (ctx) => {
        let message = 'قائمة المستخدمين:\n\n';
        if (getPrivate.length <= 30) {
            for (const user of getPrivate) {
                const { id, username, name } = user;
                message += `User ID: ${id}, ${username ? `Username: @${username}` : `name: ${name}`}\n`;
            }
            await ctx.reply(message);
        } else {
            // إذا كان عدد المستخدمين أكبر من 30 أرسلهم بشكل دفعي
            let chunkedUsers = chunkArray(getPrivate, 30);
            for (const chunk of chunkedUsers) {
                message = 'قائمة المستخدمين:\n\n';
                for (const user of chunk) {
                    const { id, username, name } = user;
                    message += `User ID: ${id}, ${username ? `Username: @${username}` : `name: ${name}`}\n`;
                }
                await ctx.reply(message);
            }
        }
    });

    client.command("db_g", async (ctx) => {
        let message = 'قائمة القروبات:\n\n';
        if (getGroup.length <= 30) {
            for (const user of getGroup) {
                const { id, username, name } = user;
                message += `User ID: ${id}, ${username ? `Username: @${username}` : `name: ${name}`}\n`;
            }
            await ctx.reply(message);
        } else {
            // إذا كان عدد المستخدمين أكبر من 30 أرسلهم بشكل دفعي
            let chunkedUsers = chunkArray(getGroup, 30);
            for (const chunk of chunkedUsers) {
                message = 'قائمة القروبات:\n\n';
                for (const user of chunk) {
                    const { id, username, name } = user;
                    message += `User ID: ${id}, ${username ? `Username: @${username}` : `name: ${name}`}\n`;
                }
                await ctx.reply(message);
            }
        }
    });

    client.command("db_sg", async (ctx) => {
        let message = 'قائمة القروبات الفائقة:\n\n';
        if (getSupergroup.length <= 30) {
            for (const user of getSupergroup) {
                const { id, username, name } = user;
                message += `User ID: ${id}, ${username ? `Username: @${username}` : `name: ${name}`}\n`;
            }
            await ctx.reply(message);
        } else {
            // إذا كان عدد المستخدمين أكبر من 30 أرسلهم بشكل دفعي
            let chunkedUsers = chunkArray(getSupergroup, 30);
            for (const chunk of chunkedUsers) {
                message = 'قائمة القروبات الفائقة:\n\n';
                for (const user of chunk) {
                    const { id, username, name } = user;
                    message += `User ID: ${id}, ${username ? `Username: @${username}` : `name: ${name}`}\n`;
                }
                await ctx.reply(message);
            }
        }
    });

    client.command("db_ch", async (ctx) => {
        let message = 'قائمة القنوات:\n\n';
        if (getChannel.length <= 30) {
            for (const user of getChannel) {
                const { id, username, name } = user;
                message += `User ID: ${id}, ${username ? `Username: @${username}` : `name: ${name}`}\n`;
            }
            await ctx.reply(message);
        } else {
            // إذا كان عدد المستخدمين أكبر من 30 أرسلهم بشكل دفعي
            let chunkedUsers = chunkArray(getChannel, 30);
            for (const chunk of chunkedUsers) {
                message = 'قائمة القنوات:\n\n';
                for (const user of chunk) {
                    const { id, username, name } = user;
                    message += `User ID: ${id}, ${username ? `Username: @${username}` : `name: ${name}`}\n`;
                }
                await ctx.reply(message);
            }
        }
    });

    // دالة لتقسيم المصفوفة إلى قطع بحجم معين
    function chunkArray(array, chunkSize) {
        const chunks = [];
        for (let i = 0; i < array.length; i += chunkSize) {
            chunks.push(array.slice(i, i + chunkSize));
        }
        return chunks;
    }
}