"use client";

import React, { useState } from "react";
import { ShoppingBag, ShoppingCart, Tag, Package, CheckCircle2, Truck, CreditCard, Plus, Star, Headphones, AlertCircle } from "lucide-react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { addToCartAction } from "@/lib/actions/cart";

export function ProductCard({ data }: { data: any }) {
  const params = useParams();
  const [isAdding, setIsAdding] = useState(false);
  const convId = params?.id as string;

  const handleAddToCart = async () => {
    if (!convId || !data.id) return;
    setIsAdding(true);
    try {
      await addToCartAction(data.id, 1, convId);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="group relative flex flex-col gap-3 p-4 my-2 border border-white/20 dark:border-white/10 rounded-2xl bg-white/70 dark:bg-black/40 backdrop-blur-md shadow-xl transition-all hover:scale-[1.02] max-w-sm overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
      <div className="flex items-center gap-4 z-10">
        <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-tr from-primary/20 to-primary/5 text-2xl shadow-inner overflow-hidden">
          {data.imageUrl ? (
            <img src={data.imageUrl} alt={data.name} className="object-cover w-full h-full" />
          ) : (
            data.emoji || <ShoppingBag className="h-7 w-7 text-primary" />
          )}
        </div>
        <div className="flex-1">
          <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">{data.category || 'Ürün'}</div>
          <h4 className="font-bold text-base line-clamp-1">{data.name}</h4>
          <div className="flex items-center gap-2 text-sm mt-1">
            <span className="font-extrabold text-primary">{data.price}</span>
            {data.stock < 5 && <span className="text-xs text-red-500 font-medium">Son {data.stock} ürün</span>}
          </div>
        </div>
      </div>
      {data.description && (
        <p className="text-sm text-muted-foreground line-clamp-2 z-10 mt-1">
          {data.description}
        </p>
      )}
      <Button 
        size="sm" 
        className="w-full mt-2 font-bold z-10" 
        onClick={handleAddToCart}
        disabled={isAdding || data.stock === 0 || !convId}
      >
        {isAdding ? "Ekleniyor..." : data.stock === 0 ? "Stokta Yok" : (
          <>
            <Plus className="h-4 w-4 mr-2" />
            Sepete Ekle
          </>
        )}
      </Button>
    </div>
  );
}

export function ProductCarousel({ data }: { data: any[] }) {
  if (!Array.isArray(data) || data.length === 0) return null;
  if (data.length === 1) return <ProductCard data={data[0]} />;

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 pt-2 -mx-2 px-2 snap-x scrollbar-hide my-2">
      {data.map((item, idx) => (
        <div key={idx} className="snap-center min-w-[280px]">
          <ProductCard data={item} />
        </div>
      ))}
    </div>
  );
}

export function CartCard({ data }: { data: any }) {
  const items = data.items || [];
  const total = items.reduce((acc: number, item: any) => {
    const priceStr = String(item.price).replace(/[^0-9.]/g, '');
    return acc + (parseFloat(priceStr) * item.quantity);
  }, 0);

  return (
    <div className="relative p-5 my-3 border border-white/20 dark:border-white/10 rounded-2xl bg-white/60 dark:bg-black/50 backdrop-blur-xl shadow-2xl max-w-md overflow-hidden transition-all">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-10 -mt-10" />
      
      <div className="flex items-center gap-3 font-bold mb-4 border-b border-border/50 pb-3 z-10 relative">
        <div className="p-2 bg-primary/10 rounded-full text-primary">
          <ShoppingCart className="h-5 w-5" />
        </div>
        <span className="text-lg">Sepet Özeti</span>
      </div>
      
      <div className="flex flex-col gap-3 z-10 relative">
        {items.map((item: any, idx: number) => (
          <div key={idx} className="flex justify-between items-center text-sm bg-background/50 p-2 rounded-lg">
            <span className="font-medium">{item.quantity}x {item.name}</span>
            <span className="font-bold text-primary">{item.price}</span>
          </div>
        ))}
        {items.length === 0 && (
          <div className="text-center py-6 text-muted-foreground bg-background/30 rounded-xl">
            Sepetiniz şu an boş.
          </div>
        )}
      </div>
      
      {items.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border/50 z-10 relative">
          <div className="flex justify-between font-black text-lg mb-4">
            <span>Toplam:</span>
            <span>{total.toLocaleString('tr-TR')} TL</span>
          </div>
          <button className="w-full py-3 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-primary-foreground rounded-xl font-bold flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg shadow-primary/25">
            <CreditCard className="h-5 w-5" />
            Siparişi Tamamla
          </button>
        </div>
      )}
    </div>
  );
}

export function CouponCard({ data }: { data: any }) {
  return (
    <div className="relative flex items-center gap-4 p-4 my-2 border border-green-500/30 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-950/40 dark:to-green-900/20 rounded-2xl text-green-800 dark:text-green-300 max-w-sm shadow-lg overflow-hidden transition-all hover:scale-[1.02]">
      <div className="absolute -right-4 -top-4 opacity-10">
        <Tag className="h-24 w-24" />
      </div>
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/20 text-green-600 dark:text-green-400 z-10">
        <Tag className="h-5 w-5" />
      </div>
      <div className="z-10">
        <div className="font-bold text-base">Kupon Uygulandı!</div>
        <div className="text-sm font-medium opacity-90">%{data.discountPercent} indirim kazandınız 🎉</div>
      </div>
    </div>
  );
}

export function OrderTimelineCard({ data }: { data: any }) {
  const isDelivered = data.status === "delivered";
  const isShipped = data.status === "shipped" || isDelivered;
  
  return (
    <div className="relative p-5 my-3 border border-white/20 dark:border-white/10 rounded-2xl bg-white/80 dark:bg-black/60 backdrop-blur-xl shadow-xl max-w-md">
      <div className="flex justify-between items-center border-b border-border/50 pb-3 mb-4">
        <div className="font-bold flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          Sipariş #{data.id?.split('-')[1] || data.id}
        </div>
        <div className="text-sm font-bold text-primary bg-primary/10 px-2 py-1 rounded-md">
          {data.totalAmount}
        </div>
      </div>
      
      <div className="relative pl-6 space-y-6 before:absolute before:inset-y-2 before:left-[11px] before:w-[2px] before:bg-border">
        <div className="relative">
          <div className={`absolute -left-[30px] p-1 rounded-full bg-background border-2 ${true ? 'border-primary text-primary' : 'border-muted text-muted'}`}>
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <p className="font-bold text-sm">Sipariş Alındı</p>
          <p className="text-xs text-muted-foreground mt-0.5">{new Date(data.createdAt || Date.now()).toLocaleDateString('tr-TR')}</p>
        </div>
        
        <div className="relative">
          <div className={`absolute -left-[30px] p-1 rounded-full bg-background border-2 ${isShipped ? 'border-primary text-primary' : 'border-muted text-muted'}`}>
            <Truck className="h-4 w-4" />
          </div>
          <p className={`font-bold text-sm ${isShipped ? '' : 'text-muted-foreground'}`}>Kargoya Verildi</p>
          <p className="text-xs text-muted-foreground mt-0.5">{isShipped ? 'Yolda' : 'Bekleniyor'}</p>
        </div>
        
        <div className="relative">
          <div className={`absolute -left-[30px] p-1 rounded-full bg-background border-2 ${isDelivered ? 'border-primary text-primary' : 'border-muted text-muted'}`}>
            <Package className="h-4 w-4" />
          </div>
          <p className={`font-bold text-sm ${isDelivered ? '' : 'text-muted-foreground'}`}>Teslim Edildi</p>
        </div>
      </div>
    </div>
  );
}

export function ReviewCard({ data }: { data: any }) {
  const reviews = data.reviews || [];
  if (reviews.length === 0) return null;

  return (
    <div className="relative p-4 my-2 border border-yellow-500/20 rounded-2xl bg-gradient-to-br from-yellow-50 to-white dark:from-yellow-950/20 dark:to-black/40 backdrop-blur-md shadow-lg max-w-sm">
      <div className="flex items-center gap-2 mb-3 border-b border-yellow-500/10 pb-2">
        <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
        <span className="font-bold text-sm">Müşteri Yorumları</span>
      </div>
      <div className="flex flex-col gap-3">
        {reviews.map((rev: any, idx: number) => (
          <div key={idx} className="bg-white/50 dark:bg-black/30 p-3 rounded-xl shadow-sm text-sm">
            <div className="flex items-center gap-1 mb-1 text-yellow-500">
              {Array.from({ length: rev.rating || 5 }).map((_, i) => (
                <Star key={i} className="h-3 w-3 fill-current" />
              ))}
            </div>
            <p className="text-muted-foreground italic line-clamp-3">"{rev.comment}"</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SupportTicketCard({ data }: { data: any }) {
  return (
    <div className="relative p-5 my-3 border border-blue-500/30 rounded-2xl bg-gradient-to-r from-blue-50 to-blue-100/50 dark:from-blue-950/40 dark:to-blue-900/10 backdrop-blur-xl shadow-lg max-w-sm overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <Headphones className="h-16 w-16 text-blue-500" />
      </div>
      <div className="flex items-center gap-3 mb-2 z-10 relative">
        <div className="p-2 bg-blue-500/20 rounded-full text-blue-600 dark:text-blue-400">
          <Headphones className="h-5 w-5" />
        </div>
        <span className="font-bold text-blue-900 dark:text-blue-100 text-lg">Destek Talebi</span>
      </div>
      <div className="z-10 relative space-y-1">
        <p className="text-sm font-medium text-blue-800/80 dark:text-blue-200/80">Bilet No: <span className="font-bold">{data.ticketId}</span></p>
        <p className="text-xs text-blue-700/70 dark:text-blue-300/70">{data.message}</p>
        <div className="mt-3 flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 w-fit px-3 py-1.5 rounded-lg">
          <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse" />
          Müşteri temsilcisi bağlanıyor...
        </div>
      </div>
    </div>
  );
}

export function NegotiationCard({ data }: { data: any }) {
  return (
    <div className="relative p-5 my-3 border border-green-500/30 rounded-2xl bg-gradient-to-r from-green-50 to-green-100/50 dark:from-green-950/40 dark:to-green-900/10 backdrop-blur-xl shadow-lg max-w-sm">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-green-500/20 rounded-full text-green-600 dark:text-green-400">
          <Tag className="h-5 w-5" />
        </div>
        <span className="font-bold text-green-900 dark:text-green-100 text-lg">Özel Teklif</span>
      </div>
      <div className="space-y-1">
        <p className="text-sm line-through text-muted-foreground">{data.originalPrice}</p>
        <p className="text-xl font-black text-green-600 dark:text-green-400">{data.acceptedPrice}</p>
        {data.couponCode && (
          <div className="mt-2 text-xs font-mono bg-background p-2 rounded border border-green-500/20 text-center">
            Kupon: <b>{data.couponCode}</b>
          </div>
        )}
      </div>
    </div>
  );
}

export function RegistryCard({ data }: { data: any }) {
  return (
    <div className="relative p-5 my-3 border border-pink-500/30 rounded-2xl bg-gradient-to-r from-pink-50 to-pink-100/50 dark:from-pink-950/40 dark:to-pink-900/10 backdrop-blur-xl shadow-lg max-w-sm text-center">
      <div className="mx-auto w-fit p-3 bg-pink-500/20 rounded-full text-pink-600 dark:text-pink-400 mb-3">
        <CheckCircle2 className="h-6 w-6" />
      </div>
      <h3 className="font-bold text-pink-900 dark:text-pink-100 text-lg">{data.eventName}</h3>
      <p className="text-sm text-pink-700/70 dark:text-pink-300/70 mb-3">Hediye Listeniz Oluşturuldu</p>
      {data.link && (
        <a href={data.link} target="_blank" rel="noreferrer" className="inline-block bg-pink-500 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md hover:scale-105 transition-transform">
          Listeye Git
        </a>
      )}
    </div>
  );
}

export function ArCard({ data }: { data: any }) {
  return (
    <div className="relative p-5 my-3 border border-purple-500/30 rounded-2xl bg-gradient-to-r from-purple-50 to-purple-100/50 dark:from-purple-950/40 dark:to-purple-900/10 backdrop-blur-xl shadow-lg max-w-sm text-center">
      <div className="mx-auto w-fit p-3 bg-purple-500/20 rounded-full text-purple-600 dark:text-purple-400 mb-3">
        <Package className="h-6 w-6" />
      </div>
      <h3 className="font-bold text-purple-900 dark:text-purple-100 text-lg">Sanal Deneme (AR)</h3>
      <p className="text-sm text-purple-700/70 dark:text-purple-300/70 mb-3">Bu ürünü evinizde veya üzerinizde görün.</p>
      {data.modelUrl && (
        <a href={data.modelUrl} target="_blank" rel="noreferrer" className="inline-block bg-purple-500 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md hover:scale-105 transition-transform">
          {data.buttonText || "Hemen Dene 👓"}
        </a>
      )}
    </div>
  );
}

export function GenProductCard({ data }: { data: any }) {
  return (
    <div className="relative p-5 my-3 border border-indigo-500/30 rounded-2xl bg-gradient-to-r from-indigo-50 to-indigo-100/50 dark:from-indigo-950/40 dark:to-indigo-900/10 backdrop-blur-xl shadow-lg max-w-sm text-center overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none mix-blend-overlay"></div>
      <div className="mx-auto w-fit p-3 bg-indigo-500/20 rounded-full text-indigo-600 dark:text-indigo-400 mb-3 relative z-10 shadow-[0_0_15px_rgba(99,102,241,0.5)]">
        <Package className="h-6 w-6 animate-pulse" />
      </div>
      <h3 className="font-black text-indigo-900 dark:text-indigo-100 text-lg relative z-10">{data.productType} (AI Üretimi)</h3>
      <p className="text-xs text-indigo-700/70 dark:text-indigo-300/70 mb-3 italic relative z-10">"{data.designPrompt}"</p>
      
      <div className="w-full h-32 bg-indigo-900/10 rounded-xl mb-3 flex items-center justify-center border border-indigo-500/20 relative z-10 overflow-hidden">
         <div className="text-xs font-mono text-indigo-500 flex flex-col items-center">
            <span className="mb-1">3D Model Üretiliyor...</span>
            <span>(Tahmini süre: 2dk)</span>
         </div>
      </div>
      
      <div className="flex justify-between items-center bg-background/50 p-2 rounded-lg relative z-10">
        <span className="text-xs font-bold text-muted-foreground">Tahmini: {data.price || "Fiyat Bekleniyor"}</span>
        <button className="bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-md hover:bg-indigo-600 transition-colors">
          Üretime Onay Ver
        </button>
      </div>
    </div>
  );
}

export function VipDropCard({ data }: { data: any }) {
  return (
    <div className="relative p-6 my-3 border border-amber-500/50 rounded-2xl bg-gradient-to-br from-black to-zinc-900 shadow-[0_0_20px_rgba(245,158,11,0.2)] max-w-sm text-center overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30 pointer-events-none mix-blend-overlay"></div>
      
      <div className="mx-auto w-fit p-3 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-500 mb-3 relative z-10">
        <Star className="h-8 w-8 animate-pulse drop-shadow-[0_0_10px_rgba(245,158,11,0.8)]" />
      </div>
      
      <h3 className="font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-yellow-500 text-xl relative z-10 mb-1 uppercase tracking-widest">
        VIP Exclusive
      </h3>
      
      <h4 className="font-bold text-zinc-100 text-lg relative z-10 mb-2">{data.dropName}</h4>
      
      <div className="bg-amber-950/40 border border-amber-500/20 rounded-lg p-3 mb-4 relative z-10">
        <p className="text-sm text-amber-200/80 font-medium">Bu koleksiyon sadece {data.requiredPoints} puan ve üzeri sadık müşterilere açılmıştır.</p>
        <div className="mt-2 text-xs font-mono text-red-400 font-bold flex items-center justify-center gap-1">
          <AlertCircle className="h-3 w-3" /> Stokta Sadece {data.remainingStock} Adet Kaldı!
        </div>
      </div>
      
      <button className="w-full bg-gradient-to-r from-amber-500 to-yellow-600 text-black px-4 py-3 rounded-xl text-sm font-black shadow-[0_0_15px_rgba(245,158,11,0.4)] hover:scale-105 transition-transform relative z-10 uppercase tracking-wider">
        Koleksiyonu İncele
      </button>
    </div>
  );
}

export function VaultCard({ data }: { data: any }) {
  const products = data.products || [];
  return (
    <div className="relative p-6 my-4 border border-zinc-700/50 rounded-2xl bg-gradient-to-br from-black via-zinc-950 to-zinc-900 shadow-[0_0_30px_rgba(0,0,0,0.8)] max-w-sm text-center overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none mix-blend-overlay"></div>
      
      <div className="mx-auto w-fit p-4 bg-zinc-900 border border-zinc-700 rounded-full text-zinc-300 mb-4 relative z-10 shadow-inner">
        <Package className="h-8 w-8" />
      </div>
      
      <h3 className="font-black text-transparent bg-clip-text bg-gradient-to-r from-zinc-300 to-zinc-500 text-2xl relative z-10 mb-2 uppercase tracking-[0.3em]">
        THE VAULT
      </h3>
      
      <p className="text-sm text-zinc-400 font-medium mb-5 relative z-10">{data.message}</p>
      
      <div className="space-y-3 relative z-10">
        {products.map((p: any, idx: number) => (
          <div key={idx} className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-3 text-left">
            <div className="flex justify-between items-center mb-1">
              <span className="font-bold text-zinc-200 text-sm">{p.name}</span>
              <span className="text-xs font-mono text-zinc-500">{p.isArchived ? "Archived" : "Exclusive"}</span>
            </div>
            <div className="text-xs text-zinc-400">Değerleme: <span className="font-bold text-zinc-300">{p.price}</span></div>
          </div>
        ))}
      </div>
      
      <button className="w-full mt-5 bg-zinc-100 text-black px-4 py-3 rounded-xl text-sm font-black shadow-lg hover:bg-white transition-colors relative z-10 uppercase tracking-widest">
        Erişim Sağla
      </button>
    </div>
  );
}

export function CertificateCard({ data }: { data: any }) {
  const cert = data.certificate || {};
  return (
    <div className="relative p-5 my-3 border border-indigo-500/30 rounded-xl bg-gradient-to-br from-slate-900 to-indigo-950 shadow-[0_0_20px_rgba(99,102,241,0.3)] max-w-sm overflow-hidden text-slate-200">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none"></div>
      
      <div className="flex items-center gap-3 border-b border-indigo-500/30 pb-3 mb-3 relative z-10">
        <CheckCircle2 className="h-6 w-6 text-indigo-400" />
        <div>
          <h4 className="font-black text-indigo-300 tracking-wider uppercase text-sm">Orijinallik Sertifikası</h4>
          <p className="text-xs text-slate-400">Digital Twin & Anti-Counterfeit</p>
        </div>
      </div>
      
      <div className="relative z-10 space-y-2">
        <p className="text-sm">{data.message}</p>
        <div className="bg-black/40 p-3 rounded-lg border border-indigo-500/20 font-mono text-xs break-all text-indigo-200">
          HASH: {cert.hash}
        </div>
        <div className="flex justify-between text-xs text-slate-400 pt-2">
          <span>Veriliş: {new Date(cert.issueDate).toLocaleDateString('tr-TR')}</span>
          <span className="text-indigo-400 font-bold flex items-center gap-1"><CheckCircle2 className="h-3 w-3"/> Blockchain Verified</span>
        </div>
      </div>
    </div>
  );
}
