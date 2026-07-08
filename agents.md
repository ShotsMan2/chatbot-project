# LocalMind Agent & Geliştirme Standartları Kılavuzu

Bu dosya, LocalMind projesi üzerinde çalışacak yapay zeka geliştirme araçları (Cursor, Cline vb.) ve geliştiriciler için temel rehberdir. Projenin mimari bütünlüğünü, güvenlik standartlarını ve test süreçlerini korumak için aşağıdaki kurallara harfiyen uyulmalıdır.

## 1. Proje Genel Bakışı ve Dizin Yapısı
LocalMind, Next.js App Router mimarisini temel alan, lokal Ollama servisleri ile entegre çalışan ve veritabanı olarak **PostgreSQL** (Drizzle ORM) kullanan bir yapay zekâ chatbot ve müşteri hizmetleri widget arayüzüdür. Projede çalışırken aşağıdaki dizin hiyerarşisine ve sorumluluk alanlarına kesinlikle sadık kalınmalıdır:

- **App Router (`src/app`)**: Sayfalar (Page) ve Route Handler (API) katmanı.
  - `api/widget/chat/`: Widget üzerinden gelen talepleri işleyen, Intent RAG ve veritabanı eşleştirmesi yapan asıl API noktası.
- **Components (`src/components`)**:
  - `chat/`: Chat composer, stream renderer ve mesaj bileşenleri.
  - `sidebar/`: Sohbet geçmişini gösteren bileşen.
  - `settings/`: Uygulama ayarlarını değiştiren UI formu.
  - `ui/`: shadcn/ui bileşenleri (Button, Input vb.)
- **Lib (`src/lib`)**:
  - `db/`: Drizzle ORM şemaları (PostgreSQL bağlantısı).
  - `ollama/`: Ollama REST API sağlayıcısı, stream parser.
  - `validation/`: Zod şemaları.
  - `actions/`: Sunucu eylemleri (Server actions - Veritabanına güvenli erişim için).

---

## 2. Mimari Kurallar ve Teknik Kararlar

Yeni özellikler eklerken veya mevcut kodu düzenlerken aşağıdaki kararlara uymak **zorunludur**:

### A. Gelişmiş RAG & Niyet Okuma (Intent Extraction) Mimarisi
- **Niyet Okuma (JSON formatı):** Kullanıcı mesajından niyet çıkarılırken, Ollama REST API'sinde mutlaka `format: "json"` kullanılmalı ve yapay zekanın sadece JSON dönmesi (Örn: `{"product": "akıllı saat"}`) garanti altına alınmalıdır.
- **Karakter Standardizasyonu (Wildcard):** Türkçe karakterlerin (ı, ş, ğ, ç, ö, ü) PostgreSQL'deki `ILIKE` sorgularında sorun yaratmasını engellemek için, niyet okuma sonucu elde edilen kelimelerdeki bu harfler SQL joker karakterine (`_`) dönüştürülmelidir.
- **Bağlam Enjeksiyonu (Context Injection):** Veritabanından bulunan ürün verileri, mesaj dizisinin ortasına/sonuna yeni bir `system` rolüyle **eklenmemelidir** (Qwen gibi modeller bunu görmezden gelebilir). Bunun yerine bulunan bağlam, doğrudan dizinin başındaki ana sistem promptuna (`chatHistory[0].content += ragContext;`) metin olarak iliştirilmelidir.

### B. BFF (Backend-for-Frontend) Proxy Kullanımı
- Tarayıcı (istemci) asla doğrudan Ollama API'sine (varsayılan: `http://localhost:11434`) bağlanmamalıdır.
- Ollama servisinin CORS ayarlarını dışa açmamak ve API erişimini güvenli hale getirmek için tüm istekler Next.js Route Handler üzerinden proxy edilmelidir.

### C. Native Ollama API ve Stream Parsing
- AI SDK veya üçüncü parti hazır chatbot kütüphaneleri kullanılmamalıdır. Streaming yapısının ve Abort (iptal) işlemlerinin en temel seviyede nasıl çalıştığını kontrol altında tutmak için native `fetch` API kullanılmalıdır.
- Ollama'dan gelen NDJSON verisi asenkron olarak okunur ve satırlar `\n` baz alınarak ayrılır.
- Ağda ikiye bölünen JSON objelerini (chunk parçalanması) güvenli biçimde birleştirmek için buffer yapısı korunmalı ve test edilmelidir.

### D. Abort (İptal) Mekanizması ve Yayılımı
- Kullanıcı UI üzerinde "Stop" butonuna bastığında istemci tarafındaki `AbortController.abort()` tetiklenmelidir.
- Route Handler içerisine düşen bu iptal sinyali `req.signal` üzerinden Ollama fetch isteğine doğrudan aktarılmalıdır. Böylece modelin gereksiz token üretmesi anında kesilmeli ve iptal durumu veritabanına yansıtılmalıdır.

---

## 3. Test Standartları ve Kalite Güvencesi
Yazılan kodların kalitesini korumak için her geliştirmeden sonra ilgili testlerin yazılması veya mevcut testlerin başarıyla çalıştırılması gerekir:

- **Unit Testler (Vitest)**: Özellikle `stream-parser` iş mantığını doğrulamak için yazılır. Çalıştırma komutu: `pnpm test`
- **E2E Testler (Playwright)**: Chat UI açılışı ve kullanıcı input etkileşimlerini simüle eder. Çalıştırma komutu: `npx playwright test`
- **Hata Yönetimi**: Route Handler'larda özel hata fırlatma, ağ kesintileri ve durum kodlarının yönetimi elle kontrol edilmeli ve test senaryolarına dahil edilmelidir.

---
*Not: Bu dosya, projede çalışan tüm yapay zeka asistanlarının (Cursor, Cline, GitHub Copilot vb.) bağlamında öncelikli olarak değerlendirilmelidir.*
