import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useAgencyProfile } from "@/components/agency-profile-provider";
import { cn } from "@/lib/utils";
import {
  Bot,
  Send,
  User,
  Sparkles,
  TrendingUp,
  AlertCircle,
  Users,
  DollarSign,
  Briefcase,
  RefreshCw,
  Megaphone,
  Package,
  Calendar,
  Heart,
  ClipboardList,
  Clock,
  CheckCircle2,
  Plus,
  Stethoscope,
  CreditCard,
  CheckCheck,
  XCircle,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ActionResult {
  type: string;
  success: boolean;
  entity: string;
  detail: string;
}

interface Message {
  id: string;
  role: "user" | "assistant" | "action";
  content: string;
  timestamp: Date;
  action?: ActionResult;
  streaming?: boolean;
}

// ── Prompt Suites ─────────────────────────────────────────────────────────────

const AGENCY_PROMPTS = [
  { icon: Users, label: "Client attention", prompt: "Which clients need attention this week?" },
  { icon: DollarSign, label: "Overdue invoices", prompt: "Which invoices are overdue?" },
  { icon: Briefcase, label: "Projects at risk", prompt: "Which projects are behind schedule?" },
  { icon: TrendingUp, label: "Weekly summary", prompt: "Give me a weekly agency summary." },
  { icon: Megaphone, label: "Campaign status", prompt: "Which campaigns are active and how are they performing?" },
  { icon: Package, label: "Pending approvals", prompt: "Which deliverables are waiting for client approval?" },
  { icon: AlertCircle, label: "Churn risk", prompt: "Identify clients that might be at risk of churning." },
  { icon: Calendar, label: "Upcoming deadlines", prompt: "What are my most urgent upcoming deadlines?" },
];

const CLINIC_PROMPTS = [
  { icon: Calendar, label: "Today's schedule", prompt: "What appointments do I have today?" },
  { icon: Users, label: "Follow-up patients", prompt: "Which patients need a follow-up?" },
  { icon: CreditCard, label: "Outstanding billing", prompt: "Which patients have outstanding payments?" },
  { icon: ClipboardList, label: "Daily summary", prompt: "Give me a summary of today's clinic status." },
  { icon: Stethoscope, label: "Active treatments", prompt: "Which treatments are currently in progress?" },
  { icon: Clock, label: "Missed appointments", prompt: "Show me cancelled or missed appointments this week." },
  { icon: Heart, label: "Recent patients", prompt: "Which patients haven't been seen in a while?" },
  { icon: Plus, label: "Create follow-up", prompt: "Create a follow-up for [patient name] next week." },
];

// ── Message Components ────────────────────────────────────────────────────────

function ActionCard({ action }: { action: ActionResult }) {
  const isSuccess = action.success;
  return (
    <div className="flex justify-center">
      <div
        className={cn(
          "flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium border max-w-sm w-full",
          isSuccess
            ? "bg-emerald-500/8 border-emerald-500/25 text-emerald-700 dark:text-emerald-400"
            : "bg-red-500/8 border-red-500/25 text-red-700 dark:text-red-400",
        )}
      >
        {isSuccess ? (
          <CheckCheck size={15} className="shrink-0" />
        ) : (
          <XCircle size={15} className="shrink-0" />
        )}
        <div className="min-w-0">
          <span className="font-semibold">{action.entity} {isSuccess ? "created" : "failed"}</span>
          <span className="text-xs ml-1.5 opacity-80">{action.detail}</span>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  if (message.role === "action" && message.action) {
    return <ActionCard action={message.action} />;
  }

  const isUser = message.role === "user";
  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-gradient-to-tr from-violet-500 to-purple-600 text-white",
        )}
      >
        {isUser ? <User size={14} /> : <Bot size={14} />}
      </div>
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
          isUser
            ? "bg-primary text-primary-foreground rounded-tr-sm"
            : "bg-secondary text-foreground rounded-tl-sm",
          message.streaming && "after:content-['▋'] after:ml-0.5 after:animate-pulse",
        )}
      >
        {message.content.split("\n").map((line, i, arr) => (
          <span key={i}>
            {line}
            {i < arr.length - 1 && <br />}
          </span>
        ))}
        {!message.streaming && (
          <div
            className={cn(
              "text-[10px] mt-1.5 opacity-60",
              isUser ? "text-right" : "text-left",
            )}
          >
            {message.timestamp.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function AIAssistantPage() {
  const { profile: agencyProfile } = useAgencyProfile();
  const isClinic = agencyProfile.businessType === "clinic";

  const prompts = isClinic ? CLINIC_PROMPTS : AGENCY_PROMPTS;

  const welcomeMessage = isClinic
    ? `Hi! I'm your clinic operations assistant.\n\nI have full context across your patients, appointments, treatments, follow-ups, and billing.\n\nI can answer questions about your clinic, and I can also create follow-ups, schedule appointments, or add tasks — just ask.`
    : `Hi! I'm your agency operations assistant.\n\nI have full context across your clients, projects, campaigns, deliverables, invoices, team workload, and deadlines.\n\nWhat would you like to know?`;

  const subtitle = isClinic
    ? "Your clinic operations assistant — ask about patients, appointments, treatments, billing, or create follow-ups and tasks."
    : "Your agency operations manager — ask about clients, projects, revenue, deadlines, and team workload.";

  const badge = isClinic ? "Clinic Intelligence" : "Agency Intelligence";
  const placeholder = isClinic
    ? "Ask about patients, appointments, billing… or say 'Create a follow-up for Ahmed next Monday'"
    : "Ask about your clients, projects, revenue, deadlines, or team workload…";

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: welcomeMessage,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<
    Array<{ role: "user" | "assistant"; content: string }>
  >([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text: string) {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
    };

    // Build history from current messages (exclude action messages)
    const currentHistory = messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .filter((m) => !m.streaming)
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    // Add streaming placeholder
    const assistantId = `assistant-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: assistantId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
        streaming: true,
      },
    ]);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          message: text.trim(),
          history: currentHistory,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const errText =
          (errData as any).error ??
          "I couldn't connect to the AI right now. Make sure OPENAI_API_KEY is configured in your workspace settings.";
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: errText, streaming: false }
              : m,
          ),
        );
        return;
      }

      if (!res.body) {
        throw new Error("No response body");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantContent = "";
      const pendingActions: ActionResult[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));

            if (data.content) {
              assistantContent += data.content;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: assistantContent, streaming: true }
                    : m,
                ),
              );
            }

            if (data.action) {
              pendingActions.push(data.action as ActionResult);
            }

            if (data.error) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? {
                        ...m,
                        content: `Error: ${data.error}`,
                        streaming: false,
                      }
                    : m,
                ),
              );
            }

            if (data.done) {
              // Finalize streaming message
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, streaming: false } : m,
                ),
              );

              // Insert action cards before the assistant message
              if (pendingActions.length > 0) {
                setMessages((prev) => {
                  const idx = prev.findIndex((m) => m.id === assistantId);
                  if (idx === -1) return prev;
                  const actionMessages: Message[] = pendingActions.map(
                    (a, i) => ({
                      id: `action-${Date.now()}-${i}`,
                      role: "action" as const,
                      content: a.detail,
                      timestamp: new Date(),
                      action: a,
                    }),
                  );
                  return [
                    ...prev.slice(0, idx),
                    ...actionMessages,
                    ...prev.slice(idx),
                  ];
                });
              }
            }
          } catch {
            /* skip malformed line */
          }
        }
      }

      // Update history for next turn
      setHistory((prev) => [
        ...prev,
        { role: "user", content: text.trim() },
        { role: "assistant", content: assistantContent },
      ]);
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content:
                  "I couldn't connect to the AI right now. Make sure OPENAI_API_KEY is configured in your workspace settings.",
                streaming: false,
              }
            : m,
        ),
      );
    } finally {
      setIsLoading(false);
      textareaRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  function handleNewConversation() {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: "assistant",
        content: welcomeMessage,
        timestamp: new Date(),
      },
    ]);
    setHistory([]);
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-500 to-purple-600 flex items-center justify-center">
              <Bot size={18} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">AI Assistant</h1>
            <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-600 dark:text-violet-400 font-medium">
              <Sparkles size={11} />
              {badge}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleNewConversation}
          className="gap-2 flex-shrink-0"
        >
          <RefreshCw size={14} />
          New Chat
        </Button>
      </div>

      {/* Prompt Suggestions — shown only when only welcome message */}
      {messages.length === 1 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
          {prompts.map(({ icon: Icon, label, prompt }) => (
            <button
              key={label}
              onClick={() => sendMessage(prompt)}
              className="flex flex-col items-start gap-1.5 p-3 rounded-xl border border-border/60 bg-secondary/30 hover:bg-secondary/60 hover:border-primary/30 transition-all text-left text-sm group"
            >
              <Icon
                size={15}
                className="text-muted-foreground group-hover:text-primary transition-colors"
              />
              <span className="text-xs font-medium text-foreground">{label}</span>
              <span className="text-[10px] text-muted-foreground leading-tight line-clamp-2">
                {prompt}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <Card className="flex-1 overflow-hidden flex flex-col">
        <CardContent
          className="flex-1 overflow-y-auto p-5 space-y-5"
          style={{ minHeight: 0 }}
        >
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          {isLoading &&
            messages[messages.length - 1]?.streaming === false && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                  <Bot size={14} className="text-white" />
                </div>
                <div className="bg-secondary rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  />
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  />
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  />
                </div>
              </div>
            )}
          <div ref={messagesEndRef} />
        </CardContent>

        {/* Input */}
        <div className="border-t border-border/50 p-4">
          <div className="flex gap-2 items-end">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="resize-none min-h-[44px] max-h-32 text-sm"
              rows={1}
            />
            <Button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="h-11 w-11 flex-shrink-0"
            >
              <Send size={16} />
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">
            Press Enter to send · Shift+Enter for new line
            {isClinic && (
              <span className="ml-2 text-violet-500/70">
                · Ask me to create follow-ups, appointments, or tasks
              </span>
            )}
          </p>
        </div>
      </Card>
    </div>
  );
}
