import { Telegraf, Markup, Scenes, session } from 'telegraf';
import fs from 'fs-extra';
import path from 'path';
import moment from 'moment-hijri';
import WizardScene from './WizardScene/index.js';
import join_left from './module/join_left.js';
import EventText from './module/EventText.js';
import EventTextChannel from './module/EventTextChannel.js';
import command from './command/index.js';
import button from "./button/index.js";
import error_handling from './module/error_handling.js';
import scheduling_messages from './module/scheduling_messages.js';
import commandAdmin from './commandAdmin.js';

const __dirname = path.resolve();

async function teleAltaqwaa() {

    // بداية npm

    const pkg = await fs.readJson(path.join(__dirname, './package.json'));
    console.log(`maktbti_bot v${pkg?.version} ready! ${moment().locale('en-EN').format('LT')}`)

    // مجلد قاعدة البيانات

    fs.existsSync(path.join(__dirname, './database')) ? true :
        fs.mkdirSync(path.join(__dirname, './database'), { recursive: true });

    const config = await fs.readJson(path.join(__dirname, './config.json'));
    const options = { channelMode: true, voting: true };
    const client = new Telegraf(config?.token_telegram, options);
    const stage = new Scenes.Stage(WizardScene);
    client.use(session());
    client.use(stage.middleware());

    // الأحداث

    await commandAdmin(client, config);
    await command(client, Markup);
    await button(client, Markup);
    await join_left(client);
    await EventText(client);
    await EventTextChannel(client);

    // جدولة الرسائل

    await scheduling_messages(client);

    // ابدأ التطبيق

    client.launch().catch(async (error) => {
        await error_handling(error, client);
    });

    // تجاوز معالجة الأخطاء

    client.catch(async (error) => {
        await error_handling(error, client);
    });

}

await teleAltaqwaa().catch(e => console.log(e));