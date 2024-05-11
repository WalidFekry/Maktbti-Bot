import fs from 'fs-extra';
import path from 'path';
import { Scenes, Markup } from 'telegraf';
import database_telegram from '../module/database_telegram.js';
import get_database_telegram from '../module/get_database_telegram.js';

const __dirname = path.resolve();

export default new Scenes.WizardScene(
    'start',
    async (ctx) => {
        let id_chat = ctx?.chat?.id;
        let username_chat = ctx?.chat?.username;
        let name_chat = ctx?.chat?.first_name ? ctx?.chat?.first_name : ctx?.chat?.last_name ? ctx?.chat?.last_name : ctx?.chat?.title;
        let name_bot = ctx?.botInfo?.first_name;
        let type = ctx?.chat?.type;
        let message_id = ctx?.message?.message_id;
        await database_telegram({
            id: id_chat,
            username: username_chat,
            name: name_chat,
            type: type,
            message_id: message_id
        });
        const but_1 = [Markup.button.callback('قرآن كريم 📖', 'quran'), Markup.button.callback('حصن المسلم 🏰', 'hisnmuslim')];
        const but_2 = [Markup.button.callback('أذكار 📿', 'adhkar'), Markup.button.callback('بطاقات 🎴', 'albitaqat')];
        const but_3 = [Markup.button.callback('فيديو 🎥', 'video'), Markup.button.callback('صور 🖼️', 'photo')];
        const but_4 = [Markup.button.callback('آية وتفسير 🌾', 'tafseer'), Markup.button.callback('أسماء الله الحسنى ✨', 'Names_Of_Allah')];
        const but_5 = [Markup.button.callback('التاريخ الهجري 📅', 'Hijri'), Markup.button.callback('فتاوى ابن باز 🔊', 'fatwas')];
        const but_6 = [Markup.button.callback('معلومات حول البوت ℹ️', 'info'),Markup.button.callback('اسئلة دينية ⁉️', 'question')];
        const but_7 = [Markup.button.callback('مشاركة البوت 🔃', 'share')];
        const button = Markup.inlineKeyboard([
            but_1,
            but_2,
            but_3,
            but_4,
            but_5,
            but_6,
            but_7,
        ]);
        
        let message = ` اختر يا ${name_chat ? name_chat : `@${username_chat}`} الخدمة التي تريدها من ${name_bot} 👋 \n\n`
        message += 'يقدم هذا البوت العديد من الخدمات التي يحتاجها المسلم في يومه 🌸\n\n'
        message += 'قم بالتنقل بين الخدمات بالضغط على الازرار التي بالأسفل 🔘 ⬇️'

        await ctx.reply(message, { parse_mode: 'HTML', reply_markup: button.reply_markup, reply_to_message_id: message_id });

        return ctx?.scene?.leave()
    }
)