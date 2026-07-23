import { readFileSync } from "fs";
import { resolve } from "path";

try {
  const envPath = resolve(process.cwd(), ".env");
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        let value = trimmed.slice(eqIdx + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
        if (!process.env[key]) process.env[key] = value;
      }
    }
  }
} catch {}

async function seedTestData() {
  const { db } = await import("./index");
  const s = await import("./schema");
  const { sql } = await import("drizzle-orm");

  console.log("=== E-Ticaret Test Verileri Ekleniyor ===\n");

  // Mevcut ürün ID'lerini al (serial ID'ler her seed'de değişiyor)
  const existingProducts = await db.select({ id: s.products.id, name: s.products.name }).from(s.products);
  console.log(`📦 ${existingProducts.length} ürün bulundu, ID'ler dinamik kullanılacak`);

  // Ürün isminden ID bulma helper
  const pId = (keyword: string) => {
    const found = existingProducts.find(p => p.name.toLowerCase().includes(keyword.toLowerCase()));
    if (!found) throw new Error(`Ürün bulunamadı: ${keyword}`);
    return found.id;
  };

  // ===================== KULLANICILAR =====================
  const demoUsers = [
    { id: "usr_001", name: "Ayşe Yılmaz", loyaltyPoints: 2500, preferredLanguage: "tr" },
    { id: "usr_002", name: "Mehmet Demir", loyaltyPoints: 850, preferredLanguage: "tr" },
    { id: "usr_003", name: "Zeynep Kaya", loyaltyPoints: 5200, preferredLanguage: "tr" },
    { id: "usr_004", name: "Ali Öztürk", loyaltyPoints: 120, preferredLanguage: "tr" },
    { id: "usr_005", name: "Elif Şahin", loyaltyPoints: 3100, preferredLanguage: "tr" },
  ];
  await db.insert(s.users).values(demoUsers).onConflictDoNothing({ target: s.users.id });
  console.log(`✅ ${demoUsers.length} kullanıcı eklendi`);

  // ===================== SİPARİŞLER =====================
  const demoOrders = [
    { id: "ord_001", userId: "usr_001", cartId: null, totalAmount: "899", status: "delivered" as const, trackingCode: "TRK-2026-001", couponCode: null, createdAt: sql`CURRENT_TIMESTAMP - interval '10 days'` },
    { id: "ord_002", userId: "usr_001", cartId: null, totalAmount: "2499", status: "preparing" as const, trackingCode: "TRK-2026-002", couponCode: "HOŞGELDİN10", createdAt: sql`CURRENT_TIMESTAMP - interval '1 day'` },
    { id: "ord_003", userId: "usr_002", cartId: null, totalAmount: "1599", status: "shipped" as const, trackingCode: "TRK-2026-003", couponCode: null, createdAt: sql`CURRENT_TIMESTAMP - interval '3 days'` },
    { id: "ord_004", userId: "usr_003", cartId: null, totalAmount: "1899", status: "cancelled" as const, trackingCode: null, couponCode: null, createdAt: sql`CURRENT_TIMESTAMP - interval '7 days'` },
    { id: "ord_005", userId: "usr_005", cartId: null, totalAmount: "1249", status: "delivered" as const, trackingCode: "TRK-2026-005", couponCode: "VIP25", createdAt: sql`CURRENT_TIMESTAMP - interval '15 days'` },
  ];
  await db.insert(s.orders).values(demoOrders).onConflictDoNothing({ target: s.orders.id });
  console.log(`✅ ${demoOrders.length} sipariş eklendi`);

  // ===================== SEPETLER =====================
  const demoCarts = [
    { id: "cart_001", userId: "usr_001", status: "active" as const, createdAt: sql`CURRENT_TIMESTAMP - interval '2 hours'` },
    { id: "cart_002", userId: "usr_002", status: "abandoned" as const, createdAt: sql`CURRENT_TIMESTAMP - interval '5 days'` },
    { id: "cart_003", userId: "usr_004", status: "active" as const, createdAt: sql`CURRENT_TIMESTAMP - interval '30 minutes'` },
  ];
  await db.insert(s.carts).values(demoCarts).onConflictDoNothing({ target: s.carts.id });
  console.log(`✅ ${demoCarts.length} sepet eklendi`);

  // ===================== SEPET ÜRÜNLERİ =====================
  const demoCartItems = [
    { cartId: "cart_001", productId: pId("akıllı saat"), quantity: 1 },
    { cartId: "cart_001", productId: pId("telefon kılıfı"), quantity: 2 },
    { cartId: "cart_002", productId: pId("spor ayakkabı"), quantity: 1 },
    { cartId: "cart_002", productId: pId("kablosuz kulaklık"), quantity: 1 },
    { cartId: "cart_003", productId: pId("güneş gözlüğü"), quantity: 1 },
  ];
  await db.insert(s.cartItems).values(demoCartItems);
  console.log(`✅ ${demoCartItems.length} sepet ürünü eklendi`);

  // ===================== ÜRÜN YORUMLARI =====================
  const demoReviews = [
    { productId: pId("spor ayakkabı"), userId: "usr_001", rating: 5, comment: "Harika bir ayakkabı! Çok rahat ve şık. Kesinlikle tavsiye ederim." },
    { productId: pId("spor ayakkabı"), userId: "usr_003", rating: 4, comment: "Güzel ürün ama biraz dar kalıplı." },
    { productId: pId("deri el çantası"), userId: "usr_005", rating: 5, comment: "Deri kalitesi mükemmel, gerçekten premium hissettiriyor." },
    { productId: pId("akıllı saat"), userId: "usr_002", rating: 4, comment: "GPS özelliği çok başarılı, pil ömrü iyi." },
    { productId: pId("kablosuz kulaklık"), userId: "usr_001", rating: 5, comment: "Gürültü engelleme inanılmaz! Uçakta kullanmak için ideal." },
    { productId: pId("telefon kılıfı"), userId: "usr_004", rating: 3, comment: "Fiyatına göre idare eder, çabuk sararıyor." },
    { productId: pId("kışlık mont"), userId: "usr_005", rating: 5, comment: "Kışın vazgeçilmezi oldu. Su geçirmezlik harika." },
    { productId: pId("güneş gözlüğü"), userId: "usr_002", rating: 4, comment: "Şık ve korumalı, UV400 gerçekten işe yarıyor." },
    { productId: pId("laptop sırt çantası"), userId: "usr_003", rating: 5, comment: "Laptop bölmesi çok kullanışlı, işe giderken ideal." },
    { productId: pId("akıllı saat"), userId: "usr_004", rating: 2, comment: "Ekran çok küçük, beklentimi karşılamadı." },
  ];
  await db.insert(s.reviews).values(demoReviews);
  console.log(`✅ ${demoReviews.length} yorum eklendi`);

  // ===================== FLAŞ İNDİRİMLER =====================
  const demoFlashSales = [
    { productId: pId("spor ayakkabı"), discountPercent: 30, startTime: sql`CURRENT_TIMESTAMP - interval '1 day'`, endTime: sql`CURRENT_TIMESTAMP + interval '2 days'`, isActive: 1 },
    { productId: pId("telefon kılıfı"), discountPercent: 20, startTime: sql`CURRENT_TIMESTAMP - interval '3 hours'`, endTime: sql`CURRENT_TIMESTAMP + interval '5 hours'`, isActive: 1 },
    { productId: pId("güneş gözlüğü"), discountPercent: 15, startTime: sql`CURRENT_TIMESTAMP - interval '2 days'`, endTime: sql`CURRENT_TIMESTAMP - interval '1 day'`, isActive: 0 },
  ];
  await db.insert(s.flashSales).values(demoFlashSales);
  console.log(`✅ ${demoFlashSales.length} flaş indirim eklendi`);

  // =================AMA DİLEK LİSTELERİ =====================
  const demoWishlists = [
    { id: "wl_001", userId: "usr_001", name: "Doğum Günü Hediyelerim" },
    { id: "wl_002", userId: "usr_003", name: "Alınacaklar" },
    { id: "wl_003", userId: "usr_005", name: "Yeni Sezon" },
  ];
  await db.insert(s.wishlists).values(demoWishlists).onConflictDoNothing({ target: s.wishlists.id });
  console.log(`✅ ${demoWishlists.length} dilek listesi eklendi`);

  // ===================== DİLEK LİSTESİ ÜRÜNLERİ =====================
  const demoWishlistItems = [
    { wishlistId: "wl_001", productId: pId("deri el çantası") },
    { wishlistId: "wl_001", productId: pId("kışlık mont") },
    { wishlistId: "wl_002", productId: pId("akıllı saat") },
    { wishlistId: "wl_002", productId: pId("laptop sırt çantası") },
    { wishlistId: "wl_003", productId: pId("kablosuz kulaklık") },
    { wishlistId: "wl_003", productId: pId("güneş gözlüğü") },
    { wishlistId: "wl_003", productId: pId("spor ayakkabı") },
  ];
  await db.insert(s.wishlistItems).values(demoWishlistItems);
  console.log(`✅ ${demoWishlistItems.length} dilek listesi ürünü eklendi`);

  // ===================== ABONELİKLER =====================
  const demoSubscriptions = [
    { id: "sub_001", userId: "usr_001", productId: pId("telefon kılıfı"), frequency: "monthly" as const, status: "active" as const, nextDeliveryDate: sql`CURRENT_TIMESTAMP + interval '20 days'` },
    { id: "sub_002", userId: "usr_005", productId: pId("güneş gözlüğü"), frequency: "quarterly" as const, status: "active" as const, nextDeliveryDate: sql`CURRENT_TIMESTAMP + interval '60 days'` },
  ];
  await db.insert(s.subscriptions).values(demoSubscriptions).onConflictDoNothing({ target: s.subscriptions.id });
  console.log(`✅ ${demoSubscriptions.length} abonelik eklendi`);

  // ===================== EXCLUSIVE DROPS (VIP KOLEKSİYON) =====================
  const demoExclusiveDrops = [
    { productId: pId("deri el çantası"), dropName: "Sınırlı Sayı: Vintage Deri Koleksiyonu", requiredLoyaltyPoints: 2000, isUnlocked: 0, availableUntil: sql`CURRENT_TIMESTAMP + interval '30 days'` },
    { productId: pId("kışlık mont"), dropName: "Kış Özel: Designer Mont Kapsülü", requiredLoyaltyPoints: 3000, isUnlocked: 0, availableUntil: sql`CURRENT_TIMESTAMP + interval '15 days'` },
    { productId: pId("akıllı saat"), dropName: "Teknoloji Öncüsü Paketi", requiredLoyaltyPoints: 1500, isUnlocked: 0, availableUntil: sql`CURRENT_TIMESTAMP + interval '45 days'` },
  ];
  await db.insert(s.exclusiveDrops).values(demoExclusiveDrops);
  console.log(`✅ ${demoExclusiveDrops.length} VIP koleksiyon (exclusive drop) eklendi`);

  // ===================== THE VAULT (GİZLİ ÜRÜNLER) =====================
  const demoVaultProducts = [
    { productId: pId("deri el çantası"), requiredLoyaltyPoints: 5000, isArchived: 0, unlockPasscode: "VAULT2024" },
    { productId: pId("kışlık mont"), requiredLoyaltyPoints: 8000, isArchived: 0, unlockPasscode: "ELITE2024" },
  ];
  await db.insert(s.theVaultProducts).values(demoVaultProducts);
  console.log(`✅ ${demoVaultProducts.length} Vault ürünü eklendi`);

  // ===================== DESTEK TALEPLERİ =====================
  const demoSupTickets = [
    { id: "tkt_001", userId: "usr_002", conversationId: null, issue: "Siparişim 3 gündür kargoya verilmedi, lütfen yardım edin.", status: "open" as const },
    { id: "tkt_002", userId: "usr_004", conversationId: null, issue: "Ürün hasarlı geldi, değişim istiyorum.", status: "in_progress" as const },
  ];
  await db.insert(s.supportTickets).values(demoSupTickets).onConflictDoNothing({ target: s.supportTickets.id });
  console.log(`✅ ${demoSupTickets.length} destek talebi eklendi`);

  // ===================== İADE TALEPLERİ =====================
  const demoReturns = [
    { id: "ret_001", userId: "usr_004", orderId: "ord_004", reason: "Ürün bedenime uymadı, daha küçük beden istiyorum.", status: "pending" as const },
    { id: "ret_002", userId: "usr_003", orderId: "ord_004", reason: "Renk fotoğraftakinden farklı çıktı.", status: "approved" as const },
  ];
  await db.insert(s.returns).values(demoReturns).onConflictDoNothing({ target: s.returns.id });
  console.log(`✅ ${demoReturns.length} iade talebi eklendi`);

  // ===================== B2B TEKLİFLER =====================
  const demoB2b = [
    { id: "b2b_001", userId: "usr_003", productId: pId("telefon kılıfı"), requestedQuantity: 500, targetPrice: "100", status: "pending" as const },
    { id: "b2b_002", userId: "usr_005", productId: pId("laptop sırt çantası"), requestedQuantity: 200, targetPrice: "500", status: "approved" as const },
  ];
  await db.insert(s.b2bQuotes).values(demoB2b).onConflictDoNothing({ target: s.b2bQuotes.id });
  console.log(`✅ ${demoB2b.length} B2B teklifi eklendi`);

  // ===================== PAZARLIKLAR =====================
  const demoNegotiations = [
    { userId: "usr_001", productId: pId("deri el çantası"), originalPrice: "1249", proposedPrice: "1000", status: "pending" as const },
    { userId: "usr_005", productId: pId("kışlık mont"), originalPrice: "1899", proposedPrice: "1500", status: "accepted" as const },
  ];
  await db.insert(s.negotiations).values(demoNegotiations);
  console.log(`✅ ${demoNegotiations.length} pazarlık eklendi`);

  // ===================== MARKA ETKİNLİKLERİ =====================
  const demoBrandEvents = [
    { eventName: "Yeni Sezon Defilesi - VIP Özel Gösterim", eventDate: sql`CURRENT_TIMESTAMP + interval '14 days'`, location: "İstanbul, Zorlu Center", requiredLoyaltyPoints: 1000, isVirtual: 0 },
    { eventName: "Online Stil Danışmanlığı Günü", eventDate: sql`CURRENT_TIMESTAMP + interval '7 days'`, location: "Zoom", requiredLoyaltyPoints: 500, isVirtual: 1 },
    { eventName: "Exclusive Kış Koleksiyonu Lansmanı", eventDate: sql`CURRENT_TIMESTAMP + interval '21 days'`, location: "İstanbul, Nişantaşı", requiredLoyaltyPoints: 2000, isVirtual: 0 },
  ];
  await db.insert(s.brandEvents).values(demoBrandEvents);
  console.log(`✅ ${demoBrandEvents.length} marka etkinliği eklendi`);

  // ===================== WHITE-GLOVE HİZMETLERİ =====================
  const demoWhiteGlove = [
    { userId: "usr_001", serviceType: "airport_delivery" as const, scheduledDate: sql`CURRENT_TIMESTAMP + interval '5 days'`, locationDetails: "İstanbul Havalimanı, Dış Hatlar Terminali", status: "confirmed" as const },
    { userId: "usr_005", serviceType: "style_consultation" as const, scheduledDate: sql`CURRENT_TIMESTAMP + interval '10 days'`, locationDetails: "Nişantaşı Mağazası", status: "requested" as const },
  ];
  await db.insert(s.whiteGloveServices).values(demoWhiteGlove);
  console.log(`✅ ${demoWhiteGlove.length} White-Glove hizmeti eklendi`);

  // ===================== TERZİ ÖLÇÜLERİ =====================
  const demoBespoke = [
    { userId: "usr_001", shoulderWidth: 45, chest: 95, waist: 80, inseam: 82, fitPreference: "tailored" as const },
    { userId: "usr_003", shoulderWidth: 40, chest: 88, waist: 70, inseam: 78, fitPreference: "slim" as const },
  ];
  await db.insert(s.bespokeMeasurements).values(demoBespoke);
  console.log(`✅ ${demoBespoke.length} terzi ölçüsü eklendi`);

  // ===================== MARKA MİRAS ARŞİVİ =====================
  const demoHeritage = [
    { title: "Kuruluş Hikayesi: 1985", era: "1985-1990", storyContent: "Markamız, İstanbul'un kalbinde küçük bir atölyede kuruldu. İlk koleksiyonumuz sadece 12 parçadan oluşuyordu.", artifactImageUrl: "/heritage/founding.jpg" },
    { title: "Milano Moda Haftası İlk Çıkış", era: "2005", storyContent: "2005 yılında Milano Moda Haftası'na katılan ilk Türk markası olarak tarihe geçtik.", artifactImageUrl: "/heritage/milano.jpg" },
    { title: "Sürdürülebilirlik Dönüm Noktası", era: "2020", storyContent: "2020'de %100 geri dönüştürülebilir malzemelerden üretim yapmaya başladık.", artifactImageUrl: "/heritage/eco.jpg" },
  ];
  await db.insert(s.brandHeritageArchives).values(demoHeritage);
  console.log(`✅ ${demoHeritage.length} marka miras kaydı eklendi`);

  // ===================== ONE-OF-ONE TASARIM TALEPLERİ =====================
  const demoOneOfOne = [
    { id: "ooo_001", userId: "usr_001", designBrief: "Özel nişan törenim için el işlemeli, incili beyaz bir akşam elbisesi tasarlanmasını rica ediyorum.", inspirationUrls: "https://pinterest.com/example1", status: "design_phase" as const, estimatedPrice: "15000" },
    { id: "ooo_002", userId: "usr_005", designBrief: "Kırmızı halı etkinliği için özel dikim smokin, siyah kadife kumaş tercihim.", inspirationUrls: null, status: "brief_submitted" as const, estimatedPrice: null },
  ];
  await db.insert(s.oneOfOneRequests).values(demoOneOfOne).onConflictDoNothing({ target: s.oneOfOneRequests.id });
  console.log(`✅ ${demoOneOfOne.length} özel tasarım talebi eklendi`);

  // ===================== GARDIROP =====================
  const demoWardrobes = [
    { userId: "usr_001", productId: pId("spor ayakkabı"), wearFrequency: 12 },
    { userId: "usr_001", productId: pId("kışlık mont"), wearFrequency: 8 },
    { userId: "usr_001", productId: pId("güneş gözlüğü"), wearFrequency: 5 },
    { userId: "usr_003", productId: pId("deri el çantası"), wearFrequency: 15 },
    { userId: "usr_003", productId: pId("laptop sırt çantası"), wearFrequency: 20 },
    { userId: "usr_005", productId: pId("kablosuz kulaklık"), wearFrequency: 25 },
    { userId: "usr_005", productId: pId("güneş gözlüğü"), wearFrequency: 3 },
  ];
  await db.insert(s.userWardrobes).values(demoWardrobes);
  console.log(`✅ ${demoWardrobes.length} gardırop ürünü eklendi`);

  // ===================== QUEST (OYUNLAŞTIRMA) =====================
  const demoQuests = [
    { userId: "usr_001", questType: "daily_login" as const, status: "completed" as const, rewardPoints: 50, completedAt: sql`CURRENT_TIMESTAMP - interval '1 day'` },
    { userId: "usr_001", questType: "review_product" as const, status: "claimed" as const, rewardPoints: 100, completedAt: sql`CURRENT_TIMESTAMP - interval '3 days'` },
    { userId: "usr_001", questType: "find_easter_egg" as const, status: "active" as const, rewardPoints: 200, completedAt: null },
    { userId: "usr_002", questType: "daily_login" as const, status: "active" as const, rewardPoints: 50, completedAt: null },
    { userId: "usr_005", questType: "invite_friend" as const, status: "completed" as const, rewardPoints: 150, completedAt: sql`CURRENT_TIMESTAMP - interval '2 days'` },
  ];
  await db.insert(s.userQuests).values(demoQuests);
  console.log(`✅ ${demoQuests.length} quest eklendi`);

  // ===================== GROUP BUY (TOPLULUK ALIŞVERİŞİ) =====================
  const demoGroupBuys = [
    { id: "gb_001", productId: pId("akıllı saat"), initiatorUserId: "usr_001", requiredParticipants: 5, currentParticipants: 3, discountPercent: 20, status: "active" as const, expiresAt: sql`CURRENT_TIMESTAMP + interval '7 days'` },
    { id: "gb_002", productId: pId("kablosuz kulaklık"), initiatorUserId: "usr_005", requiredParticipants: 10, currentParticipants: 10, discountPercent: 25, status: "completed" as const, expiresAt: sql`CURRENT_TIMESTAMP + interval '1 day'` },
  ];
  await db.insert(s.groupBuys).values(demoGroupBuys).onConflictDoNothing({ target: s.groupBuys.id });
  console.log(`✅ ${demoGroupBuys.length} grup alışverişi eklendi`);

  // ===================== GROUP BUY KATILIMCILARI =====================
  const demoGbParticipants = [
    { groupBuyId: "gb_001", userId: "usr_001" },
    { groupBuyId: "gb_001", userId: "usr_003" },
    { groupBuyId: "gb_001", userId: "usr_005" },
    { groupBuyId: "gb_002", userId: "usr_005" },
    { groupBuyId: "gb_002", userId: "usr_001" },
    { groupBuyId: "gb_002", userId: "usr_002" },
    { groupBuyId: "gb_002", userId: "usr_003" },
    { groupBuyId: "gb_002", userId: "usr_004" },
  ];
  // minimum 10 participants for gb_002
  const extraParticipants = [];
  for (let i = 6; i <= 12; i++) {
    extraParticipants.push({ groupBuyId: "gb_002", userId: `ext_usr_${i}` });
  }
  await db.insert(s.groupBuyParticipants).values([...demoGbParticipants, ...extraParticipants]);
  console.log(`✅ ${demoGbParticipants.length + extraParticipants.length} grup alışverişi katılımcısı eklendi`);

  // ===================== STİL DNA =====================
  const demoStyleDna = [
    { userId: "usr_001", colorPalette: "monochrome", preferredMaterials: "pamuk, ipek, kaşmir", lifestyleProfile: "şehirli profesyonel, sık seyahat eden", climateZone: "ılıman", skinTone: "açık" },
    { userId: "usr_003", colorPalette: "pastel", preferredMaterials: "pamuk, keten", lifestyleProfile: "öğrenci, günlük kullanım", climateZone: "sıcak", skinTone: "buğday" },
    { userId: "usr_005", colorPalette: "bold", preferredMaterials: "deri, kadife, yün", lifestyleProfile: "iş insanı, gece hayatı aktif", climateZone: "soğuk", skinTone: "orta" },
  ];
  await db.insert(s.clientStyleDna).values(demoStyleDna).onConflictDoNothing({ target: s.clientStyleDna.id });
  console.log(`✅ ${demoStyleDna.length} stil DNA kaydı eklendi`);

  // ===================== DİJİTAL SERTİFİKALAR =====================
  const demoCertificates = [
    { id: "cert_001", userId: "usr_001", productId: pId("deri el çantası"), orderId: "ord_001", authenticityHash: "0x7a3f5b8e1c2d4f6a9e0b8c7d5e3f1a2b" },
    { id: "cert_002", userId: "usr_005", productId: pId("deri el çantası"), orderId: "ord_005", authenticityHash: "0x9d2e4f6a1b3c5e7f8a0b9c2d4e6f8a0b" },
  ];
  await db.insert(s.digitalCertificates).values(demoCertificates).onConflictDoNothing({ target: s.digitalCertificates.id });
  console.log(`✅ ${demoCertificates.length} dijital sertifika eklendi`);

  // ===================== BRAND AMBASSADOR =====================
  const demoAmbassadors = [
    { userId: "usr_003", socialMediaHandle: "@zeynepkaya_style", portfolioUrl: "https://instagram.com/zeynepkaya_style", status: "approved" as const },
    { userId: "usr_005", socialMediaHandle: "@elifshn_official", portfolioUrl: null, status: "under_review" as const },
  ];
  await db.insert(s.brandAmbassadorApplications).values(demoAmbassadors);
  console.log(`✅ ${demoAmbassadors.length} marka elçisi başvurusu eklendi`);

  // ===================== VIP CONCIERGE SESSIONS =====================
  const demoConcierge = [
    { userId: "usr_001", agentType: "devin_luxury" as const, sessionNotes: "Müşteri nişan elbisesi için özel tasarım istiyor, İtalyan kumaş tercih ediyor.", status: "active" as const },
    { userId: "usr_005", agentType: "human_stylist" as const, sessionNotes: "Kırmızı halı etkinliği için smokin danışmanlığı.", status: "active" as const },
  ];
  await db.insert(s.vipConciergeSessions).values(demoConcierge);
  console.log(`✅ ${demoConcierge.length} VIP Concierge oturumu eklendi`);

  // ===================== ANALİTİK OLAYLARI =====================
  const demoAnalytics = [
    { userId: "usr_001", eventType: "view_product" as const, productId: pId("deri el çantası") },
    { userId: "usr_001", eventType: "add_to_cart" as const, productId: pId("deri el çantası") },
    { userId: "usr_001", eventType: "view_product" as const, productId: pId("akıllı saat") },
    { userId: "usr_002", eventType: "search" as const, productId: null, metadata: "spor ayakkabı" },
    { userId: "usr_003", eventType: "checkout" as const, productId: null },
    { userId: "usr_005", eventType: "view_product" as const, productId: pId("kışlık mont") },
  ];
  await db.insert(s.analyticsEvents).values(demoAnalytics);
  console.log(`✅ ${demoAnalytics.length} analitik olayı eklendi`);

  // ===================== ÖZEL ÜRETİM TALEPLERİ =====================
  const demoManufacturing = [
    { id: "mfg_001", userId: "usr_001", productType: "Akşam Elbisesi", prompt: "İnci işlemeli, uzun kollu, balıkçı yaka, ipek şifon kumaş", status: "designing" as const, price: "12000", estimatedDelivery: sql`CURRENT_TIMESTAMP + interval '45 days'` },
  ];
  await db.insert(s.customManufacturingRequests).values(demoManufacturing).onConflictDoNothing({ target: s.customManufacturingRequests.id });
  console.log(`✅ ${demoManufacturing.length} özel üretim talebi eklendi`);

  console.log("\n=== TÜM TEST VERİLERİ BAŞARIYLA EKLENDİ! ===");
}

seedTestData().catch(console.error);
