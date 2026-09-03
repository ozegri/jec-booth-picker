# JEC Booth Picker — v6

Tek dosya: `index.html`. Sunucu, veritabanı, build adımı yok. Aşağıdaki yolların hepsi ücretsiz.

## Bu sürümde ne değişti (v6)

- **Early bird ibaresi kaldırıldı.** Fiyatlar artık doğrudan liste fiyatı (513 EUR/m2 raw + ekipman).
  Kalan tek secenek Fransiz katilimci KDV'si.
- **Doluluklar tazelendi** (3 Eylul 2026). Hall 5 -> 52 bos, Hall 6 -> 70 bos stand.
- **Gunluk otomatik guncelleme kuruldu.** Veri artik `data/booths.json` dosyasindan okunuyor ve
  bir GitHub Actions isi her sabah bu dosyayi resmi plandan yeniden uretiyor. Detay asagida.
- Sol panelde **"Availability as of ..."** damgasi var - ziyaretci verinin ne kadar taze oldugunu goruyor.

## Onceki surumde (v5)

- **Köşegen koridordaki kaymalar giderildi.** 45° döndürülmüş standların geometrisini yanlış çözüyordum:
  şekli origin noktası etrafında döndürüyordum, oysa kaynak çizim motoru (Fabric.js) şekli
  **kendi sınır kutusunun merkezi** etrafında döndürüyor. Bu yüzden döndürülmüş standlar ~9 m kayıyordu.
  Etkilenen 17 stand yeniden hesaplandı: Hall 6'da ANGELONI, ASC, MICROTEX, ADVANTAGE AUSTRIA, MARTE,
  DURATEK, WILLIS, D.I.T., AMP, ARKEMA, AVIC, AKSA CARBON, SKY COMPOSITES, MAGNUM VENUS ve
  Hall 5'te REST AREA + iki küçük stand. Resmi planla karşılaştırılarak doğrulandı.

## Önceki sürümde (v4)

- **Stand numaraları yerine oturdu.** Üçgen ve L şeklindeki standlarda etiket, şeklin sınır kutusunun
  ortasına konduğu için koridora düşüyordu (6C13/6C23, 6E46, 6M90 gibi). Artık etiket standın
  gerçekten içinde, kenarlardan en uzak noktaya konuyor. 566 etiketin tamamı kontrol edildi, hiçbiri dışarıda değil.
- **Ana girişler yeniden konumlandı.** Hall 5'te giriş sağa alındı — 5H01'in ve büyük koridorun tam önünde.
  Hall 6'da Startup Booster'ın hemen altına, sağ tarafa taşındı.
- **Rezerve edilenler kapatıldı:** `6J05`, `6B35`, `6J86` (Hall 6) ve `5H01` (Hall 5) artık kırmızı,
  talep edilemiyor. Tooltip'te "Reserved" yazıyor.

## Önceki sürümde (v3)

- **Harita yönü düzeltildi.** Önceki sürümde yanlışlıkla yatay ayna uygulanmıştı (sağ–sol ters).
  Artık resmi JEC planlarıyla birebir aynı: Hall 6'da Hall 5 sınırındaki köşegen standlar sol altta,
  Live Demonstration Area sağda, Startup Booster altta.
- **Giriş kapıları düzeltildi.** Her iki holde de ana giriş aşağıda, resmi planda işaretli yerde.
  Emin olmadığım servis kapıları (Hall 5'teki teknik giriş) kaldırıldı; Hall 6'nın SORTIE çıkışı duruyor.
- **Renk açıklaması şeridi eklendi** — haritanın üstünde her zaman görünür:
  yeşil = müsait/talep edilebilir · kırmızı = dolu · turuncu = özel fuar alanı, kiralanamaz.
  Sağda ayrıca "Only green booths can be requested." rozeti var.
  Turuncu alanlar tıklanamıyor ve hesaplamaya girmiyor.
- **Paket içerikleri ve örnek görseller:** Shell Scheme, Smart, Advanced, Be Ready ve Be Ready NMR
  seçildiğinde neyin dahil olduğu madde madde ve JEC kataloğundaki örnek stand görseliyle birlikte çıkıyor
  (görsele tıklayınca büyüyor).
- **Veri tazelendi** (702 katılımcı). Dolu standların üstüne firma adı geliyor, üstüne gelince tooltip'te de görünüyor.

Guncel durum: **Hall 5 -> 52 bos stand**, **Hall 6 -> 70 bos stand**.
Turuncu işaretlenenler: Hall 5'te 24, Hall 6'da 39 alan (ulusal pavilyonlar, Agora, Innovation Planet,
Startup Booster, VIP Lounge, Terrace Restaurant, Rest Area, TV Studio vb.).

---

## 1) Sadece bakmak için (30 saniye)

`index.html` dosyasına çift tıkla. Harita ve fiyat hesabı çalışır.
Sadece form gönderimi çalışmaz — o sunucu ister.

## 2) Netlify — e-posta gönderimi dahil (10 dakika)

**Önemli:** Netlify'da form algılama varsayılan olarak KAPALIDIR. Açmadan ve yeniden yüklemeden
formlar çalışmaz — en sık yapılan hata bu.

1. **https://app.netlify.com/drop** adresini aç, `site` klasörünü (veya zip'i) sürükle-bırak.
   Birkaç saniyede `https://rastgele-isim.netlify.app` adresi verir.
2. Ücretsiz hesap aç (GitHub/Google girişi yeter) ve siteyi hesabına al ("Claim").
3. **Form algılamayı aç:** sol menüden **Forms** → **Enable form detection**.
4. **Siteyi yeniden yükle.** Algılama sadece bir sonraki deploy'dan itibaren çalışır:
   **Deploys** sekmesine gidip `site` klasörünü tekrar sürükle-bırak.
5. Sitede bir stand seç → *Request to book this booth* → formu doldur → gönder.
   **Forms** sekmesinde `booth-request` formu ve gönderdiğin kayıt görünmeli.
   (Form burada görünmüyorsa 3–4. adımlar eksik demektir.)
6. **E-postayı bağla:** **Project configuration → Notifications → Emails and webhooks**
   → **Add notification → Email notification** → Event: *New form submission*,
   Form: `booth-request`, Email to notify: `egriboz@wastelessevent.com` → Save.
7. Bir test gönderimi daha yap ve mailini kontrol et.
   Mailler **formresponses@netlify.com** adresinden gelir — ilk seferde spam klasörüne
   düşebilir, göndereni güvenli listeye ekle.

Notlar:
- Formda `email` alanı var, bu yüzden bildirim mailine **Reply-to** olarak talep sahibinin adresi
  düşer — mailde doğrudan "yanıtla" diyerek müşteriye dönebilirsin.
- Netlify'ın güncel (kredi tabanlı) ücretsiz planında form gönderimi sınırsız.
  Eski/legacy planlardaki hesaplarda site başına ayda 100 gönderim sınırı vardı.
- Spam olarak işaretlenen gönderimler için mail gitmez; hepsi yine de Forms sekmesinde listelenir.

**Güncelleme:** dosyayı değiştir, klasörü tekrar sürükle (**Deploys → Drag and drop**).

### Netlify yerine Formspree (alternatif)

Netlify'la uğraşmak istemezsen: [formspree.io](https://formspree.io)'da ücretsiz hesap aç,
bir form oluştur, sana verdiği ID'yi al ve `index.html` içinde tek satırı değiştir:

```js
const r = await fetch("/", {          →   const r = await fetch("https://formspree.io/f/SENIN_ID", {
```

Formspree gönderimleri doğrudan kayıt olduğun adrese mailler. Ücretsiz planı ayda 50 gönderim.
Bu yöntem GitHub Pages dahil her yerde çalışır.

## 3) GitHub Pages — versiyon geçmişi istersen

Public repo aç → `index.html` yükle → **Settings → Pages → Deploy from a branch → main / (root)**.
GitHub Pages form gönderemez — yukarıdaki Formspree adımını uygula.

## 4) Gunluk otomatik guncelleme (onerilen kurulum)

Ekip floor plan'de degisiklik yaptiginda site kendi kendine guncellensin istiyorsan:

**Nasil calisiyor:** `tools/update-booths.mjs` resmi planin kendi veri servisini cagirip
`data/booths.json` dosyasini yeniden uretiyor. Sayfa acilirken bu dosyayi okuyor.
GitHub Actions bunu her sabah calistirip degisiklik varsa commit ediyor; Netlify repoya bagliysa
commit'i gorup siteyi kendiliginden yeniden yayinliyor. Toplam maliyet: sifir.

1. GitHub'da **public** bir repo ac, bu klasorun tamamini yukle
   (`index.html`, `data/`, `tools/`, `.github/`).
2. Netlify'da **Add new project -> Import an existing project -> GitHub** ile bu repoyu sec.
   (Drag-drop ile kurduysan: **Site configuration -> Build & deploy -> Link to a Git repository**.)
   Build command bos, publish directory `/`.
3. Repoda **Actions** sekmesine gir, is akislarini etkinlestir.
4. **Refresh booth availability -> Run workflow** deyip bir kez elle calistir, ciktiyi kontrol et.
   Calisiyorsa her gun **05:10 UTC** (Paris'te yazin 07:10) otomatik donecek.

Saati degistirmek icin `.github/workflows/update-booths.yml` icindeki `cron: "10 5 * * *"` satirini
duzenle (UTC).

**Elle rezerve ettigin standlar korunur.** `tools/overrides.json` her calistirmada yeniden uygulanir:

```json
{
  "reserved":     { "5H01": "Reserved", "6J05": "Reserved" },
  "zones":        { "6T32": "KOREAN PAVILION" },
  "zonePrefixes": { "6H04-": "STARTUP BOOSTER POD" }
}
```

- `reserved` -> kirmizi, talep edilemez (kendi tuttugun standlar)
- `zones` -> turuncu, satilik degil (otomatik yakalanmayan pavilyonlari buraya ekle)
- `zonePrefixes` -> kodu bu onekle baslayan her stand turuncu olur

Bilgisayarinda denemek icin: `node tools/update-booths.mjs` (Node 18+).

**Not:** Bu script JEC'in kendi floor plan servisini okuyor. Gunluk otomatik cekim baslatmadan once
JEC tarafindan onay alman iyi olur - teknik bir engel yok, nezaket meselesi.

## Kendi alan adin

Hosting ücretsiz kalır, alan adı yıllık ~10–15 €. Netlify'da **Domain management → Add a domain**,
SSL otomatik ve ücretsiz.

---

## Dosya içinde neyi nerede değiştirirsin

| Ne | Nerede |
|---|---|
| m² fiyatları | `RAW_RATE` ve `const EQUIP = [...]` içindeki `rate` alanları |
| Paket içerik maddeleri ve açıklamalar | `EQUIP` içindeki `incl` ve `blurb` |
| Paket örnek görselleri | `const SHOTS = {...}` (base64 gömülü JPEG) |
| Açık kenar zamları | `const SURCHARGE = {1:0, 2:0.07, 3:0.11, 4:0.13}` |
| Kayıt paketi / sürdürülebilirlik | `quote()` içindeki `C` ve `D` satırları |
| Talep e-postası | `const CONTACT = "..."` |
| Giriş kapıları | `const ENTRANCES = {...}` |
| Stand verisi (yedek) | `const RAW = { "Hall 5": \`...\` }` - dosya cift tiklanarak acildiginda kullanilir |
| Stand verisi (canli) | `data/booths.json` - script uretir, sayfa okur |
| Rezerve / ozel alan listesi | `tools/overrides.json` |
| Döndürülmüş stand geometrisi | `shapePts` mantığı çıkarma sırasında uygulandı: noktalar OriginPoint'e taşınır, sonra **sınır kutusunun merkezi** etrafında döndürülür (origin etrafında değil). |
| Harita yönü | `const SX = p => p[0]` ve `const SY = p => p[1]` — kaynak CAD çizimi Y-yukarı olduğu için bu eşleme dikey çevirme yapıp resmi plan yönünü verir. `SY = p => -p[1]` ham yön, `SX = p => -p[0]` yatay ayna (kullanma). |

Stand satır biçimi:
`STANDNO|m²|açıkKenar|durum|isim|R|x,y,genişlik,yükseklik`
`durum`: `0` = boş, `1` = dolu, `2` = pavilyon/fuar alanı (satılık değil).
`R` yerine `P` varsa poligon köşe listesi gelir (`x y,x y,...`).

---

## Notlar / sınırlar

- **Pavilyon tespiti etiket bazlı.** Resmi planda pavilyon adı hangi standın içine yazılmışsa o stand
  turuncu işaretlendi. Örneğin Kore pavilyonunun 2 standı yakalandı; pavilyon fiilen daha geniş bir bloksa
  komşu standlar kırmızı görünmeye devam eder. Elle düzeltmek kolay: ilgili satırın `durum` alanını `2` yap,
  isim alanına pavilyon adını yaz.
- **Bir standi rezerve etmek icin:** `tools/overrides.json` icindeki `reserved` blokuna
  `"6J05": "Reserved"` seklinde ekle. Otomatik guncelleme kurulu degilse `data/booths.json`
  icinde o satirin dorduncu alanini `1`, besinci alanini `Reserved` yap.
- Fiyat motoru kataloğun 26. sayfasındaki modelin birebir uygulaması ve dokümanın kendi örneğiyle
  doğrulanıyor (24 m², Advanced, 2 açık kenar → 22.412,64 € hariç KDV).
