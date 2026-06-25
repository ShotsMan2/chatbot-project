# LocalMind Mimarisi

Uygulama, standart Next.js App Router mimarisini temel alır.

## Bileşen Hiyerarşisi
- **App Router (`src/app`)**: Sayfa (Page) ve Route Handler'ların (API) barındığı katman.
- **Components (`src/components`)**: React bileşenleri.
  - `chat/`: Chat composer, stream renderer ve mesaj komponentleri.
  - `sidebar/`: Geçmiş sohbet geçmişini gösteren komponent.
  - `settings/`: Uygulama ayarlarını değiştiren UI formu.
  - `ui/`: `shadcn/ui` bileşenleri (Button, Input vb.)
- **Lib (`src/lib`)**: İş mantığı, veritabanı ve yardımcı fonksiyonlar.
  - `db/`: Drizzle ORM şemaları ve bağlantı nesnesi.
  - `ollama/`: Ollama REST API sağlayıcısı, stream parser.
  - `validation/`: Zod şemaları.
  - `actions/`: Server actions (Veritabanına güvenli erişim için).

## Veri Akışı
1. Kullanıcı `ChatInput`'a mesaj yazar.
2. `POST /api/chat` ucuna istek atılır (AbortController ile birlikte).
3. API, `LlmProvider` (Ollama) ile iletişime geçer ve dönen NDJSON akışını (stream) dinler.
4. Gelen parçalar (chunks) birleştirilir, Next.js üzerinden istemciye ReadableStream olarak aktarılır.
5. Kullanıcı "Stop" dediğinde Abort sinyali API'ye iletilir ve Ollama üretimi durdurulur. Veritabanına iptal durumu yansıtılır.
