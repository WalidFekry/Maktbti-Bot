import database_telegram from '../module/database_telegram.js';
import get_database_telegram from '../module/get_database_telegram.js';

export default async function share(client, Markup) {

    client.command("info",async (ctx)  => {

        let but_1 = [Markup.button.url('جروب البوت 🌿', 'https://t.me/appmaktbti'),Markup.button.url('قناة البوت 🌿', 'https://t.me/app_maktbti')];
        let but_2 = [Markup.button.callback('الرجوع للقائمة الرئيسية 🏠', 'start')];
        let button = Markup.inlineKeyboard([but_1, but_2]);
        let message = '- <b>#حول_بوت_مكتبتي 🤖</b> \n\n'
        message += '- هو بوت إسلامي يقدم العديد من الخدمات التي يحتاجها المسلم في يومه 💙\n\n'
        message += `- يمكن المساهمة في تطوير البوت او الابلاغ عن المشاكل او طلب مميزات جديدة عبر مراسلتي على <b><a href="https://t.me/walid_fekry">الخاص 📥</a></b>`

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