import nodeHtmlToImage from 'node-html-to-image'
import fs from 'fs-extra';
import path from "node:path";

export default async function eid_al_adha_generator(CONTENT, FILE_PATH, executablePath) {

    try {
        const __dirname = path.resolve();
        const Template = fs.readFileSync(path.join(__dirname, "module/eid_al_adha_generator/template.html"), "utf8");
        const imageURI = await imageToDataURI(path.join(__dirname, "module/eid_al_adha_generator/template.png"));

        return await nodeHtmlToImage({
            html: Template,
            puppeteerArgs: {
                headless: "new",
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--disable-gpu',
                ],
                executablePath: executablePath,
                defaultViewport: {
                    width: 1284,
                    height: 1749,
                },

            },
            waitUntil: "networkidle2",
            content: { Content: CONTENT, imageSource: imageURI },
            output: FILE_PATH,
            type: "jpeg",
            quality: 100
        });
    } catch (error) {
        console.error(`[${new Date().toLocaleString()}] ❌ Error occurred: ${error}`);
    }
}


async function imageToDataURI(input) {
    try {
        let data;
        if (typeof input === 'string') {
            if (fs.existsSync(input)) {
                data = fs.readFileSync(input);
            } else {
                const response = await fetch(input);
                if (response.ok) {
                    const buffer = await response.arrayBuffer();
                    data = Buffer.from(buffer);
                } else {
                    throw new Error(`Failed to fetch image: ${response.statusText}`);
                }
            }
        } else if (Buffer.isBuffer(input)) {
            data = input;
        } else {
            throw new Error('Invalid input type. Input must be a file path, URL, or Buffer.');
        }

        const base64Image = data.toString('base64');
        const dataURI = `data:image/jpeg;base64,${base64Image}`;
        return dataURI;
    } catch (error) {
        throw new Error(`Error converting image to data URI: ${error.message}`);
    }
}