import { useState, useRef, useEffect } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useAgencyProfile } from "@/components/agency-profile-provider";
import { getNicheConfig } from "@/lib/niche-config";
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
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

// ── Prompt Suggestions ────────────────────────────────────────────────────────

const AGENCY_PROMPTS = [
  { icon: Users, label: "Client attention", prompt: "Which clients need attention this week?" },
  { icon: DollarSign, label: "Overdue invoices", prompt: "Which invoices are overdue?" },
  { icon: Briefcase, label: "Projects at risk", prompt: "Which projects are behind schedule?" },
  { icon: TrendingUp, label: "Weekly summary", prompt: "Give me a weekly agency summary." },
  { icon: Megaphone, label: "Campaign performance", prompt: "Which campaigns are active and how are they performing?" },
  { icon: Package, label: "Pending approvals", prompt: "Which deliverables are waiting for client approval?" },
  { icon: AlertCircle, label: "Churn risk", prompt: "Identify clients that might be at risk of churning." },
  { icon: Calendar, label: "Upcoming deadlines", prompt: "What are my most urgent upcoming deadlines?" },
];

// ── Message Bubble ────────────────────────────────────────────────────────────

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
        isUser ? "bg-primary text-primary-foreground" : "bg-gradient-to-tr from-violet-500 to-purple-600 text-white"
      )}>
        {isUser ? <User size={14} /> : <Bot size={14} />}
      </div>
      <div className={cn(
        "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
        isUser
          ? "bg-primary text-primary-foreground rounded-tr-sm"
          : "bg-secondary text-foreground rounded-tl-sm"
      )}>
        {message.content.split("\n").map((line, i) => (
          <span key={i}>
            {line}
            {i < message.content.split("\n").length - 1 && <br />}
          </span>
        ))}
        <div className={cn("text-[10px] mt-1.5 opacity-60", isUser ? "text-right" : "text-left")}>
          {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function AIAssistantPage() {
  const { profile: agencyProfile } = useAgencyProfile();
  const nicheConfig = getNicheConfig(agencyProfile.businessType);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `Hi! I'm your agency operations manager.\n\nI have full context across your clients, projects, campaigns, deliverables, invoices, team workload, and deadlines.\n\nWhat would you like to know?`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
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
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          message: text.trim(),
          conversationId,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to get response");
      }

      const data = await res.json();
      if (data.conversationId) setConversationId(data.conversationId);

      const assistantMsg: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.message ?? data.reply ?? "I couldn't process that request.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errMsg: Message = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: "I couldn't connect to the AI right now. Make sure the OPENAI_API_KEY is configured in your workspace settings.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errMsg]);
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
        content: `New conversation started. How can I help you manage your agency?`,
        timestamp: new Date(),
      },
    ]);
    setConversationId(null);
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-500 to-purple-600 flex items-center justify-center">
              <Bot size={18} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">AI Assistant</h1>
            <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-600 dark:text-violet-400 font-medium">
              <Sparkles size={11} />
              Agency Intelligence
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Your agency operations manager — ask about clients, projects, revenue, deadlines, and team workload.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleNewConversation} className="gap-2 flex-shrink-0">
          <RefreshCw size={14} />
          New Chat
        </Button>
      </div>

      {/* Prompt Suggestions — shown when only welcome message */}
      {messages.length === 1 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
          {AGENCY_PROMPTS.map(({ icon: Icon, label, prompt }) => (
            <button
              key={label}
              onClick={() => sendMessage(prompt)}
              className="flex flex-col items-start gap-1.5 p-3 rounded-xl border border-border/60 bg-secondary/30 hover:bg-secondary/60 hover:border-primary/30 transition-all text-left text-sm group"
            >
              <Icon size={15} className="text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="text-xs font-medium text-foreground">{label}</span>
              <span className="text-[10px] text-muted-foreground leading-tight line-clamp-2">{prompt}</span>
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <Card className="flex-1 overflow-hidden flex flex-col">
        <CardContent className="flex-1 overflow-y-auto p-5 space-y-5" style={{ minHeight: 0 }}>
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          {isLoading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                <Bot size={14} className="text-white" />
              </div>
              <div className="bg-secondary rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
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
              placeholder="Ask about your clients, projects, revenue, deadlines, or team workload..."
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
          </p>
        </div>
      </Card>
    </div>
  );
}
