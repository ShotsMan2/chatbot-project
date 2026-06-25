# Test Dokümantasyonu

LocalMind projesi kalite standartlarını sağlamak için unit ve E2E testlerine sahiptir.

## Unit Testler (Vitest)
Ağırlıklı olarak Ollama NDJSON `stream-parser` iş mantığını test eder.
- Network split (verinin yolda ikiye bölünmesi) senaryoları simüle edilmiştir.
- Çalıştırmak için: `pnpm test`

## E2E Testler (Playwright)
İstemci ve tarayıcı etkileşimlerini simüle eder.
- Chat UI açılışı ve input testleri bulunmaktadır.
- Çalıştırmak için: `npx playwright test`

## Integration
Next.js Route Handlers için özel hata fırlatma ve status code (503, 404) yönetimleri elle kontrol edilebilir ve ileride test dosyalarına eklenebilir.
