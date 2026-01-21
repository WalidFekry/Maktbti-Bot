import fs from "fs-extra";
import path from "path";
import moment from "moment-hijri";
import get_database_telegram from "./get_database_telegram.js";
import tafseerMouaser from "./tafseerMouaser/index.js";
import Hijri from "./Hijri/index.js";
import error_handling from "./error_handling.js";
import axios from "axios";

const ADMIN_ID = 351688450;

// ✅ دالة انتظار عامة
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

// ✅ دوال الإرسال مع Retry محسّنة
async function sendMediaWithRetry(
  client,
  chatId,
  media,
  method,
  caption,
  attempt = 1
) {
  try {
    await client.telegram[method](chatId, media, {
      parse_mode: "HTML",
      caption,
    });
  } catch (error) {
    const desc = error.response?.description || "";
    const code = error.response?.error_code;

    // 🔁 التعامل مع Rate Limit
    if (code === 429 || desc.includes("Too Many Requests")) {
      const retryAfter = (error.response.parameters?.retry_after || 5) * 1000;
      console.warn(`⚠️ Rate limit hit. Waiting ${retryAfter / 1000}s...`);
      await sleep(retryAfter);
      return sendMediaWithRetry(
        client,
        chatId,
        media,
        method,
        caption,
        attempt + 1
      );
    }

    // ⏳ إعادة المحاولة لو Timeout
    if (code === 504 || desc.includes("Timeout")) {
      console.log(`⏳ Timeout... retrying in 5s`);
      await sleep(5000);
      return sendMediaWithRetry(
        client,
        chatId,
        media,
        method,
        caption,
        attempt + 1
      );
    }

    // 🚫 تجاهل أخطاء المستخدم (blocked, deactivated...)
    if (
      desc.includes("bot was blocked") ||
      desc.includes("user is deactivated") ||
      desc.includes("chat not found")
    ) {
      console.log(`🚫 Skipped user ${chatId}: ${desc}`);
      return;
    }

    // 📦 أي خطأ تاني نبعته لـ error_handling
    await error_handling(error, client);
  }

  // 🕐 تأخير بسيط بعد الإرسال الناجح لتجنب rate limit
  await sleep(300);
}

const sendPhotoWithRetry = (client, id, photo, caption) =>
  sendMediaWithRetry(client, id, photo, "sendPhoto", caption);

const sendVideoWithRetry = (client, id, video, caption) =>
  sendMediaWithRetry(client, id, video, "sendVideo", caption);

const sendAudioWithRetry = (client, id, audio, caption) =>
  sendMediaWithRetry(client, id, audio, "sendAudio", caption);

// ✅ نظام الإرسال المجمع المحسّن
async function broadcastOptimized(client, users, fn, label = "event") {
  const BATCH_SIZE = label === "time_quran" ? 20 : 50;
  const BATCH_DELAY = label === "time_quran" ? 3000 : 1500;
  const USER_DELAY = label === "time_quran" ? 600 : 100;
  const PARALLEL_LIMIT = label === "time_quran" ? 3 : 10; // 🆕 إرسال جزئي متوازي

  let success = 0;
  let failed = 0;

  const startTime = new Date();
  console.log("\n═════════════════════════════════════════");
  console.log(`🚀 Starting broadcast: ${label}`);
  console.log(`👥 Users: ${users.length}`);
  console.log(`📦 Batch Size: ${BATCH_SIZE}`);
  console.log(`⚡ Parallel Limit: ${PARALLEL_LIMIT}`);
  console.log(`⏳ User Delay: ${USER_DELAY}ms`);
  console.log(`⏳ Batch Delay: ${BATCH_DELAY}ms`);
  console.log("═════════════════════════════════════════\n");

  for (let i = 0; i < users.length; i += BATCH_SIZE) {
    const batch = users.slice(i, i + BATCH_SIZE);
    console.log(
      `📦 Sending batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(
        users.length / BATCH_SIZE
      )}...`
    );

    // 🧠 تقسيم الدفعة إلى مجموعات فرعية متوازية
    for (let j = 0; j < batch.length; j += PARALLEL_LIMIT) {
      const group = batch.slice(j, j + PARALLEL_LIMIT);

      const results = await Promise.allSettled(
        group.map(async (u) => {
          try {
            await fn(u);
            success++;
          } catch (err) {
            failed++;
            await error_handling(err, client);
          }
        })
      );

      // 🕐 انتظار بسيط بعد كل مجموعة صغيرة
      await sleep(USER_DELAY);
    }

    console.log(`✅ Batch done, waiting ${BATCH_DELAY / 1000}s...`);
    await sleep(BATCH_DELAY);
  }

  const endTime = new Date();
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

  console.log("\n═════════════════════════════════════════");
  console.log(`🏁 Finished ${label}`);
  console.log(`✅ Sent: ${success} | ❌ Failed: ${failed}`);
  console.log(`🕒 Duration: ${durationText}`);
  console.log("═════════════════════════════════════════\n");

  try {
    await client.telegram.sendMessage(ADMIN_ID, summary, {
      parse_mode: "HTML",
    });
  } catch (err) {
    console.log("⚠️ فشل إرسال إشعار الإدارة:", err.message);
  }
}

// 🧠 نظام انتظار للإرسال (Queue)
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
    await fn(); // تنفيذ المهمة
  } catch (err) {
    console.error(`❌ Broadcast failed: ${label}`, err);
  }

  isBroadcasting = false;

  // 🔁 لو فيه مهام في الانتظار
  if (broadcastQueue.length > 0) {
    const next = broadcastQueue.shift();
    console.log(`➡️ Next queued broadcast: ${next.label}`);
    await safeBroadcast(next.label, next.fn);
  }
}

// ✅ الجدولة الأساسية
export default async function scheduling_messages(client) {
  setInterval(async () => {
    const __dirname = path.resolve();
    const time = moment().locale("en-EN").format("LT");

    const time_Hijri = ["12:05 AM"];
    const time_quran = ["3:00 AM"];
    const time_video = ["8:00 AM"];
    const time_photo = ["12:05 PM", "8:00 PM"];
    const time_tafseer = ["3:00 PM"];

    const GetAllUsers = await get_database_telegram("all");
    console.log(`⏰ Current Time: ${time} | Users: ${GetAllUsers.length}`);

    // 📷 الصور (عشوائي)
    if (time_photo.includes(time)) {
      console.log("🖼️ Starting photo broadcast...");
      const photos = fs.readJsonSync(
        path.join(__dirname, "./files/json/photo.json")
      );
      await safeBroadcast("time_photo", async () => {
        await broadcastOptimized(
          client,
          GetAllUsers,
          async (user) => {
            const random = photos[Math.floor(Math.random() * photos.length)];
            await sendPhotoWithRetry(client, user.id, { url: random });
          },
          "time_photo"
        );
      });
    }

// 🎥 الفيديو (موحد من API)
else if (time_video.includes(time)) {
  console.log("🎬 Preparing unified video from API (cached)...");

  const photos = fs.readJsonSync(
    path.join(__dirname, "./files/json/photo.json")
  );

  try {
    // 1️⃣ جلب فيديو من الـ API
    const apiResponse = await axios.get(
      "https://post.walid-fekry.com/maktbti-plus/api/get_random_video.php",
      { timeout: 10000 }
    );

    const data = apiResponse.data;

    if (!data.success || !Array.isArray(data.data) || !data.data.length) {
      throw new Error("No videos returned from API");
    }

    const randomVideo = data.data[0];
    const videoUrl = randomVideo.full_path;

    console.log("🎥 Selected video:", videoUrl);

    // 2️⃣ فحص صلاحية الفيديو
    const valid = await isValidVideo(videoUrl);
    if (!valid) throw new Error("Invalid video");

    let fileId;

    try {
      // 3️⃣ رفع الفيديو مرة واحدة فقط
      const sent = await client.telegram.sendVideo(
        ADMIN_ID,
        { url: videoUrl }
      );

      fileId = sent?.video?.file_id;
      if (!fileId) throw new Error("file_id not returned");
    } catch (uploadErr) {
      console.warn("⚠️ Upload failed, fallback to photo");
      throw uploadErr;
    }

    // 4️⃣ broadcast باستخدام file_id
    await safeBroadcast("time_video", async () => {
      await broadcastOptimized(
        client,
        GetAllUsers,
        async (user) => {
          await sendVideoWithRetry(client, user.id, fileId);
        },
        "time_video"
      );
    });

  } catch (err) {
    console.error("❌ Video API failed:", err.message);

    const randomPhoto = photos[Math.floor(Math.random() * photos.length)];

    await safeBroadcast("time_video_fallback", async () => {
      await broadcastOptimized(
        client,
        GetAllUsers,
        async (user) => {
          await sendPhotoWithRetry(client, user.id, {
            url: randomPhoto?.path || randomPhoto,
          });
        },
        "time_video_fallback"
      );
    });
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
      await safeBroadcast("time_tafseer", async () => {
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
      });
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

      // 🔧 إصلاح وسوم <br> قبل الإرسال
      message = message.replace(/<br\s*\/?>/gi, "\n");

      await safeBroadcast("time_Hijri", async () => {
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
      });
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

      // 🔁 اختيار تلاوة مناسبة (أقل من 10MB فقط)
      while (attempts < 30) {
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

        if (!isNaN(FileSizeNum) && FileSizeNum <= 10) break;
      }

      if (isNaN(FileSizeNum) || FileSizeNum >= 10) {
        console.warn("⚠️ لم يتم العثور على تلاوة أقل من 10MB بعد عدة محاولات.");
        return;
      }

      console.log(
        `🎙️ Selected: ${random?.name} - ${mp3quranRandom?.name} (${FileSizeText})`
      );

      let message = `▪️ <b>القارئ:</b> ${random?.name}\n`;
      message += `▪️ <b>الرواية:</b> ${random?.rewaya}\n`;
      message += `▪️ <b>السورة:</b> ${mp3quranRandom?.name} | ${mp3quranRandom?.translation}\n`;
      message += `▪️ <b>مكان النزول:</b> ${mp3quranRandom?.descent} | ${mp3quranRandom?.descent_english}`;
      await safeBroadcast("time_quran", async () => {
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
          `time_quran`
        );
      });
    }
  }, 60000);
}
