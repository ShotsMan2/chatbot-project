async function test() {
  const message = 'akıllı saat ne kadar';
  const model = 'qwen2.5-coder:latest';
  const ollamaRes = await fetch('http://localhost:11434/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'Sen bir e-ticaret arama niyet okuma asistanısın. Kullanıcının mesajından aradığı ürünü veya kategoriyi çıkarıp JSON olarak dön. Sadece en belirgin 1 veya 2 kelimelik ürün/kategori adını yalın halde yaz. Örnek: {\"product\": \"akıllı saat\"}. Eğer ürün aramıyorsa {\"product\": null} dön. Çıktıda başka hiçbir metin olmasın.' },
        { role: 'user', content: message }
      ],
      stream: false,
      format: 'json'
    })
  });
  
  const intentData = await ollamaRes.json();
  console.log('Ollama raw intentData:', intentData.message?.content);
  
  let intentKeyword = 'null';
  try {
    const parsed = JSON.parse(intentData.message?.content?.trim() || '{}');
    intentKeyword = parsed.product ? String(parsed.product).toLowerCase() : 'null';
  } catch(e) {
    intentKeyword = intentData.message?.content?.trim().toLowerCase() || 'null';
  }
  
  console.log('Parsed intentKeyword:', intentKeyword);
}

test().catch(console.error);
