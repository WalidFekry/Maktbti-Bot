import fs from "fs-extra";
import path from 'path';
import moment_hijri from 'moment-hijri';
import filterSpan from '../filterSpan.js';

/**
 * القائمة CrateHtml هي وظيفة لإنشاء صفحة HTML تحتوي على تفاصيل التاريخ الهجري ومحتوى عشوائي.
 *
 * @returns {Object} - كائن يحتوي على تفاصيل التاريخ الهجري ومحتوى عشوائي.
 */
export default async function CrateHtml() {
    let Arr = [
        'ayaatiha',
        'maeni_asamuha',
        'sabab_tasmiatiha',
        'maqsiduha_aleamu',
        'sabab_nuzuliha',
        'fadluha',
        'munasabatiha'
    ];

    let __dirname = path.resolve();
    let today = moment_hijri().locale('ar-SA').format('dddd'); // اليوم
    let todayEn = moment_hijri().locale('en').format('dddd'); // اليوم
    let Hijri = moment_hijri().locale('ar-SA').format('iMMMM iYYYY');
    let Hijri_Number = moment_hijri().locale('ar-SA').format('iD');
    let Gregorian = moment_hijri().locale('en').format('YYYY/M/D');
    let albitaqat = fs.readJsonSync('./files/json/albitaqat.json');
    let random = albitaqat[Math.floor(Math.random() * albitaqat.length)];
    let randomArr = Arr[Math.floor(Math.random() * Arr.length)];
    let title = getTitle(randomArr);
    let body = getBody(random, randomArr);

    let html = `<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <link rel="stylesheet" href="style.css">
</head>

<body>

    <!--  header  -->

    <div id="header">

        <div id="header_top">
            <p id="number">${Hijri_Number}</p>

            <div id="today">

                <p id="today_ar">${today}</p>
                <p id="today_en">${todayEn}</p>

            </div>
        </div>

        <div id="header_bottom">

            <p>${Hijri} هـ</p>

            <P>${Gregorian} م</P>

        </div>

    </div>

    <!--  content  -->

    <div id="content">

        <p id="title">سورة ${random?.surah} | ${title}</p>

        <div id="text">

            ${filterSpan(body)}

        </div>

    </div>

    <!--  footer  -->

    <div id="footer">

        <div id="footer_text">
            <p>@maktbti_bot : تم النشر بواسطة بوت مكتبتي </p>
            <small id="website">www.walid-fekry.com</small>
        </div>

        <img src="logo.png" id="logo">
    </div> 

</body>

</html>`;

    fs.writeFileSync(path.join(__dirname, './module/Hijri/index.html'), html);

    return {
        today: today,
        todayEn: todayEn,
        Hijri: moment_hijri().locale('ar-SA').format('iYYYY/iM/iD'),
        Gregorian: moment_hijri().locale('en').format('YYYY/M/D'),
        title: title,
        surah: random?.surah,
        body: body
    };
}

/**
 * القائمة getTitle هي وظيفة للحصول على عنوان العنصر العشوائي بناءً على القيمة الممررة.
 *
 * @param {string} randomArr - القيمة العشوائية الممررة.
 * @returns {string} - العنوان المناسب بناءً على القيمة الممررة.
 */
function getTitle(randomArr) {
    switch (randomArr) {
        case 'ayaatiha':
            return 'آيَـــــــــــــــاتُـــــها';
        case 'maeni_asamuha':
            return 'مَعــــــنَـى اسْـــــــمِها';
        case 'sabab_tasmiatiha':
            return 'سَبَبُ تَسْمِيَتِها';
        case 'maqsiduha_aleamu':
            return 'مَقْصِدُها العَامُّ';
        case 'sabab_nuzuliha':
            return 'سَبَبُ نُزُولِهَا';
        case 'fadluha':
            return 'فَضْــــــلُها';
        default:
            return 'مُنَــاسَــبَاتُــها';
    }
}

/**
 * القائمة getBody هي وظيفة للحصول على محتوى العنصر العشوائي بناءً على القيم الممررة.
 *
 * @param {Object} random - كائن القيم العشوائية.
 * @param {string} randomArr - القيمة العشوائية الممررة.
 * @returns {string} - المحتوى المناسب بناءً على القيم الممررة.
 */
function getBody(random, randomArr) {
    if (Array.isArray(random?.[randomArr])) {
        return random?.[randomArr].join('<br>');
    } else {
        return random?.[randomArr];
    }
}