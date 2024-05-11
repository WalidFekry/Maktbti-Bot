import fs from "fs-extra";
import path from 'path';
import filterSpan from '../filterSpan.js';


export default async function CrateHtml(username) {

    const __dirname = path.resolve();
    const fatwas = [
        {
            name: "نور على الدرب",
            file: "/files/json/fatwas/nur_ealaa_aldarb.json"
        },
        {
            name: "فتاوى الجامع الكبير",
            file: "/files/json/fatwas/fatawaa_aljamie_alkabir.json"
        },
        {
            name: "فتاوى الدروس",
            file: "/files/json/fatwas/fatawaa_aldurus.json"
        },
    ]
    const fatwas_random = fatwas[Math.floor(Math.random() * fatwas.length)];
    const filePath = path.join(__dirname, fatwas_random.file)
    const fatwaJson = fs.readJsonSync(filePath);
    const fatwa = fatwaJson[Math.floor(Math.random() * fatwaJson.length)];
    // توليد اسم عشوائي للملف بطول 10 خانات
    const randomFileName = generateRandomFileName(10);
    const fileHtml = `./module/fatwas/${randomFileName}.html`;

    let categories = ''

    for (const item of fatwa?.categories) {
        categories += `<p>#${item?.split(" ")?.join("_")}</p>`
    }

    const html = `<!DOCTYPE html>
    <html lang="ar">
    
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>فتاوى ابن باز</title>
        <link rel="stylesheet" href="style.css">
    </head>
    
    <body>
    
        <!-- الشعار -->
        <img src="./logo.png" alt="logo" id="logo">
    
        <!-- معرف الفتوى -->
        <p id="id">
            ${fatwa?.id}
        </p>
    
        <p id="fatwas">
            #${fatwas_random.name.split(" ").join("_")}
        </p>
    
        <div id="container">
    
            <!-- عنوان الفتوى -->
            <h2 id="title">
                ${fatwa?.title}
            </h2>
    
            <!-- سؤال السائل  -->
            <p id="question">
                ${fatwa?.question}
            </p>
    
            <!-- فتوى الشيخ ابن باز رحمه الله -->
            <p id="answer">
               ${filterSpan(fatwa?.answer)}
            </p>
    
            <div id="categories">
                ${categories}
            </div>
    
        </div>
    
        <div id="bottom">
            <p id="group">
                ${username}
            </p>
        
            <p id="bot">
             تم النشر بواسطة بوت مكتبتي : maktbti_bot@
            </p>
        </div>
    
    </body>
    
    </html>`;

    fs.writeFileSync(path.join(__dirname, fileHtml), html);

    return {
        path: fileHtml,
        filename: randomFileName,
        fatwas_title: fatwas_random.name,
        ...fatwa
    };
}


function generateRandomFileName(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let randomFileName = '';
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        randomFileName += characters.charAt(randomIndex);
    }
    return randomFileName;
}