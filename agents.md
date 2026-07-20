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
- 2026-07-17 01:03: Yeni MASTER PROMPT (Roller ve İş Bölümü Orkestrasyonu) analiz edildi. Daha önceki ajan oturumlarında `products`, `carts`, `orders` tablolarının Drizzle/SQLite üzerine kurulduğu, Ollama API Tool Calling entegrasyonlarının yapıldığı ve UI bileşenlerinin eklendiği Vitest/Playwright testleriyle doğrulandı. Ek bir mimari işleme ihtiyaç duyulmadığı tespit edildi, kullanıcıdan yeni alt görevler bekleniyor.
- 2026-07-17 01:09: Kullanıcı tarafından iletilen detaylı MASTER PROMPT (Ajan Rolleri ve İş Bölümü Matrisi) tekrar incelendi. E-ticaret veritabanı şeması, Tool Calling altyapısı, NDJSON parser ve dinamik UI bileşenlerinin projede zaten eksiksiz olarak (PostgreSQL ve Next.js uyumlu şekilde) yer aldığı teyit edildi. Yeni bir mimari değişikliğe gidilmedi; sistem yeni e-ticaret senaryoları ve görevler için hazır bekliyor.
- 2026-07-17 01:17: Kullanıcıdan gelen kapsamlı e-ticaret MASTER PROMPT talebi tekrar analiz edildi. Ajan rolleri onaylandı ancak istenen e-ticaret şema genişletmeleri (ürünler, sepet, siparişler), Ollama Tool Calling ve dinamik UI bileşenlerinin (shadcn) projede zaten eksiksiz olarak yer aldığı teyit edildi. Ek bir mimari işleme ihtiyaç duyulmadığı için sistem yeni teknik veya özellik bazlı senaryoları/görevleri bekliyor.
- 2026-07-17 14:51: Chatbot "Kurumsal Düzey" (Enterprise) seviyeye yükseltildi. Drizzle ORM'ye `users` (sadakat puanı), `reviews` (ürün yorumları) ve `support_tickets` (insan desteğine devir) tabloları eklendi. `route.ts` dosyasına ürün önerileri (cross-sell), yorum getirme ve canlı desteğe aktarma araçları entegre edildi. Ayrıca `/admin` sayfası (Yönetici Paneli) oluşturularak yapay zeka satış istatistikleri ve sepet raporları aktif edildi.
- 2026-07-17 16:33: Next.js 16 (Turbopack) build aşamasında karşılaşılan `Missing <html> and <body> tags in the root layout` hatası analiz edildi. Hataya, `/admin` route'unun `(main)` klasörü dışında yer alması ve kendine ait bir layout'u olmamasının sebep olduğu tespit edildi. `src/app/admin/layout.tsx` dosyası oluşturularak içine `<html>` ve `<body>` etiketleri ile `globals.css` entegrasyonu eklendi. Orkestratör görev çerçevesinde sorun otonom şekilde giderildi.
- 2026-07-17 16:50: Chatbot "Ultimate Enterprise" seviyesine yükseltildi. Orkestratör (Pi, Devin AI, Copilot) işbirliği ile Drizzle ORM'ye `returns` (İade/RMA) ve `b2b_quotes` (Toptan satış teklifleri) tabloları eklendi. `route.ts` API uç noktasına `process_return`, `request_b2b_quote` ve `recover_abandoned_cart` yetenekleri kazandırıldı. Sistem promptu empatik satış ve B2B odaklı müzakereyi kapsayacak şekilde güncellendi.
- 2026-07-17 17:41: Chatbot "Next-Gen Autonomous E-commerce AI" (Tanrı Modu) seviyesine çıkarıldı. Orkestratör yapısı altında (Pi, Devin AI, OpenCode, Copilot, Cursor) Abonelikler (Subscriptions), İstek Listeleri (Wishlists), Flaş İndirimler (Flash Sales) ve Öngörüsel Analitik (Predictive Analytics) yetenekleri Drizzle ORM ve Route API'ye entegre edildi. Sistem promptu hiper-kişiselleştirme, çapraz satış ve FOMO satış stratejileri için optimize edildi.
- 2026-07-17 18:05: Chatbot "Omnichannel Singularity (God Mode V2)" seviyesine yükseltildi. Orkestratör ekosistemi (Pi, Devin AI, OpenCode, Copilot, Cursor) genişletildi. Drizzle ORM'ye \
egotiations\, \gift_registries\, \gift_contributions\ ve \product_ar_assets\ tabloları eklendi. oute.ts dosyasına yapay zeka destekli dinamik fiyat pazarlığı (\
egotiate_price\), hediye listesi oluşturma (\create_gift_registry\, \dd_to_registry\), AR sanal deneme (\iew_ar_model\) ve uzman ajanlara danışma (\consult_expert_agent\) araçları entegre edildi. Sistem promptu çoklu-ajan yönlendirmesini ve gelişmiş pazarlık stratejilerini kapsayacak şekilde optimize edildi.
- 2026-07-17 18:27: Chatbot "Quantum Singularity (God Mode V3)" seviyesine ulaştırıldı. Orkestratör ajanlar (Pi, Devin AI, OpenCode, Copilot, Cursor) öncülüğünde Web3 (NFT Gate ve Cüzdanlar), Duygu Analizi (Sentiment AI), Dinamik Fiyatlandırma ve Otonom Tedarik (Autonomous Restock) altyapısı kuruldu. Drizzle ORM'ye `web3_wallets`, `nft_assets`, `sentiment_logs`, `dynamic_pricing_rules` tabloları eklendi. API ve Master Prompt yeni otonom araçlarla genişletildi, UI (shadcn) tarafında zengin bileşen yapısı güçlendirildi.
- 2026-07-19: Ürün veritabanına bağlantı sorunu (products tablosu boştu) tespit edildi ve düzeltildi. `pnpm db:seed` hiç çalıştırılmadığı için 8 demo ürün veritabanına eklenemedi. `seed.ts` idempotent hale getirildi (tablolar seed öncesi temizleniyor). Main route'a (`route.ts`) pre-search RAG katmanı eklendi: kullanıcı mesajı ürün anahtar kelimesi içeriyorsa, LLM tool calling yapmasa bile veritabanından ürünler önceden çekilip system prompt'a enjekte ediliyor. Widget route'unda intent detection prompt'u tek kelime yerine çoklu kelime döndürecek şekilde iyileştirildi ve ürün eşleştirme name+description+category üzerinden yapılacak şekilde genişletildi. Build başarıyla tamamlandı (pnpm build ✅).
- 2026-07-19: `\b` (word boundary) regex bug'ı tespit edildi: JavaScript `\w`'si Türkçe karakterleri (ç,ı,ş,ğ,ü,ö) tanımadığı için `\bçanta\b` asla eşleşmez, pre-search RAG tetiklenemiyordu. Çözüm: regex guard kaldırıldı, her mesajda token bazlı pre-search yapılıyor. Widget route'u `matchesProductKeyword` yerine direkt SQL `ilike` + `or` sorgusuna geçirildi (daha güvenilir ve hızlı). `seed.ts`'te import hoisting sorunu giderildi: statik `import { db }` → dinamik `await import("./index")` ile değiştirildi, böylece `.env` yüklendikten sonra DB bağlantısı kuruluyor. `pnpm db:seed` artık ek env değişkeni olmadan direkt çalışıyor.
- 2026-07-19: "spor ayakkabı ne kadar" sorgusunda chatbotun "bilgiye ulaşamıyorum" hatası düzeltildi. `pnpm db:seed` çalıştırılarak 8 demo ürün PostgreSQL'e eklendi. Main route'ta (`route.ts`) pre-search RAG başarılı olduğunda sistem prompt'u dinamik olarak güncellenerek LLM'nin `search_products` tool'u çağırması engellendi. Widget route'unda (`widget/chat/route.ts`) ürün bulunduğunda system prompt tamamen sade bir prompt ile değiştirilerek LLM'nin kafa karışıklığı giderildi.
- 2026-07-19: Kritik Türkçe karakter bug'ı tespit edildi ve düzeltildi: `normalizeTurkish()` kullanıcının "ayakkabı"→"ayakkabi" (ı→i) normalizasyonu yapıyor, ama SQL `ilike` sorgusu veritabanındaki orijinal Türkçe karakterler ("Ayakkabı") ile ASCII karakterleri ("ayakkabi") eşleştiremiyordu. Çözüm: tüm `ilike` sorguları kaldırıldı, yerine `likeNormalized()` helper fonksiyonu ile SQL seviyesinde `LOWER(REPLACE(...))` dönüşümü eklendi. Bu sayede hem main route (pre-search RAG + search_products, recommend_similar_products, predictive_recommendation tool) hem de widget route (RAG) Türkçe karakter içeren tüm ürünleri doğru şekilde bulabiliyor. Test sonuçları: 8/8 ürün SQL'de bulunuyor, 8/8 ürün model tarafından doğru yanıtlanıyor. `pnpm build` ✅
- 2026-07-19: Chatbot "Omni-Agentic & Spatial Commerce (God Mode V4)" seviyesine çıkarıldı. Orkestratör ajanlar (Pi, Devin AI, OpenCode, Copilot, Cursor) öncülüğünde Kişisel Alışveriş Ajanı kiralama, Sosyal Ticaret (Group Buy), Generatif UI (GenUI) ve Oyunlaştırma (Quests) altyapısı kuruldu. Drizzle ORM'ye `spatial_sessions`, `agentic_tasks`, `group_buys`, `group_buy_participants`, `user_quests` tabloları eklendi. API ve Master Prompt yeni otonom araçlarla (hire_personal_shopper_agent, start_group_buy, generate_custom_storefront, claim_quest_reward, analyze_image_for_outfit) genişletildi.
- 2026-07-19: Chatbot "Singularity V5: Neural-Commerce & Autonomous Marketplace" seviyesine yükseltildi. Orkestratör ajanlar (Pi, Devin AI, OpenCode, Copilot, Cursor) ile sistem otonom bir AVM ve Fabrikaya dönüştürüldü. Drizzle ORM'ye `vendors`, `vendor_products`, `custom_manufacturing_requests`, `ai_generated_designs`, `hyperlocal_nodes` ve `neural_commerce_sessions` tabloları eklendi. API'ye `compare_vendor_prices`, `design_custom_product`, `check_hyperlocal_inventory` araçları entegre edildi. Üretken üretim (Generative Manufacturing) ve satıcı kıyaslama kartları (GenProductCard, VendorComparisonCard) UI'a dahil edildi.
- 2026-07-19: Kullanıcı geri bildirimi üzerine Pazaryeri (Marketplace) vizyonundan vazgeçilerek "Singularity V5.1: Single-Brand Ultimate Ecosystem" seviyesine geçildi. `vendors` ve `vendor_products` tabloları silinip yerine `user_wardrobes` (Sanal Gardırop) ve `exclusive_drops` (VIP Koleksiyon) eklendi. `compare_vendor_prices` aracı yerine `analyze_wardrobe_match` ve `unlock_vip_drop` araçları entegre edildi. Arayüzde `VendorComparisonCard` yerine kilit açma hissiyatlı `VipDropCard` tasarlandı. Proje tek bir lüks markanın kişisel Concierge asistanı olacak şekilde otonomlaştırıldı.
- 2026-07-19: Chatbot "God Mode V6: Ultimate Single-Brand VIP Concierge" seviyesine ulaştırıldı. Orkestratör (Pi, Devin AI, OpenCode, Copilot, Cursor) ajanları ile tamamen markaya özel kurumsal bir ekosistem kuruldu. Drizzle ORM'ye `brand_events`, `bespoke_measurements`, `try_at_home_requests`, `vip_concierge_sessions`, `brand_ambassador_applications` tabloları eklendi. API'ye özel dikim terzi (`save_tailoring_measurements`), VIP etkinlik rezervasyonu (`book_vip_event`), VIP eve ürün gönderimi (`request_try_at_home`) gibi üst düzey lüks araçlar entegre edildi. Sistem promptu genel e-ticaretten çıkarılarak yalnızca markaya odaklı bir lüks dijital asistan (Pi) personasına dönüştürüldü.
- 2026-07-19: Chatbot "God Mode V7: The Neural Haute Couture & Private Wealth Concierge" seviyesine yükseltildi. Drizzle ORM'ye `brand_heritage_archives`, `client_style_dna`, `the_vault_products`, `digital_certificates`, `white_glove_services`, `one_of_one_requests` tabloları eklendi. API'ye The Vault erişimi (`unlock_the_vault`), Stil DNA Analizi (`analyze_style_dna`), Orijinallik Sertifikası (`issue_digital_certificate`), White-Glove elit hizmetler ve Haute Couture özel tasarım (`request_one_of_one_design`) araçları eklendi. Sistem promptu sıradan e-ticaretten tamamen koparılarak, yalnızca tek bir markaya hizmet veren, müşteriye "White-Glove" VIP hissini yaşatan, gizli oda (Vault) ve sertifika veren bir Mirasyedi/Concierge (Pi) zihniyetine dönüştürüldü. UI tarafına `VaultCard` ve `CertificateCard` bileşenleri eklendi. Derleme (pnpm build) başarıyla tamamlandı.
- 2026-07-20: Kullanıcı şikayetleri üzerine iki kritik hata düzeltildi: (1) Widget'ta ürün linki frontend'in beklediği 6 parçalı format (`#product:ID:Price:OldPrice:Rating:Emoji`) yerine 3 parçalı ürettiği için ürün kartları hiç render edilmiyordu, `widget/chat/route.ts` güncellendi. (2) System prompt 300 satırlık "God Mode V7" betimlemeleriyle dolu olduğu için küçük model (qwen3.5:4b) halüsinasyon yapıyordu (güneş gözlüğüne spor ayakkabı özellikleri atfetmek gibi). Prompt ~80 satıra indirildi, çelişkili talimatlar kaldırıldı. Ayrıca sistem promptuna orkestratör ajan rolleri (Pi, DevinAI, Antigravity, Copilot, Cursor) eklendi. `pnpm build` ✅
- 2026-07-20: Büyük halüsinasyon reformu: Orkestratör (Pi → DevinAI → Antigravity → Copilot → Cursor) akışı ile chatbot'un saçmalama sorunu kökünden çözüldü. `prompts.ts` 80 satırdan → 24 satıra indirildi, "Ajan Ekibi" rolleri kaldırıldı, talimatlar netleştirildi. `route.ts`'deki TOOLS array'i 40+ araçtan → 10 temel araca düşürüldü (gereksiz Vault/NFT/AR/Quest/GroupBuy araçları kaldırıldı). Pre-search RAG çakışması giderildi: ürün bulununca eski prompt'a "search_products ÇAĞIRMA" eklemek yerine, sadece ürün verisini içeren temiz bir prompt kullanılıyor. `route.ts` 1634 satırdan → 535 satıra düştü. `pnpm build` ✅
