// commandAdmin.js
import error_handling from "./module/error_handling.js";
import get_database_telegram from "./module/get_database_telegram.js";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ✅ Retry
async function sendWithRetry(client, method, chatId, payload, attempt = 1) {
  try {
    await client.telegram[method](chatId, ...payload);
  } catch (error) {
    const desc = error.response?.description || "";
    const code = error.response?.error_code;

    if (attempt >= 3) {
      console.warn(`🚫 Max retries for ${chatId}`);
      await error_handling(error, client);
      return false;
    }

    if (code === 429) {
      const wait = (error.response.parameters?.retry_after || 5) * 1000;
      console.warn(`⚠️ Rate limit.. wait ${wait / 1000}s`);
      await sleep(wait);
      return sendWithRetry(client, method, chatId, payload, attempt + 1);
    }

    if (desc.includes("blocked") || desc.includes("deactivated") || desc.includes("chat not found")) {
      console.warn(`🚫 Skip ${chatId}: ${desc}`);
      return false;
    }

    await error_handling(error, client);
    return false;
  }

  await sleep(100);
  return true;
}

// ✅ Broadcast (مع إحصائيات)
async function broadcastOptimized(client, users, sendFn, label = "manual") {
  const ADMIN_ID = 351688450;

  const BATCH_SIZE = label === "audio" ? 20 : 50;
  const PARALLEL_LIMIT = label === "audio" ? 3 : 10;
  const BATCH_DELAY = label === "audio" ? 3000 : 1500;
  const USER_DELAY = label === "audio" ? 600 : 100;

  let sent = 0;
  let failed = 0;

  const startTime = new Date();

  console.log("══════════════════════════════");
  console.log(`🚀 Broadcast: ${label}`);
  console.log(`👥 Users: ${users.length}`);
  console.log("══════════════════════════════");

  for (let i = 0; i < users.length; i += BATCH_SIZE) {
    const batch = users.slice(i, i + BATCH_SIZE);

    for (let j = 0; j < batch.length; j += PARALLEL_LIMIT) {
      const group = batch.slice(j, j + PARALLEL_LIMIT);

      await Promise.allSettled(
        group.map(async (u) => {
          const ok = await sendFn(u);
          if (ok) sent++;
          else failed++;
        })
      );

      await sleep(USER_DELAY);
    }

    console.log(
      `📦 Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(users.length / BATCH_SIZE)} | ✅ ${sent} | ❌ ${failed}`
    );

    if (i + BATCH_SIZE < users.length) {
      console.log(`⏳ Wait ${BATCH_DELAY / 1000}s`);
      await sleep(BATCH_DELAY);
    }
  }

  const endTime = new Date();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  const summary =
    `📢 <b>تم الانتهاء من الإرسال (${label})</b>\n\n` +
    `👥 المستخدمين: ${users.length}\n` +
    `✅ تم: ${sent}\n` +
    `❌ فشل: ${failed}\n` +
    `⏱️ المدة: ${duration} ثانية\n` +
    `🕒 البداية: ${startTime.toLocaleString("ar-EG")}\n` +
    `🕔 النهاية: ${endTime.toLocaleString("ar-EG")}`;

  console.log("══════════════════════════════");
  console.log(`🏁 Done ${label}`);
  console.log(`✅ ${sent} | ❌ ${failed}`);
  console.log("══════════════════════════════");

  try {
    await client.telegram.sendMessage(ADMIN_ID, summary, { parse_mode: "HTML" });
  } catch (err) {
    console.log("⚠️ Failed to send summary");
  }
}

// ✅ Queue
let isBroadcasting = false;
let queue = [];

async function safeBroadcast(label, fn) {
  if (isBroadcasting) {
    console.log(`🕒 Queued: ${label}`);
    queue.push({ label, fn });
    return;
  }

  isBroadcasting = true;
  console.log(`🚀 Start: ${label}`);

  try {
    await fn();
  } catch (e) {
    console.error(`❌ Error in ${label}`, e);
  }

  isBroadcasting = false;

  if (queue.length > 0) {
    const next = queue.shift();
    console.log(`➡️ Next: ${next.label}`);
    await safeBroadcast(next.label, next.fn);
  }
}

// ✅ استخراج الميديا
function extractMedia(ctx, type) {
  const msg = ctx.message;
  const reply = msg.reply_to_message;

  if (type === "photo") {
    const photos = reply?.photo || msg.photo;
    return photos?.[photos.length - 1]?.file_id;
  }

  if (type === "video") return reply?.video?.file_id || msg.video?.file_id;
  if (type === "audio") return reply?.audio?.file_id || msg.audio?.file_id;
  if (type === "document") return reply?.document?.file_id || msg.document?.file_id;

  return null;
}

export default async function commandAdmin(client, config) {
  const VALID_USER_TYPES = ["all", "private", "group", "supergroup", "channel"];

  const isBotOwner = (ctx) =>
    ctx.message.from.username?.toLowerCase() === config.BOT_OWNER_USERNAME.toLowerCase();

  async function getUsers(type) {
    return await get_database_telegram(type);
  }

  // ✅ TEXT
  client.command("sendtext", async (ctx) => {
    if (!isBotOwner(ctx)) return;

    const args = ctx.message.text.split(" ");
    const userType = args[1];
    const message = args.slice(2).join(" ") || ctx.message.reply_to_message?.text;

    if (!VALID_USER_TYPES.includes(userType) || !message)
      return ctx.reply("❌ /sendtext all message");

    const users = await getUsers(userType);

    await safeBroadcast("text", async () =>
      broadcastOptimized(client, users, (u) =>
        sendWithRetry(client, "sendMessage", u.id, [message, { parse_mode: "HTML" }])
        , "text")
    );
  });

  // ✅ MEDIA
  function registerMediaCommand(command, type) {
    client.command(command, async (ctx) => {
      if (!isBotOwner(ctx)) return;

      const args = ctx.message.text.split(" ");
      const userType = args[1];

      if (!VALID_USER_TYPES.includes(userType))
        return ctx.reply(`❌ /${command} all`);

      const file_id = extractMedia(ctx, type);

      if (!file_id) return ctx.reply("⚠️ اعمل Reply على الميديا");

      const caption =
        ctx.message.caption ||
        ctx.message.reply_to_message?.caption ||
        "";

      const users = await getUsers(userType);

      await safeBroadcast(type, async () =>
        broadcastOptimized(client, users, (u) =>
          sendWithRetry(
            client,
            `send${type[0].toUpperCase() + type.slice(1)}`,
            u.id,
            [file_id, { caption, parse_mode: "HTML" }]
          )
          , type)
      );
    });
  }

  registerMediaCommand("sendphoto", "photo");
  registerMediaCommand("sendvideo", "video");
  registerMediaCommand("sendaudio", "audio");
  registerMediaCommand("senddocument", "document");
}