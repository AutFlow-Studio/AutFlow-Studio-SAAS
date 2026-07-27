import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Send, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { usePortalAuth } from "@/components/portal-auth-provider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface Message {
  id: number;
  senderType: string;
  senderName: string;
  message: string;
  createdAt: string;
}

export default function PortalMessages() {
  const { user } = usePortalAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  function fetchMessages() {
    return fetch("/api/portal/messages", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setMessages)
      .catch(() => setError("Unable to load messages."));
  }

  useEffect(() => {
    fetchMessages().finally(() => setLoading(false));
    const interval = setInterval(fetchMessages, 15_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/portal/messages", {
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

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 h-[calc(100vh-180px)] flex flex-col">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Messages</h1>
        <p className="text-muted-foreground mt-1">Updates and communication from your agency</p>
      </div>

      {error ? (
        <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
          <AlertCircle size={32} />
          <p className="text-sm">{error}</p>
        </div>
      ) : (
        <Card className="bg-card/40 backdrop-blur-sm border-border/50 flex flex-col flex-1 overflow-hidden">
          <CardContent className="flex flex-col flex-1 overflow-hidden p-0">
            {/* Messages area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
                  <MessageSquare size={40} className="opacity-30" />
                  <p className="text-sm">No messages yet. Say hello!</p>
                </div>
              ) : (
                messages.map((m) => {
                  const isClient = m.senderType === "client";
                  return (
                    <div
                      key={m.id}
                      className={cn("flex flex-col gap-1 max-w-[80%]", isClient ? "ml-auto items-end" : "items-start")}
                    >
                      <div className="text-xs text-muted-foreground px-1">
                        {isClient ? "You" : m.senderName}
                      </div>
                      <div
                        className={cn(
                          "px-4 py-2.5 rounded-2xl text-sm leading-relaxed",
                          isClient
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

            {/* Message input */}
            <div className="border-t border-border/50 p-4">
              <form onSubmit={handleSend} className="flex gap-3 items-end">
                <Textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message…"
                  className="flex-1 min-h-[42px] max-h-32 resize-none bg-secondary/50 border-border/50 focus:border-primary/50 text-sm"
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend(e as unknown as React.FormEvent);
                    }
                  }}
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!newMessage.trim() || sending}
                  className="h-10 w-10 shrink-0"
                >
                  <Send size={15} />
                </Button>
              </form>
              <p className="text-xs text-muted-foreground/60 mt-2">Press Enter to send · Shift+Enter for new line</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
