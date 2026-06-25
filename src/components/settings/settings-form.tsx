"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { updateSettings, clearAllConversations } from "@/lib/actions/chat";

export function SettingsForm({ initialSettings }: { initialSettings: any }) {
  const [settings, setSettings] = useState(initialSettings);
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    await updateSettings({
      defaultModel: settings.defaultModel,
      defaultSystemPrompt: settings.defaultSystemPrompt,
      temperature: parseFloat(settings.temperature),
      contextSize: parseInt(settings.contextSize),
    });
    setLoading(false);
  };

  const handleClear = async () => {
    if (confirm("Are you sure you want to delete all conversations? This cannot be undone.")) {
      setClearing(true);
      await clearAllConversations();
      setClearing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Model Settings</h3>
        <div className="grid gap-2">
          <label className="text-sm font-medium">Default Model</label>
          <Input 
            value={settings.defaultModel} 
            onChange={e => setSettings({...settings, defaultModel: e.target.value})} 
          />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium">System Prompt</label>
          <Textarea 
            value={settings.defaultSystemPrompt} 
            onChange={e => setSettings({...settings, defaultSystemPrompt: e.target.value})}
            rows={4} 
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Temperature</label>
            <Input 
              type="number" 
              step="0.1" 
              min="0" 
              max="2"
              value={settings.temperature} 
              onChange={e => setSettings({...settings, temperature: e.target.value})} 
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Context Size</label>
            <Input 
              type="number" 
              value={settings.contextSize} 
              onChange={e => setSettings({...settings, contextSize: e.target.value})} 
            />
          </div>
        </div>
        <Button onClick={handleSave} disabled={loading}>
          {loading ? "Saving..." : "Save Settings"}
        </Button>
      </div>

      <div className="pt-6 border-t space-y-4">
        <h3 className="text-lg font-medium text-destructive">Danger Zone</h3>
        <p className="text-sm text-muted-foreground">Permanently delete all your chat history.</p>
        <Button variant="destructive" onClick={handleClear} disabled={clearing}>
          {clearing ? "Clearing..." : "Clear All Conversations"}
        </Button>
      </div>
    </div>
  );
}
