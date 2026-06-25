# LocalMind

LocalMind, Ollama üzerinden tamamen lokal çalışan, verileri dışarı göndermeyen ve konuşma geçmişini (SQLite kullanarak) kaydeden modern bir yapay zekâ chatbot uygulamasıdır.

## Projenin Amacı
Eğitim amaçlı geliştirilen bu projenin temel hedefi; 
- Next.js App Router yapısı ile Backend-for-Frontend (BFF) mimarisini kurmak.
- Ollama REST API'sini istemciden gizleyerek proxy yapmak.
- Kırık/bölünmüş NDJSON (streaming) HTTP chunklarını düzgün işleyebilen bir stream parser tasarlamak.

## Mimari Diyagram
```text
Browser
   │
   ▼
Next.js UI (React)
   │
   ▼
Next.js Route Handler /api/chat
   │
   ▼
OllamaClient (lib/ollama/ollama-client.ts)
   │
   ▼
http://localhost:11434/api/chat
```

## Gereksinimler
- Node.js >= 18
- pnpm
- Ollama (Local)

## Ollama Kurulumu & Model İndirme
1. Ollama'yı sisteminize kurun (macOS/Windows/Linux).
2. Terminalden `ollama serve` komutuyla arka planda çalıştırın (Zaten çalışıyorsa gerekmez).
3. `ollama pull qwen3.5:4b` komutuyla modeli indirin.

## Environment Variables
`.env` dosyanızı aşağıdaki gibi ayarlayabilirsiniz (varsayılanlar):
```env
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_DEFAULT_MODEL=qwen3.5:4b
DATABASE_URL=file:./sqlite.db
```

## Development Komutları
- `pnpm install` : Bağımlılıkları kurar.
- `pnpm db:push` : Drizzle ile veritabanını oluşturur/günceller.
- `pnpm dev` : Geliştirme sunucusunu başlatır.

## Test Komutları
- `pnpm test` : Vitest ile unit testleri çalıştırır.
- `npx playwright test` : E2E testlerini çalıştırır.

## Bilinen Sınırlamalar
- Mesaj geçmişi çok uzadığında tarayıcı belleğinde kasma yaşanabilir (Virtualization henüz yok).
- Gelişmiş yetkilendirme (Auth) bulunmamaktadır, tamamen lokal (single-tenant) kullanıma yöneliktir.
