import path from 'path';
import server from './server.js';
import screenShot from "./screenShot.js";
import fs from 'fs-extra';



export default async function qimg() {

    try {

        const __dirname = path.resolve();
        const config = fs.readJsonSync(path.join(__dirname, "config.json"));
        const mainJson = fs.readJsonSync(path.join(__dirname, "files", "quiz", "main.json"));
        const randomCategories = mainJson.categories[Math.floor(Math.random() * mainJson.categories.length)];
        const categoriesJson = fs.readJsonSync(path.join(__dirname, `${randomCategories.path}`));
        const randomTopic = categoriesJson.DataArray[Math.floor(Math.random() * categoriesJson.DataArray.length)];
        const randomlevel = randomTopic.files[Math.floor(Math.random() * randomTopic.files.length)];
        const qJson = fs.readJsonSync(path.join(__dirname, `${randomlevel.path}`));
        const randomQ = qJson[Math.floor(Math.random() * qJson.length)];
        const shuffledAnswers = shuffleArray(randomQ.answers);
        // الإجابة الصحيحة بعد ترتيبها بشكل عشوائي
        const correctAnswer = shuffledAnswers.find(answer => answer.t === 1);

        const data = {
            category: randomCategories.arabicName,
            divID: randomQ.id,
            questionTitle: randomTopic.arabicName,
            question: randomQ.q.q,
            answers: shuffledAnswers
        };

        const startServer = await server(data);
        const folderOutputPath = path.join(__dirname, "output");

        fs.mkdirSync(folderOutputPath, { recursive: true });

        const conversionOptions = {
            url: `http://localhost:3000`,
            outputPath: folderOutputPath,
            width: 1000,
            height: 0,
            format: 'jpeg',
            retryLimit: 3,
            puppeteerConfig: {
                headless: "new",
                args: [
                    '--no-sandbox', // تجنب مشكلات التشغيل على Linux
                    '--disable-setuid-sandbox', // تجنب مشكلات التشغيل على Linux
                    '--disable-dev-shm-usage', // تجنب مشكلات الذاكرة المشتركة على Linux
                    '--disable-gpu',
                ],
                executablePath: config?.executablePath
            }
        };

        const conversionResult = await screenShot(conversionOptions);

        startServer.close(() => {
            console.log('Server has been stopped');
        });

        return {
            ...conversionResult,
            category: randomCategories.arabicName,
            divID: randomQ.id,
            topic: randomTopic.arabicName,
            question: randomQ.q.q,
            questionAudio: randomQ.q.audio,
            answers: shuffledAnswers,
            correctAnswer: correctAnswer

        };

    } catch (error) {
        console.error(error);
    }
}




// ترتيب الإجابات بشكل عشوائي
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}