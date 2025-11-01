import path from "path";
import database_telegram from "../module/database_telegram.js";
import Hijri from "../module/Hijri/index.js";

export default async (client, Markup) => {
  client.action("Hijri", async (ctx) => {
    const __dirname = path.resolve();
    const Hijri_ = await Hijri(path.join(__dirname, "./Hijri.jpeg")).catch((e) =>
      console.log(e)
    );

    const but_1 = [Markup.button.callback("🔄", "Hijri")];
    const but_2 = [Markup.button.callback("الرجوع للقائمة الرئيسية 🏠", "start")];
    const button = Markup.inlineKeyboard([but_1, but_2]);

    let message = "#التقويم_الهجري 📅\n\n";
    message += `#${Hijri_?.today} | #${Hijri_.todayEn}\n`;
    message += `التاريخ الهجري: ${Hijri_?.Hijri}\n`;
    message += `التاريخ الميلادي: ${Hijri_?.Gregorian}\n\n\n`;
    message += `سورة ${Hijri_?.surah} | ${Hijri_?.title}\n\n`;
    message += `${Hijri_?.body}`;

    // 🧹 تنظيف الرسالة من وسوم HTML غير مدعومة
    message = message
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/&nbsp;/gi, " ")
      .replace(/<(?!\/?(b|strong|i|em|u|ins|s|strike|del|a|code|pre|blockquote)\b)[^>]*>/gi, "");

    await database_telegram(
      {
        id: ctx?.chat?.id,
        username: ctx?.chat?.username,
        name: ctx?.chat?.first_name
          ? ctx?.chat?.first_name
          : ctx?.chat?.last_name
          ? ctx?.chat?.last_name
          : ctx?.chat?.title,
        type: ctx?.chat?.type,
        message_id: ctx?.message?.message_id,
      },
      client
    );

    if (Hijri_) {
      await ctx.replyWithPhoto(
        { source: Hijri_?.buffer, filename: `${Hijri_?.Hijri}_📅.jpeg` },
        {
          caption: message,
          reply_markup: button.reply_markup,
        }
      );
    }
  });
};
