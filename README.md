# Discord Futbol RP Botu (Discord.js v14)

Discord icinde uzun sure oynanabilir futbol kariyer rol yapma deneyimi sunan, slash command tabanli, cok kullanicili RP botu.

## Kritik Kurallar

- Kullanici basina tek kariyer vardir (sunucu fark etmez).
- Karakter sadece 1 kez olusturulur.
- Sifirlama icin `/kariyer-sil` kullanilir.

## Komutlar

- `/başla rol:<futbolcu|teknik-direktor|kulup-sahibi>`
- `/karakter-oluştur isim:<metin> yas:<sayi> ulke:<secim> pozisyon:<secim> [tip-foto:<dosya>]`
- `/profil [oyuncu:@etiket]`
- `/maç aksiyon:<sut|pas|dripling> [karar:<secim>]`
- `/antrenman [tip:<normal|ozel>]`
- `/transfer islem:<teklif|kabul|ret|durum>`
- `/lig`
- `/sıralama`
- `/günlük`
- `/claim`
- `/cd`
- `/friendly kullanici:@etiket`
- `/arena`
- `/taktik dizilim:<secim> [ilk11:<virgullu-liste>]`
- `/yönetim islem:<...> [miktar:<sayi>]`
- `/prefix [deger]`
- `/yardım`
- `/kariyer-sil`
- `/çekiliş` (sadece owner)
- `/booster-çekiliş` (sadece owner)
- `/ticket-sistemi` (sadece owner)

## Lokal Calistirma

```bash
npm install
npm run deploy:global
npm start
```

## Render (GitHub ile)

Bu repo `render.yaml` ile gelir. Render, push ettigin repodan otomatik okuyabilir.

### 1. GitHub'a Yukle

```bash
git init
git add .
git commit -m "Render-ready Discord bot"
git branch -M main
git remote add origin <SENIN_GITHUB_REPO_URL>
git push -u origin main
```

### 2. Render'da Deploy

- Render Dashboard -> `New` -> `Blueprint`
- Repo sec
- `render.yaml` otomatik bulunur

### 3. Render Env Vars

Render servisinde su degiskenleri doldur:

- `DISCORD_TOKEN`
- `CLIENT_ID`
- `GUILD_ID` (opsiyonel)
- `OWNER_USER_ID` (varsayilan: `1330138758535843840`)

### 4. Slash Komutlari

Komutlari bir kez yuklemek icin lokalde:

```bash
npm run deploy:global
```

## Onemli Not

- `.env` dosyasini GitHub'a yukleme (`.gitignore` zaten engelliyor).
- Botun prefix komutlari icin Discord Developer Portal'da `Message Content Intent` acik olmalidir.
- Render free web planinda servis uyuyabilir. Gercek 7/24 icin uyanmayan bir plan kullan.
