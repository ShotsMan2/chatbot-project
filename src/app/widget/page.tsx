import { CemreParkChatWidget } from "@/components/cemrepark-chat-widget";

interface WidgetPageProps {
  searchParams: Promise<{
    color?: string;
    title?: string;
    welcome?: string;
    model?: string;
    context?: string;
  }>;
}

export default async function WidgetPage({ searchParams }: WidgetPageProps) {
  return <CemreParkChatWidget />;
}
