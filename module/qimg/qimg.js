import path from 'path';
import fs from 'fs-extra';



export default async function qimg() {

    try {

        const __dirname = path.resolve();
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

        return {
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