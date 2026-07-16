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
- 2026-07-09 10:13: Kullanıcının telefon kılıfı sorgusunun ardından veritabanı bağlantısının doğruluğu onaylandı ve açıklandı.
- 2026-07-09 10:30: Kullanıcının widget'ı Hepsiburada web sitesi üzerinde dinamik olarak test edebilmesi için tarayıcı konsolundan script enjekte etme yöntemi açıklandı ve adım adım entegrasyon rehberi sunuldu.
- 2026-07-09 10:37: Tarayıcıdaki CORS/Private Network Access (PNA) ve SafeFrame kaynaklı localhost engelleme sorunları için çözüm yolları (Console context kontrolü, Chrome flag devre dışı bırakma ve ngrok/localtunnel ile HTTPS tüneli) açıklandı.
- 2026-07-09 10:43: Kullanıcıya chatbot'un verileri yerel SQLite veritabanından (sqlite.db -> products tablosu) ve script tag'i ile gönderilen data-context parametresinden aldığı açıklandı.
- 2026-07-09 11:07: Kullanıcının chatbotu kendi web sitesine nasıl entegre edeceği ve kendi veritabanını (PostgreSQL/Drizzle) nasıl bağlayacağına dair mimari yaklaşımlar ve adım adım entegrasyon rehberi açıklandı.
- 2026-07-10 21:48: Kullanıcının chatbot entegrasyonu sonrası hangi projede ve hangi durumlarda "npm run dev" çalıştırması gerektiği sorusu açıklandı.
- 2026-07-10 21:55: Chatbot'u e-ticaret sitelerine bir SaaS modeli olarak satmak isteyen kullanıcıya Yöntem A'nın (SaaS / Standalone API) avantajları ve bu modeli ölçeklendirmek için izlemesi gereken mimari adımlar açıklandı.
- 2026-07-10 22:22: Kullanıcının kendi modelini eğitmek yerine hazır LLM'leri (OpenAI, Gemini vb.) bağlayıp e-ticarete özel (RAG + Tool Calling) ayarlama mimarisinin mantığına dair stratejik ve mimari analiz sunuldu.
- 2026-07-16 20:59: Orkestratör Yapay Zeka (Orchestrator AI) rolü ve ajan havuzunun (Pi, Devin AI, OpenCode/Copilot, Cursor) yönetim protokolü başarıyla benimsendi. Yeni talepler bekleniyor.
- 2026-07-16 21:06: Otonom State-Machine orkestrasyon algoritması (Niyet analizi, Görev Dağıtımı, Test Döngüsü), BFF mimarisi ve gizlilik/güvenlik ilkeleri tam olarak sisteme entegre edildi.
- 2026-07-16 21:08: E-ticaret chatbotunu zirveye taşımak için "En İyi Chatbot" vizyonu doğrultusunda kapsamlı bir uygulama planı (implementation_plan.md) oluşturuldu. Sepet, sipariş, kupon yönetimini kapsayan yeni DB şemaları ve Tool Calling entegrasyonları için onay bekleniyor.
- 2026-07-16 21:16: Entegrasyon tamamlandı: Drizzle'a (carts, orders, coupons) eklendi, route.ts'ye sepet/kupon Tool Call yetenekleri tanımlandı, mesaj UI yapısı 'json-product/cart/coupon' blokları okuyarak Zengin Kartlar çıkaracak şekilde refaktör edildi. Pi personasi system prompt'a aktarıldı ve pnpm build ile proje sorunsuz doğrulandı.
- 2026-07-16 22:05: Orkestratör yapay zeka (Ultra Orchestrator AI) rol, mimari kurallar (BFF, Drizzle, Zod, NDJSON, Abort Propagation) ve 5 aşamalı Self-Healing protokolü teyit edilerek sisteme tamamen entegre edildi. Yeni e-ticaret veya teknik talepler bekleniyor.
- 2026-07-16 22:09: Kullanıcının "En iyi e-ticaret chatbotunu yap" talebi üzerine; SSS (RAG), Sipariş Takibi (Timeline), Akıllı Checkout ve Premium UI (Carousel, Glassmorphism) özelliklerini içeren kapsamlı bir uygulama planı (`implementation_plan.md`) oluşturuldu ve kullanıcı onayına sunuldu.
- 2026-07-16 22:12: Onaylanan plan başarıyla uygulandı: schema.ts dosyasına faqs ve order ilişkileri eklendi, route.ts dosyasına search_faq, track_order ve checkout_cart araçları bağlandı. Arayüz ui-cards.tsx üzerinde Glassmorphism ve Carousel yapılarına geçirilerek premium hale getirildi. Typescript build testi başarılı.
- 2026-07-16 22:25: E-ticaret AI (Devin AI rolü) için yeni MASTER PROMPT analiz edildi. DB şemalarının güncellenmesini, Tool Calling iyileştirmelerini, NDJSON stream parser optimizasyonunu ve yeni UI (shadcn) özelliklerini kapsayan uygulama planı (`implementation_plan.md`) onay için sunuldu.
- 2026-07-16 22:42: Onaylanan MASTER PROMPT planı başarıyla uygulandı: `schema.ts` güncellendi ve `pnpm db:push` ile PostgreSQL'e yansıtıldı. `route.ts` üzerinden arama sonuçları zenginleştirildi, `stream-parser.ts` üzerinde JSON NDJSON intercepting altyapısı kuruldu ve UI'da Sepete Ekle Server Action'ı içeren etkileşimli ürün kartları kodlandı. Başarılı derleme (`pnpm build`) ve Vitest testi doğrulandı.
- 2026-07-16 23:06: Kullanıcıdan gelen E-Ticaret Orkestrasyonu "MASTER PROMPT" talebi incelendi. İstenen veritabanı şema genişletmeleri (products, carts, orders), LLM Tool Calling (`add_to_cart`, `search_products` vs.), NDJSON stream parser ve UI bileşen entegrasyonlarının (shadcn ürün kartları) projede halihazırda mevcut olduğu ve başarıyla çalıştığı teyit edildi. Ek bir mimari değişikliğe gerek duyulmadı.
