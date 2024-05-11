import share from './share.js';
import start from './start.js';
import info from './info.js';
export default async function command(client, Markup) {
    try {
        await start(client, Markup);
        await share(client, Markup);
        await info(client, Markup);
    } catch (error) {
        console.log(error);
    }
}