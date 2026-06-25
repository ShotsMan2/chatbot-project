# Architectural Decisions

### Neden browser doğrudan Ollama’ya bağlanmıyor?
Tarayıcının doğrudan Ollama API'sine bağlanması, Ollama servisinin CORS ayarlarının dışa açılmasını zorunlu kılar. Ayrıca istemci tarafında API'ye giden payload ve dönen yanıtların tüm denetimi zayıflar. Next.js üzerinden proxy (Backend-for-Frontend) yaparak veritabanı işlemlerini (ör. sohbetin kaydedilmesi) gizlice yapabiliriz ve Ollama API erişimini güvenli hale getirebiliriz.

### Neden provider abstraction kullanıldı?
Lokal LLM dünyası hızla değişmektedir. `LlmProvider` interface'i ve `OllamaProvider` implementasyonu sayesinde gelecekte LM Studio, OpenAI, Anthropic gibi farklı servisleri koda en az dokunuşla ekleyebiliriz.

### Neden native Ollama API kullanıldı?
AI SDK veya üçüncü parti hazır chatbot paketleri sistemi fazla soyutlar. Eğitim amaçlı olan bu projede streaming yapısının (NDJSON parsing) ve Abort (iptal) işlemlerinin en temel seviyede nasıl çalıştığını anlamak için native fetch API kullanılmıştır.

### Streaming nasıl çalışıyor?
Next.js Route Handler üzerinden bir `ReadableStream` veya `TransformStream` dönülmektedir. Ollama'dan gelen NDJSON verisi asenkron olarak okunur, satırlar `\n` baz alınarak ayrılır. Ağda ikiye bölünen JSON objeleri (chunk parçalanması) buffer kullanılarak güvenli biçimde birleştirilir (Bkz: `stream-parser.ts`).

### Abort propagation nasıl çalışıyor?
Kullanıcı UI üzerinde "Stop" butonuna bastığında tarayıcı tarafındaki `AbortController.abort()` tetiklenir. Bu, Next.js sunucusundaki isteği (request) sonlandırır. Route Handler içerisine düşen bu iptal sinyali `req.signal` üzerinden Ollama fetch isteğine doğrudan aktarılır. Bu sayede modelin gereksiz token üretmesi anında kesilir.

### Lokal geliştirme ile production deployment arasındaki fark nedir?
Lokalde çalışırken Ollama `http://localhost:11434` adresinde bulunur. Ancak production'da Next.js sunucusu Docker içerisinde veya Vercel'de olabilir. Vercel gibi uzak bir sunucuda çalışırsa, Ollama'ya erişmesi için Ollama'nın genel ağa (public) açık bir tünele veya API servisine bağlanması gerekir. LocalMind tamamen lokal bir masaüstü alternatifi olarak tasarlandığı için her iki servisin aynı ağda (localhost) olması beklenir.
