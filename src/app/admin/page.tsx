import { db } from "@/lib/db";
import { orders, carts, supportTickets, conversations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { LayoutDashboard, ShoppingCart, HeadphonesIcon, TrendingUp, DollarSign } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const allOrders = await db.select().from(orders);
  const activeCarts = await db.select().from(carts).where(eq(carts.status, "active"));
  const openTickets = await db.select().from(supportTickets).where(eq(supportTickets.status, "open"));
  const totalConvs = await db.select().from(conversations);

  const totalRevenue = allOrders.reduce((acc, order) => {
    const val = parseFloat(order.totalAmount.replace(/[^0-9.]/g, '')) || 0;
    return acc + val;
  }, 0);

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <header className="flex justify-between items-center pb-6 border-b border-neutral-200 dark:border-neutral-800">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-neutral-900 dark:text-white flex items-center gap-3">
              <LayoutDashboard className="h-8 w-8 text-primary" />
              Kurumsal Yönetim Paneli
            </h1>
            <p className="text-muted-foreground mt-1">E-Ticaret AI Asistanı Performans Özeti</p>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          <div className="p-6 rounded-2xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col gap-2">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              <span className="font-semibold text-sm">Toplam Ciro (AI Destekli)</span>
            </div>
            <div className="text-4xl font-black">{totalRevenue.toLocaleString('tr-TR')} TL</div>
            <div className="text-xs text-green-600 font-medium">+12% geçen aya göre</div>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col gap-2">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <ShoppingCart className="h-5 w-5 text-blue-500" />
              <span className="font-semibold text-sm">Aktif Sepetler</span>
            </div>
            <div className="text-4xl font-black">{activeCarts.length}</div>
            <div className="text-xs text-muted-foreground font-medium">Satın alma bekleniyor</div>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col gap-2">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <TrendingUp className="h-5 w-5 text-purple-500" />
              <span className="font-semibold text-sm">Bot Etkileşimi</span>
            </div>
            <div className="text-4xl font-black">{totalConvs.length}</div>
            <div className="text-xs text-muted-foreground font-medium">Toplam sohbet oturumu</div>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-black border border-red-500/20 shadow-sm flex flex-col gap-2 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <HeadphonesIcon className="h-24 w-24 text-red-500" />
            </div>
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-2 z-10">
              <HeadphonesIcon className="h-5 w-5" />
              <span className="font-semibold text-sm">Açık Destek Biletleri</span>
            </div>
            <div className="text-4xl font-black text-red-700 dark:text-red-500 z-10">{openTickets.length}</div>
            <div className="text-xs text-red-600/80 font-medium z-10">İnsan devri (Handoff) gerektiriyor</div>
          </div>

        </div>

        <div className="mt-8 p-6 rounded-2xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shadow-sm">
          <h2 className="text-xl font-bold mb-4">Son Destek Talepleri</h2>
          {openTickets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground bg-neutral-50 dark:bg-neutral-900 rounded-xl">
              Harika! Yanıt bekleyen müşteri talebi yok.
            </div>
          ) : (
            <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {openTickets.map(ticket => (
                <div key={ticket.id} className="py-4 flex justify-between items-center">
                  <div>
                    <div className="font-bold text-sm text-primary">{ticket.id}</div>
                    <div className="text-muted-foreground mt-1">{ticket.issue}</div>
                  </div>
                  <button className="px-4 py-2 bg-primary/10 text-primary rounded-lg font-bold text-sm hover:bg-primary/20 transition-colors">
                    Yanıtla
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
