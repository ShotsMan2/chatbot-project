import { db } from "./index";
import { products, coupons, faqs } from "./schema";

async function seed() {
  console.log("Starting seed...");

  const demoProducts = [
    {
      name: "Spor Ayakkabı - Siyah/Beyaz",
      description: "Rahat ve şık tasarım, günlük kullanıma uygun spor ayakkabı. Nefes alabilir kumaş ve dayanıklı taban.",
      price: "899",
      stock: 50,
      imageUrl: "/images/spor-ayakkabi.png",
      category: "Ayakkabı",
    },
    {
      name: "Deri El Çantası - Premium",
      description: "100% doğal deri, el işçiliği ile üretilen premium el çantası. İç bölmeli, fermuarlı tasarım.",
      price: "1249",
      stock: 30,
      imageUrl: "/images/deri-canta.png",
      category: "Çanta",
    },
    {
      name: "Akıllı Saat - GPS Destekli",
      description: "GPS takibi, kalp atış hızı ölçümü, suya dayanıklı akıllı saat. 5 gün pil ömrü.",
      price: "2499",
      stock: 20,
      imageUrl: "/images/akilli-saat.png",
      category: "Elektronik",
    },
    {
      name: "Kablosuz Kulaklık - ANC",
      description: "Aktif gürültü engelleme teknolojisi, 40mm sürücü, 30 saat pil ömrü.Bluetooth 5.3 bağlantısı.",
      price: "1599",
      stock: 40,
      imageUrl: "/images/kulaklik.png",
      category: "Elektronik",
    },
    {
      name: "Telefon Kılıfı - Şeffaf",
      description: "Darbe emici TPU malzeme, şeffaf tasarım. iPhone ve Samsung modelleri için uyumlu.",
      price: "149",
      stock: 100,
      imageUrl: "/images/telefon-kilifi.png",
      category: "Aksesuar",
    },
    {
      name: "Kışlık Mont - Su Geçirmez",
      description: "20000mm su geçirmezlik, termal dolgulu, rüzgar geçirmez kış montu. Her hava koşuluna uygun.",
      price: "1899",
      stock: 25,
      imageUrl: "/images/kislik-mont.png",
      category: "Giyim",
    },
    {
      name: "Güneş Gözlüğü - UV400",
      description: "UV400 koruma, polarize cam, metal çerçeve. Şık ve dayanıklı tasarım.",
      price: "449",
      stock: 60,
      imageUrl: "/images/gunes-gozlugu.png",
      category: "Aksesuar",
    },
    {
      name: "Laptop Sırt Çantası",
      description: "15.6 inç laptop bölmeli, su geçirmez kumaş, ergonomik askı sistemi. Seyahat ve iş için ideal.",
      price: "699",
      stock: 35,
      imageUrl: "/images/laptop-canta.png",
      category: "Çanta",
    },
  ];

  const demoCoupons = [
    { code: "HOŞGELDİN10", discountPercent: 10, isActive: 1 },
    { code: "YAZ2026", discountPercent: 15, isActive: 1 },
    { code: "VIP25", discountPercent: 25, isActive: 1 },
    { code: "FREESHIP", discountPercent: 5, isActive: 1 },
  ];

  const demoFaqs = [
    {
      question: "Siparişim ne zaman kargoya verilir?",
      answer: "Siparişleriniz ödeme onayından sonra 1-2 iş günü içinde kargoya verilir. Resmi tatillerde bu süre uzayabilir.",
      category: "kargo",
    },
    {
      question: "İade ve değişim politikanız nedir?",
      answer: "Satın aldığınız ürünleri 14 gün içinde iade edebilir veya değiştirebilirsiniz. Ürünün kullanılmamış ve orijinal ambalajında olması gerekmektedir.",
      category: "iade",
    },
    {
      question: "Hangi ödeme yöntemlerini kabul ediyorsunuz?",
      answer: "Kredi kartı, banka kartı, havale/EFT ve kapıda ödeme seçeneklerini kullanabilirsiniz. Tüm online ödemeler SSL ile güvence altındadır.",
      category: "ödeme",
    },
    {
      question: "Kargo ücreti ne kadar?",
      answer: "100 TL ve üzeri siparişlerde kargo ücretsizdir. 100 TL altındaki siparişler için kargo ücreti 14.90 TL'dir.",
      category: "kargo",
    },
    {
      question: "Siparişimi nasıl takip edebilirim?",
      answer: "Sipariş takip numaranız e-posta ile gönderilir. Ayrıca hesabınızdan siparişlerim bölümünden durumunu kontrol edebilirsiniz.",
      category: "sipariş",
    },
    {
      question: "Ürünleriniz orijinal mi?",
      answer: "Evet, tüm ürünlerimiz orijinal ve üretici garantilidir. Sahte veya taklit ürün satışı yapılmamaktadır.",
      category: "genel",
    },
  ];

  await db.insert(products).values(demoProducts);
  console.log(`Inserted ${demoProducts.length} products`);

  await db.insert(coupons).values(demoCoupons);
  console.log(`Inserted ${demoCoupons.length} coupons`);

  await db.insert(faqs).values(demoFaqs);
  console.log(`Inserted ${demoFaqs.length} FAQs`);

  console.log("Done seeding!");
}

seed().catch(console.error);
