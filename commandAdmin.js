// commandAdmin.js
import error_handling from "./module/error_handling.js";
import get_database_telegram from "./module/get_database_telegram.js";
import fs from "fs-extra";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ✅ إرسال مع إعادة المحاولة (Retry)
async function sendWithRetry(client, method, chatId, payload, attempt = 1, RETRY_LIMIT = 3) {
  try {
    await client.telegram[method](chatId, ...payload);
  } catch (error) {
    const desc = error.response?.description || "";
    const code = error.response?.error_code;

    if (attempt >= RETRY_LIMIT) {
      console.warn(`🚫 Max retries reached for ${chatId}`);
      await error_handling(error, client);
      return;
    }

    if (code === 429 || desc.includes("Too Many Requests")) {
      const wait = (error.response.parameters?.retry_after || 5) * 1000;
      console.warn(`⚠️ Rate limit hit. Waiting ${wait / 1000}s...`);
      await sleep(wait);
      return sendWithRetry(client, method, chatId, payload, attempt + 1, RETRY_LIMIT);
    }

    if (code === 504 || desc.includes("Timeout")) {
      console.warn("⏳ Timeout. Retrying in 5s...");
      await sleep(5000);
      return sendWithRetry(client, method, chatId, payload, attempt + 1, RETRY_LIMIT);
    }

    if (
      desc.includes("bot was blocked") ||
      desc.includes("user is deactivated") ||
      desc.includes("chat not found")
    ) {
      console.warn(`🚫 Skipped user ${chatId}: ${desc}`);
      return;
    }

    await error_handling(error, client);
  }

  await sleep(200);
}

// ✅ نظام الإرسال المتطور
async function broadcastOptimized(client, users, sendFn, label = "manual") {
  const ADMIN_ID = 351688450;

  const BATCH_SIZE = label === "audio" ? 20 : 50;
  const PARALLEL_LIMIT = label === "audio" ? 3 : 10;
  const BATCH_DELAY = label === "audio" ? 3000 : 1500;
  const USER_DELAY = label === "audio" ? 600 : 100;
  const RETRY_LIMIT = 3;

  let sent = 0;
  let failed = 0;

  const startTime = new Date();
  console.log("═════════════════════════════════════════");
  console.log(`🚀 Starting broadcast: ${label}`);
  console.log(`👥 Users: ${users.length}`);
  console.log(`📦 Batch Size: ${BATCH_SIZE}`);
  console.log(`⚡ Parallel Limit: ${PARALLEL_LIMIT}`);
  console.log("═════════════════════════════════════════");

  for (let i = 0; i < users.length; i += BATCH_SIZE) {
    const batch = users.slice(i, i + BATCH_SIZE);

    for (let j = 0; j < batch.length; j += PARALLEL_LIMIT) {
      const group = batch.slice(j, j + PARALLEL_LIMIT);

      const results = await Promise.allSettled(
        group.map(async (u) => {
          try {
            await sendFn(u);
            sent++;
          } catch (err) {
            failed++;
            await error_handling(err, client);
          }
        })
      );

      await sleep(USER_DELAY);
    }

    console.log(
      `📦 Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(users.length / BATCH_SIZE)} | ✅ Sent: ${sent} | ❌ Failed: ${failed}`
    );

    if (i + BATCH_SIZE < users.length) {
      console.log(`⏳ Waiting ${BATCH_DELAY / 1000}s before next batch...`);
      await sleep(BATCH_DELAY);
    }
  }

  const endTime = new Date();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  const summary =
    `📢 <b>تم الانتهاء من الإرسال (${label})</b>\n\n` +
    `👥 المستخدمين: ${users.length}\n` +
    `✅ تم الإرسال: ${sent}\n` +
    `❌ فشل: ${failed}\n` +
    `⏱️ المدة: ${duration} ثانية\n` +
    `🕒 البداية: ${startTime.toLocaleString("ar-EG")}\n` +
    `🕔 النهاية: ${endTime.toLocaleString("ar-EG")}`;

  console.log("═════════════════════════════════════════");
  console.log(`🏁 Finished ${label}`);
  console.log(`✅ Sent: ${sent} | ❌ Failed: ${failed}`);
  console.log("═════════════════════════════════════════");

  try {
    await client.telegram.sendMessage(ADMIN_ID, summary, { parse_mode: "HTML" });
  } catch (err) {
    console.log("⚠️ فشل إرسال التلخيص:", err.message);
  }
}

// 🧠 Queue (انتظار إرسال)
let isBroadcasting = false;
let broadcastQueue = [];

async function safeBroadcast(label, fn) {
  if (isBroadcasting) {
    console.log(`🕒 Waiting in queue: ${label}`);
    broadcastQueue.push({ label, fn });
    return;
  }

  isBroadcasting = true;
  console.log(`🚀 Starting broadcast: ${label}`);

  try {
    await fn();
  } catch (err) {
    console.error(`❌ Broadcast failed: ${label}`, err);
  }

  isBroadcasting = false;

  if (broadcastQueue.length > 0) {
    const next = broadcastQueue.shift();
    console.log(`➡️ Next queued broadcast: ${next.label}`);
    await safeBroadcast(next.label, next.fn);
  }
}

export default async function commandAdmin(client, config) {
  try {
    const VALID_USER_TYPES = ["all", "private", "group", "supergroup", "channel"];

    const isBotOwner = (ctx) =>
      ctx.message.from.username?.toLowerCase() === config.BOT_OWNER_USERNAME.toLowerCase();

    async function getDatabaseUsers(userType) {
      const users = await get_database_telegram(userType);
      return users.filter(
        (user) => user?.permissions?.canSendMessages || user?.type === "private"
      );
    }

    // ✅ إرسال نص
    client.command("sendtext", async (ctx) => {
      if (!isBotOwner(ctx))
        return ctx.reply("❌ Only bot owner can run this command.", { reply_to_message_id: ctx.message.message_id });

      const args = ctx.message.text.split(" ");
      const userType = args[1];
      const message = args.slice(2).join(" ") || ctx.message.reply_to_message?.text;

      if (!VALID_USER_TYPES.includes(userType) || !message)
        return ctx.reply("❌ Usage: /sendtext <userType> <message>", { reply_to_message_id: ctx.message.message_id });

      const users = await getDatabaseUsers(userType);
      await safeBroadcast("text", async () =>
        broadcastOptimized(client, users, async (u) =>
          sendWithRetry(client, "sendMessage", u.id, [message, { parse_mode: "HTML" }])
        )
      );
    });

    // ✅ إرسال ميديا عام (Photo, Video, Audio, Document)
    function registerMediaCommand(command, type) {
      client.command(command, async (ctx) => {
        if (!isBotOwner(ctx))
          return ctx.reply("❌ Only bot owner can run this command.", { reply_to_message_id: ctx.message.message_id });

        const args = ctx.message.text.split(" ");
        const userType = args[1];

        if (!VALID_USER_TYPES.includes(userType))
          return ctx.reply(`❌ Usage: /${command} <userType>`, { reply_to_message_id: ctx.message.message_id });

        const media =
          ctx.message.reply_to_message?.[type] ||
          ctx.message[type] ||
          ctx.message.reply_to_message?.photo?.pop() ||
          ctx.message.photo?.pop();

        if (!media) return ctx.reply("⚠️ No media found.", { reply_to_message_id: ctx.message.message_id });

        const caption = ctx.message.caption || ctx.message.reply_to_message?.caption || "";
        const users = await getDatabaseUsers(userType);

        await safeBroadcast(type, async () =>
          broadcastOptimized(client, users, async (u) =>
            sendWithRetry(client, `send${type[0].toUpperCase() + type.slice(1)}`, u.id, [
              media.file_id,
              { parse_mode: "HTML", caption },
            ])
          , type)
        );
      });
    }

    registerMediaCommand("sendphoto", "photo");
    registerMediaCommand("sendvideo", "video");
    registerMediaCommand("sendaudio", "audio");
    registerMediaCommand("senddocument", "document");
  } catch (error) {
    console.log(error);
  }
}
