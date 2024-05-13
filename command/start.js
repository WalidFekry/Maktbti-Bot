import database_telegram from '../module/database_telegram.js';
import get_database_telegram from '../module/get_database_telegram.js';

export default async function end(client, Markup) {

    client.start(async (ctx) => {

        const id_from = ctx?.from?.id;
        const id_chat = ctx?.chat?.id;
        const username_from = ctx?.from?.username;
        const username_chat = ctx?.chat?.username;
        const name_from = ctx?.from?.first_name ?? ctx?.from?.last_name ?? undefined;
        const name_chat = ctx?.chat?.first_name ?? ctx?.chat?.last_name ?? ctx?.chat?.title;
        const name_bot = ctx?.botInfo?.first_name;
        const type = ctx?.chat?.type;
        const message_id = ctx?.message?.message_id;
        const getUserAll = await get_database_telegram("all");
        const getSupergroup = await get_database_telegram("supergroup");
        const getChannel = await get_database_telegram("channel");
        let message = `مرحباً بك يا ${name_chat ? name_chat : `@${username_chat}`} في  ${name_bot} 👋 \n\n`
        message += 'يقدم هذا البوت العديد من الخدمات التي يحتاجها المسلم في يومه 🌸\n\n'
        message += '1- القرآن الكريم 📖 \n'
        message += '2- الأذكار 📿 \n'
        message += '3- فيديوهات قرآن عشوائية 🎥 \n'
        message += '4- صورة عشوائية 🖼️ \n'
        message += '5- أسماء الله الحسنى ✨ \n'
        message += '6- بطاقات القرآن 🎴 \n'
        message += '7- حصن المسلم 🏰 \n'
        message += '8- آية وتفسير 🌾 \n'
        message += '9- فتاوى ابن باز رحمه الله 🔊 \n'
        message += '10- اسئلة دينية ⁉️ \n'
        message += '11- التاريخ الهجري 📅 \n'
        message += '12- الرقية الشرعية🌸\n\n'
        message += 'إحصائيات البوت ⚡\n\n'
        message += `عدد المحادثات : ${getUserAll.length}\n`
        message += `عدد المجموعات : ${getSupergroup.length}\n`
        message += `عدد القنوات : ${getChannel.length}\n\n`
        message += 'صلاحيات البوت ⚠️\n\n'
        message += '- .المجموعات: اذا كانت المجموعة عامة ومسموح فيها بالكتابة لا يحتاج البوت الى صلاحيات اما اذا كانت المجموعة مقيدة يجب ان يمتلك البوت صلاحية الكتابة\n\n'
        message += '- .القنوات: يجب ان يكون البوت مشرف ويمتلك صلاحية الكتابة\n\n'
        message += 'لتفعيل النشر التلقائي ارسل كلمة "تفعيل" ✅\n'
        message += 'لإيقاف النشر التلقائي ارسل كلمة "تعطيل" 🚫\n \n'
        message += 'قم بالتنقل بين الخدمات بالضغط على الازرار التي بالأسفل 🔘 ⬇️'

        await database_telegram( 
            {
                id: id_chat,
                username: username_chat,
                name: name_chat,
                type: type,
                message_id: message_id,
                EditPermissions: true
            },
            client
        );

        const but_1 = [Markup.button.callback('قرآن كريم 📖', 'quran'), Markup.button.callback('حصن المسلم 🏰', 'hisnmuslim')];
        const but_2 = [Markup.button.callback('أذكار 📿', 'adhkar'), Markup.button.callback('بطاقات 🎴', 'albitaqat')];
        const but_3 = [Markup.button.callback('فيديو 🎥', 'video'), Markup.button.callback('صور 🖼️', 'photo')];
        const but_4 = [Markup.button.callback('آية وتفسير 🌾', 'tafseer'), Markup.button.callback('أسماء الله الحسنى ✨', 'Names_Of_Allah')];
        const but_5 = [Markup.button.callback('التاريخ الهجري 📅', 'Hijri'), Markup.button.callback('فتاوى ابن باز 🔊', 'fatwas')];
        const but_6 = [Markup.button.callback('الرقية الشرعية 🌸', 'roqia'),Markup.button.callback('اسئلة دينية ⁉️', 'question')];
        const but_7 = [Markup.button.callback('معلومات حول البوت ℹ️', 'info'),Markup.button.callback('مشاركة البوت 🔃', 'share')];
        const button = Markup.inlineKeyboard([but_1, but_2, but_3, but_4, but_5, but_6, but_7]);

        await ctx.reply(message, { parse_mode: 'HTML', reply_markup: button.reply_markup, reply_to_message_id: message_id });
    });
}