import { getSettings } from "@/lib/actions/chat";
import { SettingsForm } from "@/components/settings/settings-form";

export default async function SettingsPage() {
  const settings = await getSettings();

  return (
    <div className="p-8 h-full overflow-auto">
      <h1 className="text-3xl font-bold mb-8">Settings</h1>
      <SettingsForm initialSettings={settings} />
    </div>
  );
}
