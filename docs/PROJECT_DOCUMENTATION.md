# LocalMind E-Ticaret Chatbot Projesi

## Genel Bakış
LocalMind, yapay zeka entegrasyonu tamamen **lokal (Ollama)** üzerinden çalışan, modern web teknolojileri (Next.js) ve PostgreSQL tabanlı güvenli bir chatbot & müşteri hizmetleri projesidir. Proje özellikle, kullanıcıların sorduğu soruları anlayıp veritabanındaki ürünleri bularak sorulara kesin ve doğru cevaplar verebilen gelişmiş bir **RAG (Retrieval-Augmented Generation)** yeteneğine sahiptir.

## Teknolojik Altyapı
- **Frontend & Backend**: Next.js 16+ (App Router), React 19
- **Stil & Arayüz**: Tailwind CSS v4, shadcn/ui
- **Veritabanı**: PostgreSQL
- **ORM**: Drizzle ORM
- **LLM Sağlayıcısı**: Ollama (Lokal çalışır, veriyi dışarıya sızdırmaz)
- **Paket Yöneticisi**: pnpm

## Temel Özellikler

### 1. E-Ticaret Müşteri Temsilcisi (Widget)
Uygulama sadece standart bir chatbot değil, aynı zamanda sitelere entegre edilebilecek bir asistan widget'ı barındırır.
- **Kesin Yanıt Kuralları:** Sisteme verilen katı (strict) prompt'lar sayesinde yapay zekanın veritabanında olmayan özellikleri (fiyat, stok, renk) uydurması tamamen engellenmiştir ("Sıfır Halüsinasyon").
- **Kişiselleştirilmiş İletişim:** Yanıtlarını "robotik" kalıplardan uzak, son derece akıcı ve doğal Türkçe ile verir.

### 2. Gelişmiş RAG (Retrieval-Augmented Generation) & Niyet Okuma
Kullanıcı bir ürün sorduğunda ("akıllı saat ne kadar?") aşağıdaki adımlar izlenir:
1. **Niyet Okuma (Intent Extraction):** Kullanıcının sorusu özel bir yapay zeka promptundan geçirilip sorudaki ana ürün JSON formatında (`{"product": "akıllı saat"}`) elde edilir.
2. **Karakter Standardizasyonu:** Yapay zeka ve kullanıcıdan gelen Türkçe harfler (ı, ş, ğ, ç, ö, ü vb.), veritabanındaki kayıtlarla (Örn: "Akıllı Saat") eşleşebilmesi için SQL **joker karakterlerine (`_`)** dönüştürülerek normalize edilir. (Böylece `akilli saat` kelimesi bile `Akıllı Saat` ile mükemmel eşleşir).
3. **Veritabanı Sorgusu (ILIKE):** Ürünlerin ismi, kategorisi ve açıklaması arasında bu anahtar kelime dinamik olarak aranır.
4. **Bağlam Enjeksiyonu (Context Injection):** Ürün bulunursa fiyat, kategori ve detaylı özellikleri alınarak modelin **ana sistem promptuna (chatHistory[0]) kalıcı olarak iliştirilir**. Böylece model, kullanıcının sorusuna doğrudan fiyat ve ürün bilgisi vererek güvenli bir şekilde yanıtlar.

### 3. NDJSON Streaming ve Chunk Okuma
Ollama'dan dönen akış (streaming) HTTP chunkları anlık olarak kesintisiz bir biçimde istemciye iletilir (Server-Sent Event mantığı). Gelen parçalar Stream okuyucularıyla işlenip veri tabanına başarılı bir şekilde "completed" olarak kaydedilir.

## Kurulum ve Çalıştırma
Projeyi kendi ortamınızda çalıştırmak için aşağıdaki adımları izleyebilirsiniz.

### Gereksinimler
- Node.js >= 18
- PostgreSQL (Çalışan bir veritabanı)
- Ollama (Arka planda çalışır durumda olmalıdır)

### Kurulum Adımları
1. **Bağımlılıkları Yükleyin:**
   ```bash
   pnpm install
   ```

2. **Ortam Değişkenlerini (`.env`) Ayarlayın:**
   Projeyi ayağa kaldırmadan önce `.env` dosyasını oluşturun:
   ```env
   DATABASE_URL=postgres://kullanici_adi:sifre@localhost:5432/chatbot
   ```

3. **Veritabanı Şemalarını Gönderin:**
   ```bash
   pnpm db:push
   ```

4. **Yapay Zeka Modelini İndirin:**
   Projenin temel varsayılan modelini bilgisayarınıza indirin (Örn. Qwen):
   ```bash
   ollama pull qwen2.5-coder:latest
   ```

5. **Uygulamayı Başlatın:**
   ```bash
   pnpm dev
   ```

## Önemli Klasör ve Dosyalar
- `src/app/api/widget/chat/route.ts`: Chat widget'ının arama niyet okuma (Intent RAG) ve veritabanı sorgulama mantığını içerir. Sistem prompt enjeksiyonları burada gerçekleşir.
- `src/lib/db/schema.ts`: Veritabanı tablolarının, ürünlerin (products) ve mesaj geçmişlerinin (messages, conversations) tutulduğu kısımdır.
- `src/lib/ollama/ollama-client.ts`: Ollama REST API servisleriyle doğrudan köprü kuran streaming mekanizmalarını yönetir.

---
*Bu dokümantasyon projenin RAG yetenekleri, yapısı ve son düzeltmeleri referans alınarak oluşturulmuştur.*
