export default function DemoPage() {
  return (
    <>
        <style
          dangerouslySetInnerHTML={{
            __html: `
              * { box-sizing: border-box; margin: 0; padding: 0; }
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f5f5f5; color: #333; }

              /* ─── Navbar ─── */
              .demo-nav {
                background: #FF6000;
                padding: 12px 24px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                color: white;
                position: sticky;
                top: 0;
                z-index: 100;
              }
              .demo-nav-logo { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
              .demo-nav-search {
                flex: 1;
                max-width: 500px;
                margin: 0 24px;
                padding: 10px 16px;
                border-radius: 8px;
                border: none;
                font-size: 14px;
                outline: none;
              }
              .demo-nav-links { display: flex; gap: 20px; font-size: 14px; }
              .demo-nav-links a { color: white; text-decoration: none; font-weight: 500; }

              /* ─── Hero ─── */
              .demo-hero {
                background: linear-gradient(135deg, #FF6000, #FF8C00);
                color: white;
                padding: 48px 24px;
                text-align: center;
              }
              .demo-hero h1 { font-size: 28px; margin-bottom: 8px; }
              .demo-hero p { font-size: 16px; opacity: 0.9; }

              /* ─── Products ─── */
              .demo-section { max-width: 1200px; margin: 0 auto; padding: 32px 24px; }
              .demo-section h2 { font-size: 20px; margin-bottom: 20px; font-weight: 700; }
              .demo-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
                gap: 16px;
              }
              .demo-card {
                background: white;
                border-radius: 12px;
                overflow: hidden;
                border: 1px solid #e8e8e8;
                transition: box-shadow 0.2s, transform 0.2s;
                cursor: pointer;
              }
              .demo-card:hover {
                box-shadow: 0 4px 20px rgba(0,0,0,0.1);
                transform: translateY(-2px);
              }
              .demo-card-img {
                height: 200px;
                background: #f0f0f0;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 48px;
              }
              .demo-card-body { padding: 14px; }
              .demo-card-title { font-size: 13px; color: #333; line-height: 1.4; margin-bottom: 8px; }
              .demo-card-price { font-size: 18px; font-weight: 700; color: #FF6000; }
              .demo-card-old { font-size: 13px; color: #999; text-decoration: line-through; margin-left: 6px; }
              .demo-card-rating { font-size: 12px; color: #999; margin-top: 4px; }

              /* ─── Integration Section ─── */
              .demo-integration {
                background: #1a1a2e;
                color: white;
                padding: 48px 24px;
                margin-top: 48px;
              }
              .demo-integration h2 { text-align: center; font-size: 24px; margin-bottom: 8px; }
              .demo-integration p { text-align: center; color: #aaa; margin-bottom: 32px; }
              .demo-code {
                background: #0d0d1a;
                border-radius: 12px;
                padding: 24px;
                max-width: 700px;
                margin: 0 auto;
                font-family: "Fira Code", monospace;
                font-size: 14px;
                line-height: 1.8;
                overflow-x: auto;
                border: 1px solid #333;
              }
              .demo-code .tag { color: #e06c75; }
              .demo-code .attr { color: #d19a66; }
              .demo-code .str { color: #98c379; }
              .demo-code .comment { color: #5c6370; font-style: italic; }

              /* ─── Footer ─── */
              .demo-footer {
                text-align: center;
                padding: 24px;
                color: #999;
                font-size: 13px;
                border-top: 1px solid #e8e8e8;
              }
            `,
          }}
        />
        {/* Navbar */}
        <nav className="demo-nav">
          <div className="demo-nav-logo">DemoShop</div>
          <input
            className="demo-nav-search"
            placeholder="Ürün, kategori veya marka ara..."
          />
          <div className="demo-nav-links">
            <a href="#">Hesabım</a>
            <a href="#">Favoriler</a>
            <a href="#">Sepetim</a>
          </div>
        </nav>

        {/* Hero */}
        <div className="demo-hero">
          <h1>Süper Fırsatlar Başladı! 🎉</h1>
          <p>En sevdiğiniz ürünlerde %50&apos;ye varan indirimler</p>
        </div>

        {/* Products */}
        <div className="demo-section">
          <h2>Çok Satanlar</h2>
          <div className="demo-grid">
            {[
              { emoji: "👟", name: "Spor Ayakkabı - Siyah/Beyaz", price: "899", old: "1.299", rating: "4.8 (2.3K)" },
              { emoji: "👜", name: "Deri El Çantası - Premium", price: "1.249", old: "1.899", rating: "4.7 (856)" },
              { emoji: "⌚", name: "Akıllı Saat - GPS Destekli", price: "2.499", old: "3.299", rating: "4.9 (5.1K)" },
              { emoji: "🎧", name: "Kablosuz Kulaklık - ANC", price: "1.599", old: "2.199", rating: "4.6 (1.2K)" },
              { emoji: "📱", name: "Telefon Kılıfı - Şeffaf", price: "149", old: "249", rating: "4.5 (3.4K)" },
              { emoji: "🧥", name: "Kışlık Mont - Su Geçirmez", price: "1.899", old: "2.799", rating: "4.8 (945)" },
              { emoji: "👓", name: "Güneş Gözlüğü - UV400", price: "449", old: "699", rating: "4.4 (678)" },
              { emoji: "🎒", name: "Laptop Sırt Çantası", price: "699", old: "999", rating: "4.7 (2.1K)" },
            ].map((product, i) => (
              <div key={i} className="demo-card">
                <div className="demo-card-img">{product.emoji}</div>
                <div className="demo-card-body">
                  <div className="demo-card-title">{product.name}</div>
                  <div>
                    <span className="demo-card-price">{product.price} TL</span>
                    <span className="demo-card-old">{product.old} TL</span>
                  </div>
                  <div className="demo-card-rating">⭐ {product.rating}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Integration Code */}
        <div className="demo-integration">
          <h2>💻 Kendi Sitenize Ekleyin</h2>
          <p>Tek bir script etiketi ile AI asistanı sitenize entegre edin</p>
          <div className="demo-code">
            <span className="comment">
              {"<!-- Bu kodu </body> etiketinden hemen önce ekleyin -->"}
            </span>
            <br />
            <span className="tag">&lt;script</span>
            <br />
            {"  "}
            <span className="attr">src</span>=
            <span className="str">&quot;http://localhost:3000/embed.js&quot;</span>
            <br />
            {"  "}
            <span className="attr">data-color</span>=
            <span className="str">&quot;#FF6000&quot;</span>
            <br />
            {"  "}
            <span className="attr">data-title</span>=
            <span className="str">&quot;Müşteri Desteği&quot;</span>
            <br />
            {"  "}
            <span className="attr">data-welcome</span>=
            <span className="str">
              &quot;Merhaba! Ürünlerimiz hakkında bilgi almak ister misiniz?&quot;
            </span>
            <br />
            <span className="tag">&gt;&lt;/script&gt;</span>
          </div>
        </div>

        {/* Footer */}
        <div className="demo-footer">
          Bu bir demo sayfasıdır. Sağ alttaki sohbet butonuna tıklayarak AI
          asistanı deneyebilirsiniz.
        </div>

        {/* The actual widget embed */}
        <script
          src="/embed.js?v=9"
          data-color="#1e293b"
          data-title="Sitemizin Efesi"
          data-model="qwen2.5-coder:latest"
          data-welcome="Değerli Müşterimiz, DemoShop'a hoş geldiniz. Size nasıl yardımcı olabilirim?"
          data-context="DemoShop E-Ticaret Sitesi. 
          
**Sistem Bilgisi:**
- Kullanıcı herhangi bir ürün aradığında (ayakkabı, çanta vb.) sistem sana otomatik olarak ilgili ürünleri veritabanından çekip listeleyecektir.
- Eğer henüz ürün bilgisi gelmediyse, kullanıcıya aradığı ürünü detaylandırmasını söyle (Örn: 'Kırmızı bir mont mu arıyorsunuz?').

**Kampanyalar ve Kurallar:**
- 500 TL üzeri alışverişlerde kargo bedava. Altında 39 TL.
- Koşulsuz şartsız 15 gün iade hakkı mevcuttur.
- Kapıda ödeme seçeneğimiz mevcuttur (ek 20 TL hizmet bedeli ile).

**İletişim ve Mesai Saatleri:**
- Çalışma Saatleri: Hafta içi 09:00 - 18:00
- Destek E-postası: destek@demoshop.com
- Çağrı Merkezi: 0850 123 45 67 (Sipariş iptali veya iade kodu gibi konularda yönlendiriniz)"
          data-position="right"
          defer
        />
    </>
  );
}
