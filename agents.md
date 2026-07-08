# Agent İşlem Günlüğü

Bu dosya, bu proje üzerinde çalışan agent'ların hızlıca bağlam kazanabilmesi için tutulur. Her değişiklik sonrası proje yapısına uygun şekilde güncellenir.

## Proje Özeti
LocalMind, Next.js App Router tabanlı, yerelde çalışan bir LLM chatbot uygulamasıdır. Uygulama, kullanıcıdan gelen sohbet isteklerini bir Next.js API katmanından geçirerek yerel Ollama servisine iletir. Sohbet geçmişi Drizzle ORM + SQLite üzerinden saklanır.

## Amaç ve mimari yaklaşım
- Backend-for-Frontend (BFF) mimarisi kullanılmaktadır.
- Tarayıcıdan gelen istekler doğrudan Ollama'ya gitmez; önce Next.js route handler üzerinden işler.
- Streaming yanıtlar native fetch ile işlenir; AI SDK kullanılmamaktadır.
- İstek iptal edilirse AbortController sinyali Ollama tarafına kadar iletilir.

## Teknoloji yığını
- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS v4
- Drizzle ORM + SQLite
- Ollama REST API
- Vitest + Playwright
- Zod validation

## Önemli dizinler
- src/app: sayfalar ve API route'ları
  - src/app/api/chat/route.ts: sohbet akışını başlatan API endpoint'i
  - src/app/api/models/route.ts: mevcut modelleri expose eden endpoint
  - src/app/api/health/route.ts: sağlık kontrolü
- src/components: UI bileşenleri
  - src/components/chat/: chat input, mesaj listesi, akış render eden bileşenler
  - src/components/sidebar/: sohbet geçmişi paneli
  - src/components/settings/: ayarlar formu
- src/lib:
  - src/lib/ollama/: Ollama istemcisi, stream parser, hata tipleri
  - src/lib/db/: schema ve veritabanı bağlantısı
  - src/lib/actions/: server-side veri işlemleri
  - src/lib/validation/: request/response doğrulama
- docs/: mimari, kararlar, test ve Ollama dokümantasyonu

## Ana kullanıcı akışı
1. Kullanıcı mesajı gönderir.
2. Frontend, POST /api/chat isteğini başlatır.
3. Route handler, Ollama'ya istek gönderir.
4. Gelen NDJSON parçaları ayrıştırılır ve istemciye stream olarak iletilir.
5. Mesaj ve akış durumu veritabanına kaydedilir.

## Proje özel kurallar
- Streaming işleyişi manuel olarak yapılır; yeni bir yaklaşım eklenirken parser ve chunk mantığı korunmalıdır.
- Abort propagation önemli bir özellik olduğu için iptal akışını bozan değişikliklerden kaçınılmalıdır.
- Veritabanı işlemleri Drizzle üzerinden yapılır; doğrudan SQL yazmak yerine mevcut schema yapısını kullanın.
- İstek/yanıt doğrulama için Zod şemaları kullanılmalıdır.
- Yeni özellik eklenirken hem UI hem API hem de veritabanı katmanını birlikte düşünün.

## Varsayılan yapılandırma
- Ollama base URL: http://localhost:11434
- Varsayılan model: qwen3.5:4b
- Veritabanı: sqlite.db

## Geliştirme komutları
- pnpm install
- pnpm db:push
- pnpm dev
- pnpm lint
- pnpm build
- npx vitest
- npx playwright test

## Agent'lar için kısa notlar
- Bu proje lokal bir çalışma ortamına dayanır; harici servis bağımlılığı olmadan çalışacak şekilde tasarlanmıştır.
- Yeni bir endpoint eklerken route handler, validation ve ilgili UI akışını birlikte güncelleyin.
- Bir değişiklik yaptığınızda özellikle streaming, abort ve veritabanı kayıt akışını test edin.

## Güncellemeler
- 2026-07-08: agents.md dosyası proje yapısına göre yeniden düzenlendi ve agent odaklı bir rehber haline getirildi.
- 2026-07-08: README ve docs incelemeleri doğrultusunda mimari özet ve önemli akışlar eklendi.
- 2026-07-08 14:09: Chatbotun veritabanından ürün bulamaması sorunu analiz edildi ve Tool Calling entegrasyonu ile RAG sorgularındaki case-sensitivity hatalarının giderilmesini kapsayan bir uygulama planı (`implementation_plan.md`) oluşturuldu.
- 2026-07-08 14:13: Plan onaylandı ve uygulandı. `src/app/api/chat/route.ts` dosyasına native Ollama Tool Calling entegrasyonu sağlandı. `src/app/api/widget/chat/route.ts` içerisindeki RAG sorguları `like`'tan case-insensitive `ilike`'a geçirildi. `ollama-types.ts` ve `ollama-client.ts` güncellenerek araç çağırma (tools) parametreleri aktif edildi. Tüm kod derlenerek doğrulandı.
