import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";

interface Message {
  id: number;
  senderType: string;
  senderName: string;
  message: string;
  createdAt: string;
}

export function PortalMessagesPanel({ clientId }: { clientId: number }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(() => {
    return fetch(`/api/portal-admin/clients/${clientId}/messages`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setMessages)
      .catch(() => {});
  }, [clientId]);

  useEffect(() => {
    fetchMessages().finally(() => setLoading(false));
    const interval = setInterval(fetchMessages, 20_000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/portal-admin/clients/${clientId}/messages`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: newMessage.trim() }),
      });
      if (!res.ok) throw new Error();
      const msg = await res.json();
      setMessages((prev) => [...prev, msg]);
      setNewMessage("");
    } catch {
      // silent — user can retry
    } finally {
      setSending(false);
    }
  }

  return (
    <Card className="bg-card/40 backdrop-blur-sm border-border/50">
      <CardHeader>
        <CardTitle className="text-base">Client Messages</CardTitle>
        <CardDescription>Messages exchanged through the client portal</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="flex flex-col" style={{ maxHeight: 420 }}>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4" style={{ minHeight: 200, maxHeight: 320 }}>
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-8">Loading…</p>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
                <MessageSquare size={32} className="opacity-30" />
                <p className="text-sm">No messages yet. Send a message to get started.</p>
              </div>
            ) : (
              messages.map((m) => {
                const isAgency = m.senderType === "agency";
                return (
                  <div
                    key={m.id}
                    className={cn("flex flex-col gap-1 max-w-[75%]", isAgency ? "ml-auto items-end" : "items-start")}
                  >
                    <div className="text-xs text-muted-foreground px-1">
                      {isAgency ? "You (Agency)" : m.senderName}
                    </div>
                    <div
                      className={cn(
                        "px-4 py-2.5 rounded-2xl text-sm leading-relaxed",
                        isAgency
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-secondary text-foreground rounded-bl-sm"
                      )}
                    >
                      {m.message}
                    </div>
                    <div className="text-xs text-muted-foreground/60 px-1">
                      {format(parseISO(m.createdAt), "MMM d, h:mm a")}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-border/50 p-4">
            <form onSubmit={handleSend} className="flex gap-3 items-end">
              <Textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Send a message to the client…"
                className="flex-1 min-h-[42px] max-h-32 resize-none bg-secondary/50 border-border/50 text-sm"
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend(e as unknown as React.FormEvent);
                  }
                }}
              />
              <Button type="submit" size="icon" disabled={!newMessage.trim() || sending} className="h-10 w-10 shrink-0">
                <Send size={15} />
              </Button>
            </form>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
