import database_telegram from '../module/database_telegram.js';


export default async (client, Markup) => {

    client.action("share", async (ctx) => {

        let but_1 = [Markup.button.callback('الرجوع للقائمة الرئيسية 🏠', 'start')];
        let button = Markup.inlineKeyboard([but_1]);
        let message = '- <b>#مشاركة_بوت_مكتبتي 🤖</b> \n\n'
        message += '▪️ انشروا البوت بينكم فالدال على الخير كفاعله ❤️ \n'
        message += 'رابط البوت: https://t.me/maktbti_bot'

        await database_telegram({
            id: ctx?.chat?.id,
            username: ctx?.chat?.username,
            name: ctx?.chat?.first_name ? ctx?.chat?.first_name : ctx?.chat?.last_name ? ctx?.chat?.last_name : ctx?.chat?.title,
            type: ctx?.chat?.type,
            message_id: ctx?.message?.message_id
        }, client);

        await ctx.reply(message, {
            parse_mode: 'HTML',
            reply_markup: button.reply_markup,
            disable_web_page_preview: true,
        });
    });
}