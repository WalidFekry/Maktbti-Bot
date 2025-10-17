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

// ✅ معرفة حجم الملف (بـ MB)
async function getFileSize(url) {
  try {
    const response = await axios.head(url);
    const size = response.headers["content-length"];
    if (!size) return "0 MB";
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  } catch {
    return "0 MB";
  }
}

// ✅ دوال الإرسال مع Retry
async function sendMediaWithRetry(client, chatId, media, method, caption) {
  try {
    await client.telegram[method](chatId, media, {
      parse_mode: "HTML",
      caption,
    });
  } catch (error) {
    if (error.response?.error_code === 429) {
      const wait = (error.response.parameters?.retry_after || 5) * 1000;
      console.warn(
        `⚠️ Rate limit hit, waiting ${wait / 1000}s before retry...`
      );
      await new Promise((res) => setTimeout(res, wait));
      return sendMediaWithRetry(client, chatId, media, method, caption);
    }

    if (error.response?.error_code === 504) {
      console.log("⏳ Timeout.. retry in 5s");
      await new Promise((res) => setTimeout(res, 5000));
      return sendMediaWithRetry(client, chatId, media, method, caption);
    }

    await error_handling(error, client);
  }
}

const sendPhotoWithRetry = (client, id, photo, caption) =>
  sendMediaWithRetry(client, id, photo, "sendPhoto", caption);

const sendVideoWithRetry = (client, id, video, caption) =>
  sendMediaWithRetry(client, id, video, "sendVideo", caption);

const sendAudioWithRetry = (client, id, audio, caption) =>
  sendMediaWithRetry(client, id, audio, "sendAudio", caption);

// 🕒 حساب المدة التقديرية
function estimateBroadcastTime(usersCount, batchSize, batchDelay) {
  const totalBatches = Math.ceil(usersCount / batchSize);
  const estimatedSeconds = totalBatches * (batchDelay / 1000);
  const minutes = Math.floor(estimatedSeconds / 60);
  const seconds = Math.floor(estimatedSeconds % 60);
  return { totalBatches, minutes, seconds, estimatedSeconds };
}

// ✅ نظام الإرسال المجمع
async function broadcastOptimized(client, users, fn, label = "event") {
  const ADMIN_ID = 351688450;
  const BATCH_SIZE = 50;
  let batchDelay = 2000;
  let success = 0;
  let failed = 0;

  const startTime = new Date();
  const { totalBatches, minutes, seconds } = estimateBroadcastTime(
    users.length,
    BATCH_SIZE,
    batchDelay
  );

  console.log("\n═════════════════════════════════════════");
  console.log(`🚀 Starting broadcast: ${label}`);
  console.log(`📊 Users: ${users.length}`);
  console.log(`📦 Batch Size: ${BATCH_SIZE}`);
  console.log(`⏳ Delay per Batch: ${batchDelay / 1000}s`);
  console.log(`🕒 Estimated Duration: ${minutes} min ${seconds} sec`);
  console.log("═════════════════════════════════════════\n");

  for (let i = 0; i < users.length; i += BATCH_SIZE) {
    const batch = users.slice(i, i + BATCH_SIZE);

    for (const u of batch) {
      try {
        await fn(u);
        success++;
      } catch (err) {
        failed++;
        await error_handling(err, client);
        if (err.response?.error_code === 429) {
          const retryAfter = (err.response.parameters?.retry_after || 2) * 1000;
          console.warn(`⚠️ 429 hit, adding ${retryAfter}ms`);
          batchDelay += retryAfter;
          await new Promise((res) => setTimeout(res, retryAfter));
        }
      }
      await new Promise((res) => setTimeout(res, 50));
    }

    console.log(
      `✅ Batch ${
        Math.floor(i / BATCH_SIZE) + 1
      }/${totalBatches} done. Waiting ${batchDelay / 1000}s...`
    );
    await new Promise((res) => setTimeout(res, batchDelay));
  }

  const endTime = new Date();
  console.log("\n═════════════════════════════════════════");
  console.log(`🏁 Finished ${label}`);
  console.log(`✅ Sent: ${success} | ❌ Failed: ${failed}`);
  console.log(`🕒 Duration: ${(endTime - startTime) / 1000}s`);
  console.log("═════════════════════════════════════════\n");
  try {
    const endTime = new Date();

    // 🕒 حساب المدة بصيغة "ساعات - دقائق - ثواني"
    const totalSeconds = Math.floor((endTime - startTime) / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    let durationText = "";
    if (hours > 0) durationText += `${hours} ساعة `;
    if (minutes > 0) durationText += `${minutes} دقيقة `;
    durationText += `${seconds} ثانية`;

    const startText = new Date(startTime).toLocaleString("ar-EG");
    const endText = new Date(endTime).toLocaleString("ar-EG");

    const summary =
      `📢 <b>Broadcast Done</b>\n\n` +
      `📌 النوع: ${label}\n` +
      `✅ تم الإرسال: ${success}\n` +
      `❌ فشل: ${failed}\n` +
      `👥 المستخدمين: ${users.length}\n` +
      `🕒 المدة: ${durationText}\n` +
      `🕓 البداية: ${startText}\n` +
      `🕔 النهاية: ${endText}`;

    await client.telegram.sendMessage(ADMIN_ID, summary, {
      parse_mode: "HTML",
    });
  } catch (err) {
    console.log("⚠️ فشل إرسال إشعار الإدارة:", err.message);
  }
}

// ✅ الجدولة الأساسية
export default async function scheduling_messages(client) {
  setInterval(async () => {
    const __dirname = path.resolve();
    const time = moment().locale("en-EN").format("LT");

    const time_Hijri = ["12:02 AM"];
    const time_video = ["4:00 AM", "12:02 PM"];
    const time_photo = ["8:00 AM", "4:00 PM"];
    const time_tafseer = ["8:00 PM"];
    const time_quran = ["2:00 AM", "10:00 AM", "6:00 PM"];

    const GetAllUsers = await get_database_telegram("all");
    console.log(`⏰ Current Time: ${time} | Users: ${GetAllUsers.length}`);

    // 📷 الصور (عشوائي)
    if (time_photo.includes(time)) {
      console.log("🖼️ Starting photo broadcast...");
      const photos = fs.readJsonSync(
        path.join(__dirname, "./files/json/photo.json")
      );
      await broadcastOptimized(
        client,
        GetAllUsers,
        async (user) => {
          const random = photos[Math.floor(Math.random() * photos.length)];
          await sendPhotoWithRetry(client, user.id, { url: random });
        },
        "time_photo"
      );
    }

    // 🎥 الفيديو (موحد)
    else if (time_video.includes(time)) {
      console.log("🎬 Preparing unified video...");
      const videos = fs.readJsonSync(
        path.join(__dirname, "./files/json/video.json")
      );
      const photos = fs.readJsonSync(
        path.join(__dirname, "./files/json/photo.json")
      );
      const randomVideo = videos[Math.floor(Math.random() * videos.length)];
      const valid = await isValidVideo(randomVideo?.path);

      if (!valid) {
        console.warn("⚠️ Invalid video, switching to photo backup.");
        const randomPhoto = photos[Math.floor(Math.random() * photos.length)];
        await broadcastOptimized(
          client,
          GetAllUsers,
          async (user) => {
            await sendPhotoWithRetry(client, user.id, {
              url: randomPhoto?.path,
            });
          },
          `time_video - (${randomVideo?.path}) >> is invalid - (fallback to photo) >> (${randomPhoto?.path})`
        );
      } else {
        await broadcastOptimized(
          client,
          GetAllUsers,
          async (user) => {
            await sendVideoWithRetry(client, user.id, {
              url: randomVideo?.path,
            });
          },
          `time_video (${randomVideo?.path})`
        );
      }
    }

    // 📖 التفسير (موحد)
    else if (time_tafseer.includes(time)) {
      console.log("📚 Preparing unified tafseer...");
      const TFSMouaser = await tafseerMouaser(
        path.join(__dirname, "./tafseerMouaser.jpeg")
      ).catch((e) => console.log(e));

      let message = `ـ ❁ …\n\n\nسورة <b>${TFSMouaser?.sura}</b> الآية: ${TFSMouaser?.ayahID}\n\n`;
      message += `<b>${TFSMouaser?.ayah}</b>\n\n${TFSMouaser?.tafseer}`;

      await broadcastOptimized(
        client,
        GetAllUsers,
        async (user) => {
          await sendPhotoWithRetry(
            client,
            user.id,
            { source: TFSMouaser?.buffer },
            message
          );
        },
        "time_tafseer"
      );
    }

    // 🗓️ التقويم الهجري (موحد)
    else if (time_Hijri.includes(time)) {
      console.log("📅 Preparing Hijri calendar...");
      const Hijri_ = await Hijri(path.join(__dirname, "./Hijri.jpeg")).catch(
        (e) => console.log(e)
      );

      let message = "#التقويم_الهجري 📅\n\n";
      message += `#${Hijri_?.today} | #${Hijri_.todayEn}\n`;
      message += `التاريخ الهجري: ${Hijri_?.Hijri}\n`;
      message += `التاريخ الميلادي: ${Hijri_?.Gregorian}\n\n`;
      message += `سورة ${Hijri_?.surah} | ${Hijri_?.title}\n\n${Hijri_?.body}`;

      await broadcastOptimized(
        client,
        GetAllUsers,
        async (user) => {
          await sendPhotoWithRetry(
            client,
            user.id,
            { source: Hijri_?.buffer },
            message
          );
        },
        "time_Hijri"
      );
    }

    // 🎧 تلاوة القرآن (موحد)
    else if (time_quran.includes(time)) {
      console.log("🎧 Preparing unified Quran recitation...");
      const mp3quran = fs.readJsonSync(
        path.join(__dirname, "./files/json/mp3quran.json")
      );

      let random,
        mp3quranRandom,
        FileSizeNum = 0,
        FileSizeText = "0 MB";
      let attempts = 0;

      // 🔁 اختيار تلاوة مناسبة (أقل من 20MB فقط)
      while (attempts < 15) {
        attempts++;
        random = mp3quran[Math.floor(Math.random() * mp3quran.length)];
        mp3quranRandom =
          random?.audio[Math.floor(Math.random() * random?.audio.length)];

        const FileSize = await getFileSize(mp3quranRandom?.link);
        FileSizeText = FileSize;
        FileSizeNum = parseFloat(FileSize);

        console.log(
          `🔁 محاولة ${attempts}: ${random?.name} - ${mp3quranRandom?.name} (${FileSizeText})`
        );

        // ✅ لو الحجم أقل من 20 ميجا نكمل
        if (!isNaN(FileSizeNum) && FileSizeNum < 20) break;
      }

      // ⛔ فشل في العثور على ملف مناسب
      if (isNaN(FileSizeNum) || FileSizeNum >= 20) {
        console.warn("⚠️ لم يتم العثور على تلاوة أقل من 20MB بعد عدة محاولات.");
        return;
      }

      // ✅ تم العثور على تلاوة مناسبة
      console.log(
        `🎙️ Selected: ${random?.name} - ${mp3quranRandom?.name} (${FileSizeText})`
      );

      // 🔹 تجهيز الرسالة
      let message = `▪️ <b>القارئ:</b> ${random?.name}\n`;
      message += `▪️ <b>الرواية:</b> ${random?.rewaya}\n`;
      message += `▪️ <b>السورة:</b> ${mp3quranRandom?.name} | ${mp3quranRandom?.translation}\n`;
      message += `▪️ <b>مكان النزول:</b> ${mp3quranRandom?.descent} | ${mp3quranRandom?.descent_english}`;

      // 📢 إرسال نفس التلاوة لجميع المستخدمين
      await broadcastOptimized(
        client,
        GetAllUsers,
        async (user) => {
          await sendAudioWithRetry(
            client,
            user.id,
            { url: mp3quranRandom?.link },
            message
          );
        },
        `time_quran (${random?.name} - ${mp3quranRandom?.name})`
      );
    }
  }, 60000);
}
