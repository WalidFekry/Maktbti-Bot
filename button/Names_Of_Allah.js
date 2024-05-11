import fs from 'fs-extra';
import path from 'path';
import database_telegram from '../module/database_telegram.js';
import convertHTMLandCSSToImage from '../module/convertHTMLandCSSToImage.js';


export default async (client, Markup) => {

    client.action("Names_Of_Allah", async (ctx) => {

        const __dirname = path.resolve();
        const config = fs.readJSONSync(path.join(__dirname, './config.json'));
        const Names_Of_Allah = fs.readJsonSync(path.join(__dirname, './files/json/Names_Of_Allah.json'));
        const but_1 = [Markup.button.callback('🔄', 'Names_Of_Allah')];
        const but_2 = [Markup.button.callback('الرجوع للقائمة الرئيسية 🏠', 'start')];
        const button = Markup.inlineKeyboard([but_1, but_2]);
        const random = Names_Of_Allah[Math.floor(Math.random() * Names_Of_Allah.length)];
        let message = `<b>الإسم: ${random.name}</b>\n\n`
        message += `المعنى: ${random.text}\n\n`
        await database_telegram({
            id: ctx?.chat?.id,
            username: ctx?.chat?.username,
            name: ctx?.chat?.first_name ? ctx?.chat?.first_name : ctx?.chat?.last_name ? ctx?.chat?.last_name : ctx?.chat?.title,
            type: ctx?.chat?.type,
            message_id: ctx?.message?.message_id
        }, client);

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
                    ${ctx?.chat?.username ? `@${ctx?.chat?.username}` : ctx?.chat?.first_name ? ctx?.chat?.first_name : ctx?.chat?.last_name ? ctx?.chat?.last_name : ctx?.chat?.title}
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

            await ctx.replyWithPhoto({ source: result?.buffer, filename: random?.name + ".jpeg" }, {
                caption: message,
                parse_mode: 'HTML',
                reply_markup: button.reply_markup
            });

        }

        else {
            await ctx.reply(message, { parse_mode: 'HTML', reply_markup: button.reply_markup });
        }
    });
}