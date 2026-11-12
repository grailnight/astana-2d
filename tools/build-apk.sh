#!/usr/bin/env bash
# Собирает игру для Android без Gradle: aapt2 → javac → d8 → подпись.
#   tools/build-apk.sh        → dist/astana.apk  (установка файлом, любительский ключ из репозитория)
#   tools/build-apk.sh aab    → dist/astana.aab  (для Google Play, свой закрытый ключ — см. store/README.md)
# Нужны JDK 17+ и Android SDK с platforms;android-36 и build-tools;36.0.0:
#   ANDROID_SDK=/путь/к/sdk tools/build-apk.sh
# Для aab ещё нужен bundletool: BUNDLETOOL=/путь/к/bundletool.jar (по умолчанию $ANDROID_SDK/bundletool/bundletool.jar)
set -euo pipefail

MODE="${1:-apk}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SDK="${ANDROID_SDK:-${ANDROID_HOME:-$HOME/android-sdk}}"
API="${TARGET_API:-36}"
BT="$SDK/build-tools/${BUILD_TOOLS:-36.0.0}"
PLATFORM="$SDK/platforms/android-$API/android.jar"
OUT="$ROOT/build/$MODE"
VERSION_NAME="${VERSION_NAME:-1.6}"
VERSION_CODE="${VERSION_CODE:-$(git -C "$ROOT" rev-list --count HEAD 2>/dev/null || echo 1)}"

for f in "$BT/aapt2" "$BT/d8" "$BT/zipalign" "$BT/apksigner" "$PLATFORM"; do
  [ -e "$f" ] || { echo "Не найден $f — установи Android SDK (см. README)"; exit 1; }
done

if [ "$MODE" = aab ]; then
  BUNDLETOOL="${BUNDLETOOL:-$SDK/bundletool/bundletool.jar}"
  [ -e "$BUNDLETOOL" ] || { echo "Не найден bundletool: $BUNDLETOOL (см. store/README.md)"; exit 1; }
  # Ключ для магазина в репозитории не хранится: путь и пароли приходят из переменных окружения
  : "${ASTANA_KEYSTORE:?Укажи ASTANA_KEYSTORE — путь к своему ключу загрузки (см. store/README.md)}"
  : "${ASTANA_KS_PASS:?Укажи ASTANA_KS_PASS — пароль от ключа}"
  [ -e "$ASTANA_KEYSTORE" ] || { echo "Нет файла ключа: $ASTANA_KEYSTORE"; exit 1; }
  case "$(cd "$(dirname "$ASTANA_KEYSTORE")" && pwd)/" in
    "$ROOT"/*) echo "Ключ для магазина лежит внутри репозитория — перенеси его в другое место."; exit 1 ;;
  esac
  KEY_ALIAS="${ASTANA_KEY_ALIAS:-upload}"
elif [ "$MODE" != apk ]; then
  echo "Неизвестный режим «$MODE»: нужно apk или aab"; exit 1
fi

rm -rf "$OUT" && mkdir -p "$OUT/assets/www" "$OUT/classes" "$OUT/dex" "$OUT/gen" "$ROOT/dist"

# 1. Файлы игры. Шрифты берём локальные, чтобы игра работала без интернета.
cp -r "$ROOT/src" "$ROOT/style.css" "$OUT/assets/www/"
cp -r "$ROOT/android/www/fonts" "$OUT/assets/www/"
sed -e '/fonts.googleapis.com\/css2/c\<link rel="stylesheet" href="fonts/fonts.css">' \
    -e '/rel="preconnect"/d' -e '/rel="manifest"/d' -e '/rel="apple-touch-icon"/d' -e '/rel="icon"/d' \
    "$ROOT/index.html" > "$OUT/assets/www/index.html"

# 2. Ресурсы и манифест (для aab — в формате protobuf)
PROTO=()
[ "$MODE" = aab ] && PROTO=(--proto-format)
"$BT/aapt2" compile --dir "$ROOT/android/res" -o "$OUT/res.zip"
"$BT/aapt2" link "${PROTO[@]}" -o "$OUT/base.apk" -I "$PLATFORM" \
  --manifest "$ROOT/android/AndroidManifest.xml" -R "$OUT/res.zip" -A "$OUT/assets" \
  --java "$OUT/gen" --auto-add-overlay \
  --min-sdk-version 24 --target-sdk-version "$API" \
  --version-code "$VERSION_CODE" --version-name "$VERSION_NAME"

# 3. Java → dex
javac -nowarn -Xlint:-options --release 8 -cp "$PLATFORM" -d "$OUT/classes" \
  $(find "$OUT/gen" "$ROOT/android/src" -name '*.java')
"$BT/d8" --release --lib "$PLATFORM" --min-api 24 --output "$OUT/dex" $(find "$OUT/classes" -name '*.class')

if [ "$MODE" = apk ]; then
  # 4a. APK: выравнивание и подпись любительским ключом
  cp "$OUT/base.apk" "$OUT/unsigned.apk"
  (cd "$OUT/dex" && zip -q -u "$OUT/unsigned.apk" classes.dex)
  "$BT/zipalign" -p -f 4 "$OUT/unsigned.apk" "$OUT/aligned.apk"
  "$BT/apksigner" sign --ks "$ROOT/android/astana.keystore" --ks-key-alias astana \
    --ks-pass pass:astana-game --key-pass pass:astana-game \
    --out "$ROOT/dist/astana.apk" "$OUT/aligned.apk"
  "$BT/apksigner" verify "$ROOT/dist/astana.apk"
  RESULT="$ROOT/dist/astana.apk"
else
  # 4b. AAB: раскладываем модуль base так, как ждёт bundletool, и подписываем ключом загрузки
  M="$OUT/module"
  mkdir -p "$M/manifest" "$M/dex"
  (cd "$M" && unzip -q "$OUT/base.apk")
  mv "$M/AndroidManifest.xml" "$M/manifest/AndroidManifest.xml"
  cp "$OUT/dex/classes.dex" "$M/dex/classes.dex"
  (cd "$M" && zip -q -r "$OUT/base.zip" .)
  rm -f "$ROOT/dist/astana.aab"
  java -jar "$BUNDLETOOL" build-bundle --modules="$OUT/base.zip" --output="$ROOT/dist/astana.aab"
  ASTANA_KS_PASS="$ASTANA_KS_PASS" ASTANA_KEY_PASS="${ASTANA_KEY_PASS:-$ASTANA_KS_PASS}" \
    jarsigner -keystore "$ASTANA_KEYSTORE" -storepass:env ASTANA_KS_PASS -keypass:env ASTANA_KEY_PASS \
    -sigalg SHA256withRSA -digestalg SHA-256 "$ROOT/dist/astana.aab" "$KEY_ALIAS" > /dev/null
  java -jar "$BUNDLETOOL" validate --bundle="$ROOT/dist/astana.aab" > /dev/null
  RESULT="$ROOT/dist/astana.aab"
fi
echo "Готово: $RESULT ($(du -h "$RESULT" | cut -f1), версия $VERSION_NAME / $VERSION_CODE, Android API $API)"
