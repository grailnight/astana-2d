#!/usr/bin/env bash
# Собирает dist/astana.apk без Gradle: aapt2 → javac → d8 → zipalign → apksigner.
# Нужны JDK 17+ и Android SDK с platforms;android-35 и build-tools;35.0.0:
#   ANDROID_SDK=/путь/к/sdk tools/build-apk.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SDK="${ANDROID_SDK:-${ANDROID_HOME:-$HOME/android-sdk}}"
BT="$SDK/build-tools/${BUILD_TOOLS:-35.0.0}"
PLATFORM="$SDK/platforms/android-35/android.jar"
OUT="$ROOT/build/apk"
VERSION_NAME="${VERSION_NAME:-1.4}"
VERSION_CODE="${VERSION_CODE:-$(git -C "$ROOT" rev-list --count HEAD 2>/dev/null || echo 1)}"

for f in "$BT/aapt2" "$BT/d8" "$BT/zipalign" "$BT/apksigner" "$PLATFORM"; do
  [ -e "$f" ] || { echo "Не найден $f — установи Android SDK (см. README)"; exit 1; }
done

rm -rf "$OUT" && mkdir -p "$OUT/assets/www" "$OUT/classes" "$OUT/dex" "$OUT/gen"

# 1. Файлы игры. Шрифты берём локальные, чтобы игра работала без интернета.
cp -r "$ROOT/src" "$ROOT/style.css" "$OUT/assets/www/"
cp -r "$ROOT/android/www/fonts" "$OUT/assets/www/"
sed -e '/fonts.googleapis.com\/css2/c\<link rel="stylesheet" href="fonts/fonts.css">' \
    -e '/rel="preconnect"/d' -e '/rel="manifest"/d' -e '/rel="apple-touch-icon"/d' -e '/rel="icon"/d' \
    "$ROOT/index.html" > "$OUT/assets/www/index.html"

# 2. Ресурсы и манифест
"$BT/aapt2" compile --dir "$ROOT/android/res" -o "$OUT/res.zip"
"$BT/aapt2" link -o "$OUT/base.apk" -I "$PLATFORM" \
  --manifest "$ROOT/android/AndroidManifest.xml" -R "$OUT/res.zip" -A "$OUT/assets" \
  --java "$OUT/gen" --auto-add-overlay \
  --min-sdk-version 24 --target-sdk-version 34 \
  --version-code "$VERSION_CODE" --version-name "$VERSION_NAME"

# 3. Java → dex
javac -nowarn -Xlint:-options --release 8 -cp "$PLATFORM" -d "$OUT/classes" \
  $(find "$OUT/gen" "$ROOT/android/src" -name '*.java')
"$BT/d8" --release --lib "$PLATFORM" --min-api 24 --output "$OUT/dex" $(find "$OUT/classes" -name '*.class')
cp "$OUT/base.apk" "$OUT/unsigned.apk"
(cd "$OUT/dex" && zip -q -u "$OUT/unsigned.apk" classes.dex)

# 4. Выравнивание и подпись
"$BT/zipalign" -p -f 4 "$OUT/unsigned.apk" "$OUT/aligned.apk"
mkdir -p "$ROOT/dist"
"$BT/apksigner" sign --ks "$ROOT/android/astana.keystore" --ks-key-alias astana \
  --ks-pass pass:astana-game --key-pass pass:astana-game \
  --out "$ROOT/dist/astana.apk" "$OUT/aligned.apk"
"$BT/apksigner" verify "$ROOT/dist/astana.apk"
echo "Готово: $ROOT/dist/astana.apk ($(du -h "$ROOT/dist/astana.apk" | cut -f1), версия $VERSION_NAME / $VERSION_CODE)"
