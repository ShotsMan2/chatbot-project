import { WidgetChat } from "@/components/widget/widget-chat";

interface WidgetPageProps {
  searchParams: Promise<{
    color?: string;
    title?: string;
    welcome?: string;
    model?: string;
  }>;
}

export default async function WidgetPage({ searchParams }: WidgetPageProps) {
  const params = await searchParams;
  const color = params.color || "#6366f1";
  const title = params.title || "AI Asistan";
  const welcome = params.welcome || "Merhaba! Size nasıl yardımcı olabilirim?";
  const model = params.model || "";

  return (
    <WidgetChat
      color={color}
      title={title}
      welcomeMessage={welcome}
      model={model}
    />
  );
}
