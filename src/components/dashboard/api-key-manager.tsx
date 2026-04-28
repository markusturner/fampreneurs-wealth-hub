import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Key, Copy, Trash2, Plus, AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
  is_active: boolean;
}

interface ApiKeyManagerProps {
  userId: string;
}

// Hash a string with SHA-256 (browser-safe)
async function sha256(text: string): Promise<string> {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function generateApiKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const key = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `lvbl_${key}`;
}

export const ApiKeyManager = ({ userId }: ApiKeyManagerProps) => {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [keyToRevoke, setKeyToRevoke] = useState<ApiKey | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchKeys();
  }, [userId]);

  const fetchKeys = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("api_keys")
        .select("id, name, key_prefix, created_at, last_used_at, is_active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setKeys((data || []) as ApiKey[]);
    } catch (e) {
      console.error("Error fetching api keys:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newKeyName.trim()) {
      toast({ title: "Name required", description: "Please give this key a name.", variant: "destructive" });
      return;
    }
    setIsCreating(true);
    try {
      const fullKey = generateApiKey();
      const keyHash = await sha256(fullKey);
      const keyPrefix = fullKey.substring(0, 12); // lvbl_xxxxxxx

      const { error } = await supabase.from("api_keys").insert({
        user_id: userId,
        name: newKeyName.trim(),
        key_prefix: keyPrefix,
        key_hash: keyHash,
      });
      if (error) throw error;

      setNewlyCreatedKey(fullKey);
      setNewKeyName("");
      fetchKeys();
    } catch (e) {
      console.error("Error creating api key:", e);
      toast({ title: "Error", description: "Failed to create API key.", variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevoke = async () => {
    if (!keyToRevoke) return;
    try {
      const { error } = await supabase.from("api_keys").delete().eq("id", keyToRevoke.id);
      if (error) throw error;
      toast({ title: "Revoked", description: `API key "${keyToRevoke.name}" has been revoked.` });
      setKeyToRevoke(null);
      fetchKeys();
    } catch (e) {
      console.error("Error revoking api key:", e);
      toast({ title: "Error", description: "Failed to revoke API key.", variant: "destructive" });
    }
  };

  const copyKey = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: "API key copied to clipboard." });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          API Keys
        </CardTitle>
        <CardDescription>
          Generate API keys to authenticate external services (such as Zapier) when calling your endpoints.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Create new key */}
        <div className="space-y-2">
          <Label htmlFor="api-key-name">New API Key Name</Label>
          <div className="flex gap-2">
            <Input
              id="api-key-name"
              placeholder="e.g., Zapier Production"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              disabled={isCreating}
            />
            <Button onClick={handleCreate} disabled={isCreating || !newKeyName.trim()}>
              {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create
            </Button>
          </div>
        </div>

        {/* Newly created key reveal */}
        {newlyCreatedKey && (
          <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-4 space-y-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-sm">Save this key now</p>
                <p className="text-xs text-muted-foreground">
                  This is the only time the full key will be shown. Store it somewhere safe.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Input readOnly value={newlyCreatedKey} className="font-mono text-xs" />
              <Button variant="outline" size="icon" onClick={() => copyKey(newlyCreatedKey)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setNewlyCreatedKey(null)}>
              I've saved it
            </Button>
          </div>
        )}

        {/* Existing keys list */}
        <div className="space-y-2">
          <Label>Active Keys</Label>
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : keys.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No API keys yet.</p>
          ) : (
            <div className="space-y-2">
              {keys.map((k) => (
                <div
                  key={k.id}
                  className="flex items-center justify-between gap-3 rounded-md border bg-muted/30 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{k.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {k.key_prefix}…
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Created {new Date(k.created_at).toLocaleDateString()}
                      {k.last_used_at && ` · Last used ${new Date(k.last_used_at).toLocaleDateString()}`}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setKeyToRevoke(k)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>

      <AlertDialog open={!!keyToRevoke} onOpenChange={(open) => !open && setKeyToRevoke(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke API Key?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently revoke "{keyToRevoke?.name}". Any integrations using it will stop working immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevoke} className="bg-destructive hover:bg-destructive/90">
              Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
