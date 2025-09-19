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
    if (error.response?.ok === false && error.response.error_code === 504) {
      console.log("⏳ Timeout.. retry in 5s");
      setTimeout(() => sendMediaWithRetry(client, chatId, media, method, caption), 5000);
    } else {
      await error_handling(error, client);
    }
  }
}



const sendPhotoWithRetry = (client, id, photo, caption) =>
  sendMediaWithRetry(client, id, photo, "sendPhoto", caption);
const sendVideoWithRetry = (client, id, video, caption) =>
  sendMediaWithRetry(client, id, video, "sendVideo", caption);

// ✅ Broadcast Utility
async function broadcast(client, users, fn, label = "event") {
  let success = 0;
  let failed = 0;

  await Promise.all(
    users
      .filter((u) => (u?.evenPost && u?.permissions?.canSendMessages) || u?.type === "private")
      .map(async (u) => {
        try {
          await fn(u);
          success++;
        } catch (err) {
          failed++;
          await error_handling(err, client);
        }
      })
  );

  const total = success + failed;
  console.log("-------------------------------");
  console.log(`📢 ${label} finished`);
  console.log(`📊 Total: ${total} | ✅ Sent: ${success} | ❌ Failed: ${failed}`);
  console.log("-------------------------------");
}

// ✅ Main Scheduling
export default async function scheduling_messages(client) {
  setInterval(async () => {
    const __dirname = path.resolve();
    const time = moment().locale("en-EN").format("LT");

    // الأوقات
    const time_Hijri = ["12:02 AM"];
    const time_video = ["4:00 AM", "12:02 PM"];
    const time_photo = ["8:00 AM", "4:00 PM"];
    const time_tafseer = ["8:00 PM"];

    const GetAllUsers = await get_database_telegram("all");

    // 📷 الصور
    if (time_photo.includes(time)) {
      const photos = fs.readJsonSync(path.join(__dirname, "./files/json/photo.json"));
      await broadcast(
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

      await broadcast(
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

      await broadcast(
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

      await broadcast(
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
