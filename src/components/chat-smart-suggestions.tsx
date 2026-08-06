import { useState } from "react";
import { generateSmartSuggestions, ChatMessage } from "@/lib/chat-tools";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, ChevronDown, ChevronUp } from "lucide-react";

interface ChatSmartSuggestionsProps {
  messages: ChatMessage[];
  onSuggestionClick: (suggestion: string) => void;
}

export function ChatSmartSuggestions({ messages, onSuggestionClick }: ChatSmartSuggestionsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const suggestions = generateSmartSuggestions(messages);

  if (suggestions.length === 0 || messages.length === 0) {
    return null;
  }

  return (
    <div className="px-4 py-2 border-t border-border/50 space-y-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <Lightbulb className="size-3.5 text-yellow-600" />
        الاقتراحات الذكية
        {isExpanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
      </button>

      {isExpanded && (
        <div className="flex flex-wrap gap-2">
          {suggestions.map((suggestion, idx) => (
            <Button
              key={idx}
              onClick={() => {
                onSuggestionClick(suggestion);
                setIsExpanded(false);
              }}
              size="sm"
              variant="outline"
              className="text-xs h-7 px-2"
            >
              {suggestion}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
