# LocalMind - Kapsamlı Proje Dokümantasyonu

LocalMind, Ollama üzerinden tamamen lokal çalışan, verileri dışarı göndermeyen ve konuşma geçmişini (SQLite kullanarak) kaydeden modern bir yapay zekâ chatbot uygulamasıdır.

## İçindekiler
1. [Projenin Amacı ve Mimari Özeti](#1-projenin-amacı-ve-mimari-özeti)
2. [Gereksinimler ve Kurulum](#2-gereksinimler-ve-kurulum)
3. [Bileşen Hiyerarşisi](#3-bileşen-hiyerarşisi)
4. [Veri Akışı ve Streaming](#4-veri-akışı-ve-streaming)
5. [Ollama Entegrasyonu](#5-ollama-entegrasyonu)
6. [Mimari Kararlar (ADR)](#6-mimari-kararlar-adr)
7. [Testler](#7-testler)

---

## 1. Projenin Amacı ve Mimari Özeti
Eğitim amaçlı geliştirilen bu projenin temel hedefleri:
- Next.js App Router yapısı ile **Backend-for-Frontend (BFF)** mimarisini kurmak.
- Ollama REST API'sini istemciden gizleyerek sunucu tarafında (Next.js API) proxy yapmak.
- Kırık/bölünmüş NDJSON (streaming) HTTP chunklarını düzgün işleyebilen özel bir stream parser tasarlamak.

**Mimari Diyagram:**
```text
Browser
   │
   ▼
Next.js UI (React)
   │
   ▼
Next.js Route Handler (/api/chat)
   │
   ▼
OllamaClient (lib/ollama/ollama-client.ts)
   │
   ▼
http://localhost:11434/api/chat
```

---

## 2. Gereksinimler ve Kurulum

### Gereksinimler
- Node.js >= 18
- pnpm
- Ollama (Local)

### Ollama Kurulumu & Model İndirme
1. [Ollama](https://ollama.com)'yı sisteminize kurun (macOS/Windows/Linux).
2. Terminalden `ollama serve` komutuyla arka planda çalıştırın (Zaten arka planda çalışıyorsa gerekmez).
3. `ollama pull qwen3.5:4b` komutuyla projede varsayılan olan modeli indirin.

### Environment Variables
`.env` dosyanızı aşağıdaki gibi ayarlayabilirsiniz (varsayılan değerlerdir):
```env
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_DEFAULT_MODEL=qwen3.5:4b
DATABASE_URL=file:./sqlite.db
```

### Komutlar
- **Geliştirme**:
  - `pnpm install` : Bağımlılıkları kurar.
  - `pnpm db:push` : Drizzle ORM ile veritabanını oluşturur/günceller.
  - `pnpm dev` : Geliştirme sunucusunu başlatır.
- **Test**:
  - `pnpm test` : Vitest ile unit testleri çalıştırır.
  - `npx playwright test` : E2E testlerini çalıştırır.

---

## 3. Bileşen Hiyerarşisi

Uygulama standart Next.js App Router mimarisini kullanmaktadır:

- **App Router (`src/app`)**: Sayfalar (Pages) ve Route Handler'ların (API) barındığı katman.
- **Components (`src/components`)**: React bileşenleri.
  - `chat/`: Chat composer, stream renderer ve mesaj komponentleri.
  - `sidebar/`: Geçmiş sohbet geçmişini listeleyen komponent.
  - `settings/`: Uygulama ayarlarını değiştiren UI formu.
  - `ui/`: `shadcn/ui` bileşenleri (Button, Input vb.)
- **Lib (`src/lib`)**: İş mantığı, veritabanı bağlantıları ve yardımcı fonksiyonlar.
  - `db/`: Drizzle ORM şemaları ve bağlantı nesnesi.
  - `ollama/`: Ollama REST API entegrasyonu ve stream parser.
  - `validation/`: Zod şemaları.
  - `actions/`: Sunucu eylemleri (Server actions - DB erişimi için).

---

## 4. Veri Akışı ve Streaming

1. Kullanıcı UI üzerinde (`ChatInput`) mesajını yazar ve gönderir.
2. `POST /api/chat` uç noktasına istek atılır. İptal mekanizması için bir `AbortController` sinyali eklenir.
3. Sunucudaki API, `LlmProvider` (Ollama) ile iletişime geçer ve LLM'den dönen **NDJSON** akışını dinler.
4. Gelen NDJSON parçaları (chunks) birleştirilir, stream parser yardımıyla doğrulanır ve istemciye bir `ReadableStream` olarak aktarılır.
5. Kullanıcı sohbeti durdurmak istediğinde ("Stop" butonu), `Abort` sinyali API'ye iletilir ve Ollama üretimi anında kesilir, ardından durum veritabanına kaydedilir.

---

## 5. Ollama Entegrasyonu

Projede `http://localhost:11434` üzerinde dinleyen lokal Ollama servisine istekler atılır. İstekler `ollamaClient` modülü üzerinden yönetilerek soyutlanmıştır.

Kullanılan başlıca Ollama endpointleri:
- `GET /api/tags`: Mevcut modelleri listeler.
- `POST /api/chat`: Model ile sohbet başlatır, NDJSON formatında stream döner.

---

## 6. Mimari Kararlar (ADR)

> [!NOTE]
> Projenin temel mimarisini belirleyen kritik tasarım kararları aşağıda listelenmiştir.

### Tarayıcı neden Ollama'ya doğrudan bağlanmıyor?
Tarayıcının Ollama API'sine doğrudan bağlanması, CORS ayarlarının dışa açılmasını zorunlu kılar. Next.js üzerinden proxy (Backend-for-Frontend) yapılarak:
- Veritabanı işlemleri gizlenir ve güvenli hale gelir (ör. loglama).
- Dış API'lere (Ollama) giden veriler tamamen sunucu denetiminde kalır.

### Neden "Provider Abstraction" kullanıldı?
Lokal LLM teknolojileri hızla gelişmektedir. `LlmProvider` arayüzü sayesinde Ollama'nın yanı sıra gelecekte LM Studio, OpenAI veya Anthropic servislerine aynı sistem üzerinden bağlanmak mümkündür.

### Native Ollama API'si neden tercih edildi?
AI SDK veya üçüncü parti yapılar sistemi fazla soyutladığı için, eğitim amacı güden bu projede **NDJSON parsing** (stream) ve **Abort propagation** mantığının tam olarak nasıl çalıştığını anlamak adına Native `fetch` tercih edilmiştir.

### Abort Propagation nasıl çalışıyor?
UI tarafında `AbortController.abort()` çalıştırıldığında Next.js Route Handler'daki iptal sinyali `req.signal` ile alınır. Bu sinyal Ollama fetch isteğine doğrudan paslanarak, Ollama'nın ekstra token üretimini durdurması sağlanır.

---

## 7. Testler

Proje kalite standartlarını korumak için iki katmanlı test sistemine sahiptir:

1. **Unit Testler (Vitest)**
   - Ağırlıklı olarak Ollama NDJSON `stream-parser` iş mantığını test eder.
   - Ağ üzerinde yolda bölünen (network split) NDJSON parçalarının doğru parse edilip edilmediği test edilir.
2. **E2E Testler (Playwright)**
   - İstemci (Browser) etkileşimleri simüle edilir. Chat UI ve input tepkileri test edilir.
