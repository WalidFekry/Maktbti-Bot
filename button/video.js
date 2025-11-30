import database_telegram from '../module/database_telegram.js';

export default async (client, Markup) => {

    client.action("video", async (ctx) => {
        const but_1 = [Markup.button.callback('🔄', 'video')];
        const but_2 = [Markup.button.callback('الرجوع للقائمة الرئيسية 🏠', 'start')];
        const button = Markup.inlineKeyboard([but_1, but_2]);

        try {
            // 1) طلب الفيديو من الـ API
            const response = await fetch('https://post.walid-fekry.com/maktbti-plus/api/get_random_video.php');

            if (!response.ok) {
                throw new Error('HTTP error! status: ' + response.status);
            }

            const json = await response.json();

            // التحقق من أن الـ API رجع بيانات صح
            if (!json.success || !Array.isArray(json.data) || json.data.length === 0) {
                throw new Error('No videos returned from API');
            }
            
            const randomVideo = json.data[0];

            // استخراج الرابط الخاص بالفيديو
            const videoUrl = randomVideo.full_path;

            // 2) حفظ بيانات المستخدم في الداتابيز
            await database_telegram({
                id: ctx?.chat?.id,
                username: ctx?.chat?.username,
                name: ctx?.chat?.first_name
                    ? ctx?.chat?.first_name
                    : ctx?.chat?.last_name
                        ? ctx?.chat?.last_name
                        : ctx?.chat?.title,
                type: ctx?.chat?.type,
                message_id: ctx?.message?.message_id
            }, client);

            // 3) إرسال الفيديو للمستخدم
            await ctx.replyWithVideo(
                { url: videoUrl },
                { reply_markup: button.reply_markup }
            );

        } catch (error) {
            console.error('Error while fetching/sending video:', error);

            // رسالة خطأ للمستخدم بشكل لطيف
            await ctx.reply(
                'عذرًا، حصل خطأ أثناء جلب الفيديو 😔\nحاول تاني بالضغط على زر 🔄',
                { reply_markup: button.reply_markup }
            );
        }
    });
}
