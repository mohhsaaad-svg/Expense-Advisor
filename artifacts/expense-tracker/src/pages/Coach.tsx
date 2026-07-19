import { useState, useRef, useEffect } from "react";
import { 
  useListAnthropicConversations, 
  useCreateAnthropicConversation, 
  useGetAnthropicConversation, 
  useDeleteAnthropicConversation,
  getListAnthropicConversationsQueryKey,
  getGetAnthropicConversationQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, MessageSquare, Plus, Trash2, Send, Flame, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export default function Coach() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeId, setActiveId] = useState<number | null>(null);
  const [inputMessage, setInputMessage] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedContent, setStreamedContent] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const { data: conversations, isLoading: loadingConversations } = useListAnthropicConversations({
    query: {
      queryKey: getListAnthropicConversationsQueryKey(),
      // Defense-in-depth: if the first fetch is interrupted during app boot,
      // retry and always refetch on remount instead of hanging undefined.
      retry: 2,
      refetchOnMount: "always"
    }
  });

  const { data: activeConversation, isLoading: loadingActive } = useGetAnthropicConversation(
    activeId!,
    {
      query: { 
        enabled: !!activeId,
        queryKey: getGetAnthropicConversationQueryKey(activeId!)
      }
    }
  );

  const createConversation = useCreateAnthropicConversation({
    mutation: {
      onSuccess: (newConv) => {
        queryClient.invalidateQueries({ queryKey: getListAnthropicConversationsQueryKey() });
        setActiveId(newConv.id);
      }
    }
  });

  const deleteConversation = useDeleteAnthropicConversation({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAnthropicConversationsQueryKey() });
        toast({ title: "Conversation deleted" });
      }
    }
  });

  // Resume the most recent conversation on first load (list is newest-first)
  const hasAutoResumed = useRef(false);
  useEffect(() => {
    if (hasAutoResumed.current || !conversations) return;
    hasAutoResumed.current = true;
    if (activeId === null && conversations.length > 0) {
      setActiveId(conversations[0].id);
    }
  }, [conversations, activeId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeConversation?.messages, streamedContent]);

  const handleStartNew = () => {
    createConversation.mutate({ data: { title: "New Conversation" } });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !activeId || isStreaming) return;

    const messageToSend = inputMessage;
    setInputMessage("");
    setIsStreaming(true);
    setStreamedContent("");

    // Optimistically update the UI with the user's message
    const tempUserMessage = {
      id: Date.now(),
      conversationId: activeId,
      role: "user",
      content: messageToSend,
      createdAt: new Date().toISOString()
    };

    queryClient.setQueryData(getGetAnthropicConversationQueryKey(activeId), (old: any) => {
      if (!old) return old;
      return { ...old, messages: [...old.messages, tempUserMessage] };
    });

    try {
      const response = await fetch(`/api/anthropic/conversations/${activeId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: messageToSend })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to send message");
      }

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let assistantContent = "";
      let buffer = "";

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          buffer += decoder.decode(value, { stream: true });
        }
        
        const parts = buffer.split("\n\n");
        buffer = parts.pop() || ""; // The last part might be incomplete

        for (const part of parts) {
          if (part.startsWith("data: ")) {
            const dataStr = part.substring(6);
            if (!dataStr || dataStr.trim() === "[DONE]") continue;
            try {
              const data = JSON.parse(dataStr);
              if (data.error) {
                toast({ title: "Error", description: data.error, variant: "destructive" });
                break;
              }
              if (data.done) {
                break;
              }
              if (data.content) {
                assistantContent += data.content;
                setStreamedContent(assistantContent);
              }
            } catch (e) {
              console.error("Failed to parse SSE JSON", e, dataStr);
            }
          }
        }
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsStreaming(false);
      setStreamedContent("");
      // Invalidate to fetch the real persisted messages and new title
      queryClient.invalidateQueries({ queryKey: getGetAnthropicConversationQueryKey(activeId) });
      queryClient.invalidateQueries({ queryKey: getListAnthropicConversationsQueryKey() });
    }
  };

  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    deleteConversation.mutate({ id });
    if (activeId === id) setActiveId(null);
  };

  return (
    <div className="h-full flex flex-col md:flex-row gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700 max-h-[calc(100vh-8rem)]">
      {/* Sidebar for conversations */}
      <div className="w-full md:w-80 flex flex-col gap-4">
        <div>
          <h1 className="text-4xl font-serif font-bold tracking-tight text-foreground mb-2 flex items-center gap-3">
            Coach <Sparkles className="w-6 h-6 text-primary" />
          </h1>
          <p className="text-sm text-muted-foreground font-light mb-4">Your personal money advisor.</p>
          <Button onClick={handleStartNew} className="w-full shadow-sm rounded-xl h-12" disabled={createConversation.isPending}>
            <Plus className="w-4 h-4 mr-2" /> New Conversation
          </Button>
        </div>

        <ScrollArea className="flex-1 -mx-2 px-2">
          <div className="space-y-2 pb-4">
            {conversations?.map((conv) => (
              <div
                key={conv.id}
                onClick={() => setActiveId(conv.id)}
                className={cn(
                  "p-3 rounded-xl cursor-pointer transition-all border flex items-center justify-between group",
                  activeId === conv.id
                    ? "bg-primary/10 border-primary/30 text-primary-foreground"
                    : "bg-card border-border hover:border-primary/30 hover:bg-secondary/50 text-foreground"
                )}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <MessageSquare className={cn("w-4 h-4 shrink-0", activeId === conv.id ? "text-primary" : "text-muted-foreground")} />
                  <div className="truncate">
                    <div className={cn("text-sm font-medium truncate", activeId === conv.id ? "text-foreground" : "")}>
                      {conv.title}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {format(new Date(conv.createdAt), "MMM d, h:mm a")}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive shrink-0"
                  onClick={(e) => handleDelete(e, conv.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            {!loadingConversations && conversations?.length === 0 && (
              <div className="text-center p-6 text-sm text-muted-foreground border border-dashed rounded-xl bg-card/50">
                No conversations yet. Start one to get advice!
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className="flex-1 bg-card border border-card-border/60 shadow-sm rounded-3xl overflow-hidden flex flex-col relative h-[500px] md:h-auto">
        {!activeId ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mb-6 shadow-inner">
              <Sparkles className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-2xl font-serif font-bold mb-2">Ask Ember</h2>
            <p className="text-muted-foreground max-w-sm mx-auto mb-8 font-light">
              I know your budget, your goals, and your spending habits. Ask me anything about your money.
            </p>
            <Button onClick={handleStartNew} size="lg" className="rounded-full px-8 shadow-lg shadow-primary/20">
              Start Chatting
            </Button>
          </div>
        ) : (
          <>
            <div className="p-4 border-b border-border bg-card/50 backdrop-blur flex justify-between items-center z-10 shrink-0">
              <div className="font-medium text-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                {activeConversation?.title || "Conversation"}
              </div>
            </div>
            
            <ScrollArea className="flex-1 p-4 md:p-6" ref={scrollAreaRef}>
              <div className="space-y-6 max-w-3xl mx-auto pb-4">
                {activeConversation?.messages?.map((msg, i) => (
                  <div key={msg.id || i} className={cn("flex w-full", msg.role === "user" ? "justify-end" : "justify-start")}>
                    <div className={cn("flex gap-3 max-w-[85%]", msg.role === "user" ? "flex-row-reverse" : "flex-row")}>
                      <div className={cn("w-8 h-8 rounded-full shrink-0 flex items-center justify-center mt-1 shadow-sm", 
                        msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground border border-border"
                      )}>
                        {msg.role === "user" ? <Flame className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                      </div>
                      <div className={cn(
                        "p-4 rounded-2xl text-sm leading-relaxed",
                        msg.role === "user" 
                          ? "bg-primary text-primary-foreground rounded-tr-sm" 
                          : "bg-secondary/50 text-foreground border border-border rounded-tl-sm whitespace-pre-wrap"
                      )}>
                        {msg.content}
                      </div>
                    </div>
                  </div>
                ))}
                
                {isStreaming && streamedContent && (
                  <div className="flex w-full justify-start">
                    <div className="flex gap-3 max-w-[85%] flex-row">
                      <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center mt-1 shadow-sm bg-secondary text-secondary-foreground border border-border">
                        <Bot className="w-4 h-4 text-primary animate-pulse" />
                      </div>
                      <div className="p-4 rounded-2xl text-sm leading-relaxed bg-secondary/50 text-foreground border border-primary/20 rounded-tl-sm whitespace-pre-wrap">
                        {streamedContent}
                        <span className="inline-block w-1.5 h-4 ml-1 bg-primary animate-pulse align-middle" />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <div className="p-4 bg-card/80 backdrop-blur border-t border-border shrink-0">
              <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto relative flex items-end gap-2">
                <div className="relative flex-1 bg-secondary/50 rounded-2xl border border-border focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/50 transition-all shadow-sm">
                  <Input
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Ask about your budget..."
                    className="border-0 bg-transparent shadow-none focus-visible:ring-0 px-4 py-6 text-base"
                    disabled={isStreaming}
                  />
                </div>
                <Button 
                  type="submit" 
                  size="icon" 
                  className="h-14 w-14 rounded-2xl shrink-0 shadow-sm"
                  disabled={!inputMessage.trim() || isStreaming}
                >
                  <Send className="w-5 h-5 ml-1" />
                </Button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}