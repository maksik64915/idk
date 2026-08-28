# Гомін — Android-проєкт

Обгортка WebView навколо однофайлового месенджера `app/src/main/assets/index.html`.

Сторінка віддається через `WebViewAssetLoader` на домені
`https://appassets.androidplatform.net/`, тому браузерний рушій вважає її
захищеним контекстом — працюють камера, мікрофон, WebRTC і локальне сховище.
Якби файл вантажився з `file://`, дзвінки та голосові не працювали б.

---

## Спосіб 1 — APK збирає GitHub (нічого встановлювати не треба)

1. Створіть новий репозиторій на GitHub.
2. Завантажте туди вміст цієї теки (кнопка **Add file → Upload files**,
   перетягніть усі файли й теки, включно з прихованою `.github`).
3. Відкрийте вкладку **Actions** → запуск **Build APK** стартує сам.
   Якщо ні — натисніть **Run workflow**.
4. Через 3–5 хвилин у завершеному запуску внизу зʼявиться блок **Artifacts**
   з архівом `homin-apk`. Усередині — `app-debug.apk`.
5. Перекиньте APK на телефон і встановіть (дозвольте «встановлення з
   невідомих джерел» для того застосунку, звідки відкриваєте файл).

## Спосіб 2 — Android Studio

1. **File → Open** і оберіть цю теку.
2. Дочекайтесь синхронізації Gradle (Studio сама підтягне все потрібне
   й створить Gradle-wrapper).
3. **Build → Build Bundle(s)/APK(s) → Build APK(s)**.
4. APK буде тут: `app/build/outputs/apk/debug/app-debug.apk`.

## Спосіб 3 — командний рядок

Потрібні JDK 17, Android SDK (platform 34, build-tools) і Gradle 8.5+:

```bash
export ANDROID_HOME=/шлях/до/Android/Sdk
gradle assembleDebug
```

---

## Оновити застосунок

Уся програма — це один файл `app/src/main/assets/index.html`.
Замініть його новішою версією й зберіть APK ще раз. Нічого іншого
чіпати не потрібно.

## Підпис для Google Play

Зараз release-збірка підписується debug-ключем — цього достатньо, щоб
встановити APK вручну, але недостатньо для публікації. Для Play створіть
власний keystore і замініть `signingConfig signingConfigs.debug`
у `app/build.gradle` на свій `signingConfigs.release`.

## Що всередині

```
app/src/main/assets/index.html   ← весь месенджер
app/src/main/java/.../MainActivity.java
app/src/main/AndroidManifest.xml ← дозволи: інтернет, камера, мікрофон, вібрація
app/src/main/res/                ← іконки, теми (світла/темна), рядки
.github/workflows/build-apk.yml  ← складання APK у хмарі
```

**Мінімальна версія Android:** 7.0 (API 24).
**Дозволи:** камера й мікрофон запитуються не на старті, а коли ви вперше
натискаєте дзвінок або запис голосового.
