import fs from "fs-extra";
import path from "path";
import moment from "moment-hijri";
import get_database_telegram from "./get_database_telegram.js";
import tafseerMouaser from "./tafseerMouaser/index.js";
import Hijri from "./Hijri/index.js";
import error_handling from "./error_handling.js";
import axios from "axios";

// ✅ فحص صلاحية الفيديو
async function isValidVideo(url) {
  try {
    const response = await axios.head(url, { timeout: 5000 });
    const contentType = response.headers["content-type"] || "";
    return response.status === 200 && contentType.startsWith("video");
  } catch {
    return false;
  }
}

// ✅ دوال الإرسال مع Retry
async function sendMediaWithRetry(client, chatId, media, method, caption) {
  try {
    await client.telegram[method](chatId, media, { parse_mode: "HTML", caption });
  } catch (error) {
    // ⏳ Rate Limit (Too Many Requests)
    if (error.response?.error_code === 429) {
      const wait = (error.response.parameters?.retry_after || 5) * 1000;
      console.warn(`⚠️ Rate limit hit, waiting ${wait / 1000}s before retry...`);
      await new Promise((res) => setTimeout(res, wait));
      return sendMediaWithRetry(client, chatId, media, method, caption);
    }

    // ⏳ Gateway Timeout
    if (error.response?.error_code === 504) {
      console.log("⏳ Timeout.. retry in 5s");
      await new Promise((res) => setTimeout(res, 5000));
      return sendMediaWithRetry(client, chatId, media, method, caption);
    }

    // ❌ أي Error تاني
    await error_handling(error, client);
  }
}



const sendPhotoWithRetry = (client, id, photo, caption) =>
  sendMediaWithRetry(client, id, photo, "sendPhoto", caption);

const sendVideoWithRetry = (client, id, video, caption) =>
  sendMediaWithRetry(client, id, video, "sendVideo", caption);

// 🕒 دالة حساب التقدير
function estimateBroadcastTime(usersCount, batchSize, batchDelay) {
  const totalBatches = Math.ceil(usersCount / batchSize);
  const estimatedSeconds = totalBatches * (batchDelay / 1000);

  const minutes = Math.floor(estimatedSeconds / 60);
  const seconds = Math.floor(estimatedSeconds % 60);

  return { totalBatches, minutes, seconds, estimatedSeconds };
}

// ✅ Broadcast Optimized + Logging
async function broadcastOptimized(client, users, fn, label = "event") {
  const BATCH_SIZE = 50;       // عدد المستخدمين في كل batch
  let batchDelay = 2000;       // البداية delay بين الباتشات (2s)
  let success = 0;
  let failed = 0;

  // 🟢 بداية العملية
  const startTime = new Date();
  const { totalBatches, minutes, seconds } = estimateBroadcastTime(users.length, BATCH_SIZE, batchDelay);

  console.log("═════════════════════════════════════════");
  console.log(`🚀 Starting broadcast: ${label}`);
  console.log(`🕒 Start Time: ${startTime.toLocaleString()}`);
  console.log(`📊 Users: ${users.length}`);
  console.log(`📦 Batch Size: ${BATCH_SIZE}`);
  console.log(`⏳ Delay per Batch: ${batchDelay / 1000}s`);
  console.log(`🔢 Estimated Batches: ${totalBatches}`);
  console.log(`🕒 Estimated Duration: ${minutes} min ${seconds} sec`);
  console.log("═════════════════════════════════════════");

  // 🔄 Loop
  for (let i = 0; i < users.length; i += BATCH_SIZE) {
    const batch = users.slice(i, i + BATCH_SIZE);

    for (const u of batch) {
      try {
        await fn(u);
        success++;
      } catch (err) {
        failed++;
        await error_handling(err, client);

        // لو rate limit hit → نضيف delay إضافي
        if (err.response?.error_code === 429) {
          const retryAfter = (err.response.parameters?.retry_after || 2) * 1000;
          console.warn(`⚠️ 429 hit, adding ${retryAfter}ms to next batch delay`);
          batchDelay += retryAfter;
          await new Promise((res) => setTimeout(res, retryAfter));
        }
      }

      // ⏳ delay بسيط بين كل رسالة داخل الباتش
      await new Promise((res) => setTimeout(res, 50));
    }

    console.log(`✅ Batch ${Math.floor(i / BATCH_SIZE) + 1}/${totalBatches} done. Waiting ${batchDelay / 1000}s...`);
    await new Promise((res) => setTimeout(res, batchDelay));
  }

  // 🔴 نهاية العملية
  const endTime = new Date();
  const duration = Math.round((endTime - startTime) / 1000);
  const durMin = Math.floor(duration / 60);
  const durSec = duration % 60;

  console.log("═════════════════════════════════════════");
  console.log(`🏁 Broadcast finished: ${label}`);
  console.log(`🕒 End Time: ${endTime.toLocaleString()}`);
  console.log(`📊 Total: ${users.length} | ✅ Sent: ${success} | ❌ Failed: ${failed}`);
  console.log(`⏱️ Actual Duration: ${durMin} min ${durSec} sec`);
  console.log("═════════════════════════════════════════");
}


// ✅ Main Scheduling
export default async function scheduling_messages(client) {
  setInterval(async () => {
    const __dirname = path.resolve();
    const time = moment().locale("en-EN").format("LT");

    // الأوقات
    const time_Hijri = ["12:26 AM"];
    const time_video = ["4:00 AM", "12:02 PM"];
    const time_photo = ["8:00 AM", "4:00 PM"];
    const time_tafseer = ["8:00 PM"];

    const GetAllUsers = await get_database_telegram("all");

    // 📷 الصور
    if (time_photo.includes(time)) {
      const photos = fs.readJsonSync(path.join(__dirname, "./files/json/photo.json"));
      await broadcastOptimized(
        client,
        GetAllUsers,
        async (user) => {
          const random = photos[Math.floor(Math.random() * photos.length)];
          await sendPhotoWithRetry(client, user.id, { url: random });
        },
        "time_photo 8:00 AM, 4:00 PM"
      );
    }

    // 🎥 الفيديو
    else if (time_video.includes(time)) {
      const videos = fs.readJsonSync(path.join(__dirname, "./files/json/video.json"));
      const photos = fs.readJsonSync(path.join(__dirname, "./files/json/photo.json"));

      await broadcastOptimized(
        client,
        GetAllUsers,
        async (user) => {
          const randomVideo = videos[Math.floor(Math.random() * videos.length)];
          const valid = await isValidVideo(randomVideo?.path);

          if (valid) {
            await sendVideoWithRetry(client, user.id, { url: randomVideo?.path });
          } else {
            const randomPhoto = photos[Math.floor(Math.random() * photos.length)];
            await sendPhotoWithRetry(client, user.id, { url: randomPhoto?.path });
            console.warn(
              `[${new Date().toISOString()}] ⚠️ Invalid video: ${randomVideo?.path} → Sent photo to user ${user.id}`
            );
          }
        },
        "time_video 4:00 AM, 12:02 PM"
      );
    }

    // 📖 التفسير
    else if (time_tafseer.includes(time)) {
      const TFSMouaser = await tafseerMouaser(path.join(__dirname, "./tafseerMouaser.jpeg")).catch(
        (e) => console.log(e)
      );

      await broadcastOptimized(
        client,
        GetAllUsers,
        async (user) => {
          let message = `ـ ❁ …\n\n\nسورة <b>${TFSMouaser?.sura}</b> الآية: ${TFSMouaser?.ayahID}\n\n`;
          message += `<b>${TFSMouaser?.ayah}</b>\n\n`;
          message += `${TFSMouaser?.tafseer}`;

          if (TFSMouaser?.buffer) {
            await sendPhotoWithRetry(
              client,
              user.id,
              { source: TFSMouaser?.buffer, filename: `سورة ${TFSMouaser?.sura} الآية: ${TFSMouaser?.ayahID}.jpeg` },
              message
            );
          }
        },
        "time_tafseer 8:00 PM"
      );
    }

    // 🗓️ التقويم الهجري
    else if (time_Hijri.includes(time)) {
      const Hijri_ = await Hijri(path.join(__dirname, "./Hijri.jpeg")).catch((e) => console.log(e));

      await broadcastOptimized(
        client,
        GetAllUsers,
        async (user) => {
          let message = "#التقويم_الهجري 📅\n\n";
          message += `#${Hijri_?.today} | #${Hijri_.todayEn}\n`;
          message += `التاريخ الهجري: ${Hijri_?.Hijri}\n`;
          message += `التاريخ الميلادي: ${Hijri_?.Gregorian} \n\n\n`;
          message += `سورة ${Hijri_?.surah} | ${Hijri_?.title} \n\n`;
          message += `${Hijri_?.body}`;

          if (Hijri_) {
            await sendPhotoWithRetry(
              client,
              user.id,
              { source: Hijri_?.buffer, filename: `${Hijri_?.Hijri}_📅.jpeg` },
              message
            );
          }
        },
        "time_Hijri 12:02 AM"
      );
    }
  }, 60000);
}
