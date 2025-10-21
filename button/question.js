import database_telegram from '../module/database_telegram.js';
import path from 'path';
import qimg from '../module/qimg/qimg.js';

export default async (client, Markup) => {

    let buttons = [];

    client.action("question", async (ctx) => {
        try {
            const __dirname = path.resolve();

            await database_telegram({
                id: ctx?.chat?.id,
                username: ctx?.chat?.username,
                name: ctx?.chat?.first_name ? ctx?.chat?.first_name : ctx?.chat?.last_name ? ctx?.chat?.last_name : ctx?.chat?.title,
                type: ctx?.chat?.type,
                message_id: ctx?.message?.message_id
            }, client);

            const Qimg = await qimg();

            if (Qimg) {
                const question = `${Qimg.question}`;
                const options = Qimg.answers.map(answer => answer.answer);
                const correctAnswerIndex = Qimg.answers.findIndex(answer => answer.t === 1);
                const questionTEXT = `questionTEXT${Qimg.divID}`;
                const questionAUDIO = `questionAUDIO${Qimg.divID}`;
                buttons.push(questionTEXT);
                buttons.push(questionAUDIO);

                const but_1 = [Markup.button.callback('🔄', 'question')];
                const but_2 = [Markup.button.callback('صوت 🔊', questionAUDIO), Markup.button.callback('نص 📝', questionTEXT)];
                const but_4 = [Markup.button.callback('الرجوع للقائمة الرئيسية 🏠', 'start')];
                const button = Markup.inlineKeyboard([but_1, but_2, but_4]);

                // 🧩 حماية من الأسئلة الطويلة أو الخيارات الكبيرة
                const MAX_OPTION_LENGTH = 100;
                const MAX_QUESTION_LENGTH = 255;

                const optionsTrimmed = options.map(opt =>
                    opt.length > MAX_OPTION_LENGTH ? opt.slice(0, MAX_OPTION_LENGTH - 1) + "…" : opt
                );

                // لو السؤال طويل جدًا نعرضه نصيًا بدل poll
                if (question.length >= MAX_QUESTION_LENGTH || Qimg.question.length >= 85) {
                    let message = `<b>#${Qimg?.category?.split(" ")?.join("_")} | #${Qimg?.topic?.split(" ")?.join("_")}</b>\n\n\n\n`;
                    message += `<b>${Qimg.question}</b>\n\n`;
                    message += Qimg.answers.map((answer, index) => `${index + 1} - ${answer.answer}`).join("\n");
                    message += `\n\n\nالإجابة الصحيحة:\n<b>${Qimg.correctAnswer.answer}</b>`;
                    await ctx.reply(message, { parse_mode: 'HTML', reply_markup: button.reply_markup });
                } else {
                    // 🔹 Poll آمن ومضبوط
                    try {
                        await ctx.replyWithPoll(question, optionsTrimmed, {
                            is_anonymous: false,
                            allows_multiple_answers: false,
                            correct_option_id: correctAnswerIndex,
                            type: "quiz",
                            explanation: `الإجابة الصحيحه هي ✔️ : \n${Qimg.correctAnswer.answer}`,
                            reply_markup: button.reply_markup
                        });
                    } catch (err) {
                        console.error("❌ Error sending poll:", err.message);
                        await ctx.reply("⚠️ حصل خطأ أثناء إرسال السؤال، ممكن يكون أحد الخيارات طويل جدًا.", {
                            reply_markup: button.reply_markup
                        });
                    }
                }

                // 🔹 عرض النص فقط
                client.action(questionTEXT, async (ctx) => {
                    let message = `<b>${Qimg.question}</b>\n\n`;
                    message += Qimg.answers.map((answer, index) => `${index + 1} - ${answer.answer}`).join("\n");
                    message += `\n\n\nالإجابة الصحيحة:\n<b>${Qimg.correctAnswer.answer}</b>`;
                    await ctx.reply(message, { parse_mode: 'HTML' });
                });

                // 🔹 عرض الصوت
                client.action(questionAUDIO, async (ctx) => {
                    const question = "السؤال";
                    await ctx.replyWithAudio({ source: path.join(__dirname, Qimg?.questionAudio), filename: question }, {
                        parse_mode: 'HTML',
                        caption: `<b>${Qimg.question}</b>`,
                    });

                    const answer = "الجواب";
                    await ctx.replyWithAudio({ source: path.join(__dirname, Qimg?.correctAnswer.audio), filename: answer }, {
                        parse_mode: 'HTML',
                        caption: `<b>${Qimg.correctAnswer.answer}</b>`,
                    });
                });

                await ctx.reply("◃─────•●•─────▹");
            }

        } catch (error) {
            console.error(error);
        }
    });
}
