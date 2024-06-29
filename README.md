# بوت مكتبتي - Maktbti

<div align="center">
  <img align="center" src="./logo.png">

  <br>
  <br>

  بوت إسلامي لتطبيق تيليجرام يقدم العديد من الخدمات التي يحتاجها المسلم في يومه 

  <br>

  يقول النبي ﷺ: من دل على خير؛ فله مثل أجر فاعله 

  [مثال على بوت مكتبتي](https://t.me/maktbti_bot)

</div>


# مميزات التطبيق

- نشر الرسائل بشكل تلقائي لجميع المشتركين في البوت سواء اشخاص او قنوات او قروبات
- القرآن الكريم | 158 قارئ
- حصن المسلم … أذكار الصباح والمساء والنوم الخ... | صوت و نص
- بطاقات القرآن الكريم | صوت و صورة
- صور عشوائية
- فيدوهات قرآن قصيرة
- اسماء الله الحسنى
- آية وتفسير | نص و صورة
- التاريخ الهجري | نص و صورة
-  اسئلة دينية - صوت وصورة
-  الرقية الشرعية - صوت وصورة


# المتطلبات

- nodejs 
- متصفح chromium او chrom
- رمز token الخاص ببوت telegram | [BotFather](https://t.me/BotFather)
- تحرير ملف config.json 


```json
{
    "token_telegram": "5798247559:AAHdBHKKbA1l6mg2PA5EijTLcVNqEsBR-6U",
    "executablePath": "/usr/bin/chromium-browser",
}
```


- token_telegram =  رمز التوكن الخاص بالبوت ينمكنك انشائه من خلال [@BotFather](https://t.me/BotFather)
- executablePath = مسار متصفح chromium او chrom


في الغالب هذه المسارات لجميع الانظمة

```bash
which chromium
```

```
linux:

/usr/bin/google-chrome-stable

or 

/usr/bin/chromium

or 

/snap/bin/chromium


or

/usr/bin/chromium-browser

windows:


C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe


MacOS:

/Applications/Google Chrome.app/Contents/MacOS/Google Chrome
```

# تثبيت 

```bash
git clone https://github.com/WalidFekry/Maktbti-Bot
cd Maktbti-Bot
npm i
npm start
```

# Startup with PM2

```bash
npm install pm2 -g
pm2 start index.js --name Maktbti-Bot
pm2 startup
pm2 save
```

# Auto restart with PM2

```bash
pm2 restart Maktbti-Bot --cron "30 23 * * *" //Change to 0 to disable
```

#  مثال على آية وتفسير و التاريخ الهجري واسماء الله الحسنى و فتاوى الشيخ ابن باز رحمه الله

<div align="center">

  <img align="center" src="./tafseerMouaser.jpeg">

  <br>
  <br>

  <img align="center" src="./Hijri.jpeg">

  <br>
  <br>

  <img align="center" src="./output.png">

  <br>
  <br>

  <img align="center" src="./fatwas.jpg">

  <br>
  <br>

  وفي الختام لاتنسنا من دعوة صالحة بظهر الغيب .
</div>
