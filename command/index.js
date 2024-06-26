import share from './share.js';
import start from './start.js';
import info from './info.js';
import eid_al_adha from './eid_al_adha.js';
import database from './database.js';

export default async function command(client, Markup, config) {
    try {
        await start(client, Markup);
        await share(client, Markup);
        await info(client, Markup);
        await eid_al_adha(client, config);
        await database(client, Markup);
    } catch (error) {
        console.log(error);
    }
}