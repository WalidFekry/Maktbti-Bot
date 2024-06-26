import fs from 'fs-extra';
import path from 'path';
import moment from 'moment-hijri';
import get_database_telegram from './get_database_telegram.js';
import getFileSize from './getFileSize.js';
import tafseerMouaser from './tafseerMouaser/index.js';
import Hijri from './Hijri/index.js';
import error_handling from './error_handling.js';
import convertHTMLandCSSToImage from '../module/convertHTMLandCSSToImage.js';
import fatwas from './fatwas/index.js';

export default async function scheduling_messages(client) {
    // تنفيذ الكود بشكل متكرر كل دقيقة
    setInterval(async () => {
        // الحصول على مسار المجلد الحالي
        const __dirname = path.resolve();
        const config = fs.readJSONSync(path.join(__dirname, './config.json'));
        // الحصول على الوقت الحالي وتنسيقه
        const time = moment().locale('en-EN').format('LT');
        // الحصول على اليوم الحالي وتنسيقه باللغة العربية
        const today = moment().locale('ar-SA').format('dddd');

        // أوقات تنفيذ الأحداث
        const time_Hijri = ["12:02 AM"];
        const time_video = ["4:00 AM","11:30 AM"];
        const time_photo = ["8:00 AM","3:00 PM"];
        const time_tafseer = ["6:00 PM"];
        const time_quran = ["9:00 PM"];
        const time_fatwas = ["3:00 AM"]; //stopped
        const time_names_off_allah = ["6:00 PM"]; //stopped
        
        // الحصول على جميع المستخدمين
        const GetAllUsers = await get_database_telegram("all");

        // تنفيذ الأحداث المتعلقة بتلاوة القرآن الكريم
        if (time_quran.includes(time)) {
            // قراءة ملف JSON يحتوي على تفاصيل تلاوات القرآن
            const mp3quran = fs.readJsonSync(path.join(__dirname, './files/json/mp3quran.json'));
            for (const item of GetAllUsers) {
                if (item?.evenPost && item?.permissions?.canSendMessages || item?.type === "private") {
                    try {
                        const random = mp3quran[Math.floor(Math.random() * mp3quran.length)];
                        const mp3quranRandom = random?.audio[Math.floor(Math.random() * random?.audio.length)];
                        const FileSize = await getFileSize(mp3quranRandom?.link);
                        let message = `▪️ <b>القارئ:</b> ${random?.name} \n`;
                        message += `▪️ <b>الرواية:</b> ${random?.rewaya} \n`;
                        message += `▪️ <b>إسم السورة بالعربي:</b> ${mp3quranRandom?.name} \n`;
                        message += `▪️ <b>إسم السورة بالإنجليزي:</b> ${mp3quranRandom?.english_name} \n`;
                        message += `▪️ <b>رقم السورة:</b> ${mp3quranRandom?.id} \n`;
                        message += `▪️ <b>مكان النزول:</b> ${mp3quranRandom?.descent} | ${mp3quranRandom?.descent_english}`

                        if (FileSize.split('.')[0] >= 20 && FileSize.split(' ')[1] === 'MB') {
                            message += `\n▪️ <b>رابط ملف الصوت:</b> \n\n${mp3quranRandom?.link}`
                            await sendMessageWithRetry(item?.id, message);
                        } else {
                            await sendAudioWithRetry(item?.id, { url: mp3quranRandom?.link, filename: `${random?.name} - ${random?.name} - tg@tqw24h.mp3` }, message);
                        }
                    } catch (error) {
                        await error_handling(error, client);
                    }
                }
            }
            console.log("-------------------------------")
            console.log("Done sent time_quran 9:00 PM");
            console.log("-------------------------------")
        }
        // تنفيذ الأحداث المتعلقة بمشاركة الصور
        else if (time_photo.includes(time)) {
            const photo = fs.readJsonSync(path.join(__dirname, './files/json/photo.json'));
            for (const item of GetAllUsers) {
                if (item?.evenPost && item?.permissions?.canSendMessages || item?.type === "private") {
                    try {
                        const random = photo[Math.floor(Math.random() * photo.length)];
                        await sendPhotoWithRetry(item?.id,{ url: random },undefined);
                    } catch (error) {
                        await error_handling(error, client);
                    }
                }
            }
            console.log("-------------------------------")
            console.log("Done sent time_photo 8:00 AM, 3:00 PM");
            console.log("-------------------------------")
        }
        // تنفيذ الأحداث المتعلقة بمشاركة مقاطع الفيديو
        else if (time_video.includes(time)) {
            // قراءة ملف JSON يحتوي على تفاصيل مقاطع الفيديو
            const video = fs.readJsonSync(path.join(__dirname, './files/json/video.json'));
            for (const item of GetAllUsers) {
                if (item?.evenPost && item?.permissions?.canSendMessages || item?.type === "private") {
                    try {
                        const random = video[Math.floor(Math.random() * video.length)];
                        await sendVideoWithRetry(item?.id, { url: random?.path });
                    } catch (error) {
                        await error_handling(error, client);
                    }
                }
            }
            console.log("-------------------------------")
            console.log("Done sent time_video 4:00 AM, 11:30 AM");
            console.log("-------------------------------")
        }
        // تنفيذ الأحداث المتعلقة بمشاركة التفسير الميسر
        else if (time_tafseer.includes(time)) {
            // الحصول على تفاصيل التفسير الميسر
            const TFSMouaser = await tafseerMouaser(path.join(__dirname, './tafseerMouaser.jpeg')).catch(e => console.log(e));
            for (const item of GetAllUsers) {
                if (item?.evenPost && item?.permissions?.canSendMessages || item?.type === "private") {
                    try {
                        let message = `ـ ❁ …\n\n\nسورة <b>${TFSMouaser?.sura}</b> الآية: ${TFSMouaser?.ayahID}\n\n`
                        message += `<b>${TFSMouaser?.ayah}</b>\n\n`
                        message += `${TFSMouaser?.tafseer}`

                        if (TFSMouaser?.buffer) {
                            await sendPhotoWithRetry(item?.id, { source: TFSMouaser?.buffer, filename: `سورة ${TFSMouaser?.sura} الآية: ${TFSMouaser?.ayahID}.jpeg` }, message);
                        }
                    } catch (error) {
                        await error_handling(error, client);
                    }
                }
            }
            console.log("-------------------------------")
            console.log("Done sent time_tafseer 6:00 PM");
            console.log("-------------------------------")
        }
        // تنفيذ الأحداث المتعلقة بمشاركة التقويم الهجري
        else if (time_Hijri.includes(time)) {
            const Hijri_ = await Hijri(path.join(__dirname, './Hijri.jpeg')).catch(e => console.log(e));
            for (const item of GetAllUsers) {
                if (item?.evenPost && item?.permissions?.canSendMessages || item?.type === "private") {
                    try {
                        let message = '#التقويم_الهجري 📅\n\n'
                        message += `#${Hijri_?.today} | #${Hijri_.todayEn}\n`
                        message += `التاريخ الهجري: ${Hijri_?.Hijri}\n`
                        message += `التاريخ الميلادي: ${Hijri_?.Gregorian} \n\n\n`
                        message += `سورة ${Hijri_?.surah} | ${Hijri_?.title} \n\n`
                        message += `${Hijri_?.body}`

                        if (Hijri_) {
                            await sendPhotoWithRetry(item?.id, { source: Hijri_?.buffer, filename: `${Hijri_?.Hijri}_📅.jpeg` }, message);
                        }
                    } catch (error) {
                        await error_handling(error, client);
                    }
                }
            }
            console.log("-------------------------------")
            console.log("Done sent time_Hijri 12:02 AM");
            console.log("-------------------------------")
        }
        // تنفيذ الأحداث المتعلقة بمشاركة اسماء الله الحسنى
        else if (time_names_off_allah.includes(time) && false) {
            console.log("-------------------------------")
            console.log("Done sent time_names_off_allah 6:00 PM");
            console.log("-------------------------------")
            // الحصول على تفاصيل التفسير الميسر
            const Names_Of_Allah = fs.readJsonSync(path.join(__dirname, './files/json/Names_Of_Allah.json'));
            const puppeteerConfig = {
                headless: "new", // تشغيل متصفح بدون واجهة رسومية
                args: [
                    '--no-sandbox', // تجنب مشكلات التشغيل على Linux
                    '--disable-setuid-sandbox', // تجنب مشكلات التشغيل على Linux
                    '--disable-dev-shm-usage', // تجنب مشكلات الذاكرة المشتركة على Linux
                    '--disable-accelerated-2d-canvas', // تجنب مشكلات الرسومات على Linux
                    '--disable-gpu', // تجنب استخدام وحدة المعالجة الرسومية
                ],
                executablePath: config?.executablePath
            };

            for (const item of GetAllUsers) {
                if (item?.evenPost && item?.permissions?.canSendMessages && item?.type !== "private") {
                    try {

                        const random = Names_Of_Allah[Math.floor(Math.random() * Names_Of_Allah.length)];
                        let message = `<b>الإسم: ${random.name}</b>\n\n`
                        message += `المعنى: ${random.text}\n\n`

                        const result = await convertHTMLandCSSToImage({
                            htmlCode: `<!DOCTYPE html>
                            <html lang="en">
                            
                            <head>
                                <meta charset="UTF-8">
                                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                            </head>
                            
                            <body>
                            
                                <div id="main-container">
                            
                                    <div id="container">
                                        <h1 id="name">
                                        ${random.name}
                                        </h1>
                                    
                                        <p id="description">
                                        ${random.text}
                                        </p>
                                
                                      
                                    </div>
                            
                                </div>
                            
                                <div id="username">
                                    ${item?.username ? `@${item?.username}` : item?.name}
                                </div>
                            
                                <div id="bot">
                                    تم النشر بواسطة بوت مكتبتي : maktbti_bot@
                                </div>
                            
                            </body>
                            
                            </html>`,
                            cssCode: `@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@1000&family=Vazirmatn&display=swap');
                            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@1000&family=Tajawal:wght@900&family=Vazirmatn&display=swap');
                            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@1000&family=Tajawal:wght@400;900&family=Vazirmatn&display=swap');
                            
                            body {
                                margin: 0;
                                padding: 0;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                min-height: 100vh;
                                background-color: #04364A;
                                width: 100%;
                                font-family: 'Vazirmatn', sans-serif;
                            }
                            
                            #main-container {
                                position: absolute;
                                top: 100px;
                                bottom: 100px;
                                left: 100px;
                                right: 100px;
                                background-color: #176B87;
                                box-shadow: rgba(0, 0, 0, 0.45) 0px 25px 20px -20px;
                                margin-left: auto;
                                margin-right: auto;
                                border-radius: 30px;
                            }
                            
                            #container {
                                display: flex;
                                justify-content: center;
                                flex-wrap: wrap;
                                align-items: center;
                                text-align: center;
                                box-sizing: border-box;
                                position: relative;
                            }
                            
                            #name {
                                color: #64CCC5;
                                font-size: 120px;
                                font-family: 'Tajawal', sans-serif;
                                position: absolute;
                                top: -140px;
                                text-shadow: rgba(0, 0, 0, 0.09) 0px 2px 1px, rgba(0, 0, 0, 0.09) 0px 4px 2px, rgba(0, 0, 0, 0.09) 0px 8px 4px, rgba(0, 0, 0, 0.09) 0px 16px 8px, rgba(0, 0, 0, 0.09) 0px 32px 16px;
                            }
                            
                            #description {
                                margin-top: 200px;
                                margin-bottom: 0px;
                                width: 100%;
                                color: #64CCC5;
                                font-family: 'Tajawal', sans-serif;
                                font-size: 33px;
                                margin-left: 20px;
                                margin-right: 20px;
                            }
                            
                            #username {
                                position: absolute;
                                bottom: 60px;
                                color: #FFFFFF;
                                font-size: 16px;
                            }
                            
                            #bot {
                                position: absolute;
                                bottom: 20px;
                                color: #FFFFFF;
                                font-size: 15px;
                                direction: rtl;
                            }`,
                            outputPath: 'output.png',
                            width: 1180,
                            height: 700,
                            quality: 100,
                            format: 'png',
                            retryLimit: 3,
                            puppeteerConfig: puppeteerConfig,
                        });

                        if (result?.success) {

                            await sendPhotoWithRetry(item?.id, { source: result?.buffer, filename: `${random.name}.jpeg` }, message);

                        }

                        else {
                            await sendMessageWithRetry(item?.id, message);
                        }
                    } catch (error) {
                        await error_handling(error, client);
                    }
                }
            }
        }
        // تنفيذ الأحداث المتعلقة بمشاركة فتاوى ابن باز رحمه الله
        else if (time_fatwas.includes(time) && false) {
            console.log("-------------------------------")
            console.log("Done sent time_fatwas 3:00 AM");
            console.log("-------------------------------")
            for (const item of GetAllUsers) {
                if (item?.evenPost && item?.permissions?.canSendMessages && item?.type !== "private") {
                    const nameUser = item?.username ? `@${item?.username}` : item?.name;
                    try {
                        const resultFatwas = await fatwas(nameUser).catch(error => console.log(error));
                        let categories = []
                        if (resultFatwas?.categories) {
                            for (const lop of resultFatwas?.categories) {
                                categories.push(`#${lop?.split(" ")?.join("_")}`)
                            }
                        }
                        const filename = `${resultFatwas?.fatwas_title?.split(" ")?.join("_")}_فتوى رقم_${resultFatwas?.id}.mp3`
                        let message = '<b>فتاوى #ابن_باز رحمه الله</b>\n\n\n'
                        message += `#${resultFatwas?.fatwas_title?.split(" ")?.join("_")}\n\n`
                        message += `<b>س:</b> ${resultFatwas?.question}\n\n`
                        message += `<b>${resultFatwas?.answer?.slice(0, 3350)}</b>\n\n\n`
                        message += categories;


                        if (resultFatwas?.buffer) {
                            if (message.length >= 1024) {
                                await sendMessageWithRetry(item?.id, message);
                            }

                            await sendPhotoWithRetry(item?.id, { source: resultFatwas?.buffer }, message.length >= 1024 ? undefined : message);
                        }

                        if (resultFatwas?.audio) {
                            await sendAudioWithRetry(item?.id, { url: resultFatwas?.audio, filename: filename }, `<b>فتاوى #ابن_باز رحمه الله</b> \n\n${resultFatwas?.title}\n\n${categories}`);
                        }

                        if (resultFatwas?.imagePath) {
                            fs.removeSync(path.join(__dirname, resultFatwas?.imagePath));
                            fs.removeSync(path.join(__dirname, resultFatwas?.path));
                        }

                        else if (!resultFatwas?.buffer) {
                            await sendMessageWithRetry(item?.id, message);
                        }

                    } catch (error) {
                        await error_handling(error, client);
                    }
                }
            }
        }
    }, 60000);

    async function sendMediaWithRetry(chatId, media, method, caption) {
        try {
            await client.telegram[method](chatId, media, { parse_mode: 'HTML', caption });
        } catch (error) {
            if (error.response && error.response.ok === false && error.response.error_code === 504) {
                // Network timeout, retry after a delay (e.g., 5 seconds)
                console.log("Network timeout, retry after a delay (e.g., 5 seconds)");
                setTimeout(() => sendMediaWithRetry(chatId, media, method, caption), 5000);
            } else {
                // Handle other errors
                await error_handling(error, client);
            }
        }
    }

    async function sendAudioWithRetry(chatId, audio, caption) {
        await sendMediaWithRetry(chatId, audio, 'sendAudio', caption);
    }

    async function sendMessageWithRetry(chatId, message) {
        await sendMediaWithRetry(chatId, message, 'sendMessage');
    }

    async function sendPhotoWithRetry(chatId, photo, caption) {
        await sendMediaWithRetry(chatId, photo, 'sendPhoto', caption);
    }

    async function sendVideoWithRetry(chatId, video) {
        await sendMediaWithRetry(chatId, video, 'sendVideo');
    }
}