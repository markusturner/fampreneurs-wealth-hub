import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Link as LinkIcon, Zap } from "lucide-react";

interface ZapierIntegrationProps {
  userId: string;
}

export const ZapierIntegration = ({ userId }: ZapierIntegrationProps) => {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookName, setWebhookName] = useState("");
  const [existingWebhook, setExistingWebhook] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchWebhook();
  }, [userId]);

  const fetchWebhook = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("zapier_webhooks")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        setExistingWebhook(data);
        setWebhookUrl(data.webhook_url);
        setWebhookName(data.webhook_name || "");
      }
    } catch (error) {
      console.error("Error fetching webhook:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!webhookUrl) {
      toast({
        title: "Error",
        description: "Please enter a webhook URL",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const webhookData = {
        user_id: userId,
        webhook_url: webhookUrl,
        webhook_name: webhookName || null,
        is_active: true,
      };

      const { error } = existingWebhook
        ? await supabase
            .from("zapier_webhooks")
            .update(webhookData)
            .eq("id", existingWebhook.id)
        : await supabase.from("zapier_webhooks").insert(webhookData);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Zapier webhook saved successfully",
      });

      fetchWebhook();
    } catch (error) {
      console.error("Error saving webhook:", error);
      toast({
        title: "Error",
        description: "Failed to save webhook",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    if (!webhookUrl) {
      toast({
        title: "Error",
        description: "Please enter a webhook URL",
        variant: "destructive",
      });
      return;
    }

    setIsTesting(true);
    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        mode: "no-cors",
        body: JSON.stringify({
          test: true,
          timestamp: new Date().toISOString(),
          triggered_from: window.location.origin,
          user_id: userId,
        }),
      });

      toast({
        title: "Test Webhook Sent",
        description: "Please check your Zap's history to confirm it was triggered",
      });
    } catch (error) {
      console.error("Error testing webhook:", error);
      toast({
        title: "Error",
        description: "Failed to test webhook",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleDelete = async () => {
    if (!existingWebhook) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("zapier_webhooks")
        .delete()
        .eq("id", existingWebhook.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Zapier webhook deleted successfully",
      });

      setExistingWebhook(null);
      setWebhookUrl("");
      setWebhookName("");
    } catch (error) {
      console.error("Error deleting webhook:", error);
      toast({
        title: "Error",
        description: "Failed to delete webhook",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Zapier Integration
        </CardTitle>
        <CardDescription>
          Connect your account to Zapier to automate workflows and integrate with thousands of apps
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="webhookName">Webhook Name (Optional)</Label>
          <Input
            id="webhookName"
            placeholder="e.g., Main Webhook"
            value={webhookName}
            onChange={(e) => setWebhookName(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="webhookUrl">Zapier Webhook URL</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="webhookUrl"
                placeholder="https://hooks.zapier.com/hooks/catch/..."
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Create a Zap with a "Catch Hook" trigger in Zapier and paste the webhook URL here
          </p>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={isSaving || !webhookUrl}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {existingWebhook ? "Update" : "Save"} Webhook
          </Button>

          {webhookUrl && (
            <Button variant="outline" onClick={handleTest} disabled={isTesting}>
              {isTesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Test Webhook
            </Button>
          )}

          {existingWebhook && (
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          )}
        </div>

        {existingWebhook && (
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Status:</span>
              <span className="text-sm text-green-600">Active</span>
            </div>
            {existingWebhook.webhook_name && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Name:</span>
                <span className="text-sm">{existingWebhook.webhook_name}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Created:</span>
              <span className="text-sm">
                {new Date(existingWebhook.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
