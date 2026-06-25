# Ollama Entegrasyonu

Ollama, büyük dil modellerini lokal cihazlarda çalıştırmak için tasarlanmış bir araçtır. 

API Uç Noktaları:
- `GET /api/tags`: Mevcut modelleri listeler.
- `POST /api/chat`: Model ile sohbet başlatır, streaming (NDJSON) olarak yanıt döner.

Varsayılan Olarak `http://localhost:11434` adresinde dinleme yapar. 
Bu projede `ollamaClient` modülü üzerinden tüm istekler soyutlanmış bir sağlayıcı (provider) mimarisi ile yönetilir.
