import fs from 'fs-extra';
import path from 'path';
import CrateHtml from './CrateHtml.js';
import convertHTMLandCSSToImage from '../convertHTMLandCSSToImage.js';


export default async function fatwas(username) {

    try {
        const __dirname = path.resolve();
        const config = fs.readJSONSync(path.join(__dirname, './config.json'));
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
        // إنشاء صفحة HTML
        const Html = await CrateHtml(username);
        const result = await convertHTMLandCSSToImage({
            outputPath: `./module/fatwas/${Html?.filename}.png`,
            width: 1000,
            height: 0,
            quality: 100,
            format: 'png',
            retryLimit: 3,
            url: `file://${path.join(__dirname, Html?.path)}`,
            puppeteerConfig: puppeteerConfig,
        });

        if (result?.success) {
            return {
                ...Html,
                ...result
            }
        }

        else {
            return {
                ...Html
            }
        }
    } catch (error) {
        console.log(error);
    }
}


