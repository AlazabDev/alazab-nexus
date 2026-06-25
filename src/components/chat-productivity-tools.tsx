import { useState } from "react";
import { ChatMessage } from "@/lib/chat-tools";
import {
  exportChatToJSON,
  exportChatToCSV,
  copyToClipboard,
  generateAnalytics,
  saveChatHistory,
} from "@/lib/chat-tools";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Download,
  Copy,
  BarChart3,
  Save,
  FileJson,
  FileText,
  TrendingUp,
  MessageSquare,
  Clock,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";

interface ChatProductivityToolsProps {
  messages: ChatMessage[];
  conversationId?: string;
  onSave?: (id: string) => void;
}

export function ChatProductivityTools({
  messages,
  conversationId,
  onSave,
}: ChatProductivityToolsProps) {
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveName, setSaveName] = useState("");

  if (messages.length === 0) {
    return null;
  }

  const handleExportJSON = () => {
    const filename =
      `chat-${new Date().toISOString().split("T")[0]}.json`;
    exportChatToJSON(messages, filename);
    toast.success("تم تصدير المحادثة كـ JSON");
  };

  const handleExportCSV = () => {
    const filename =
      `chat-${new Date().toISOString().split("T")[0]}.csv`;
    exportChatToCSV(messages, filename);
    toast.success("تم تصدير المحادثة كـ CSV");
  };

  const handleCopy = async () => {
    const success = await copyToClipboard(messages);
    if (success) {
      toast.success("تم نسخ المحادثة إلى الحافظة");
    } else {
      toast.error("فشل النسخ");
    }
  };

  const handleSaveChat = () => {
    const id = saveName || `chat-${Date.now()}`;
    saveChatHistory(id, messages);
    onSave?.(id);
    setShowSaveDialog(false);
    setSaveName("");
    toast.success("تم حفظ المحادثة بنجاح");
  };

  const analytics = generateAnalytics(messages);

  return (
    <>
      {/* Main Tools Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            variant="outline"
            className="gap-1 text-xs h-8"
          >
            <BarChart3 className="size-3.5" />
            الأدوات
            <ChevronDown className="size-3 ml-[-0.25rem]" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {/* Export Section */}
          <DropdownMenuLabel className="text-xs">
            تصدير
          </DropdownMenuLabel>
          <DropdownMenuItem onClick={handleExportJSON}>
            <FileJson className="size-3.5 mr-2" />
            تصدير كـ JSON
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleExportCSV}>
            <FileText className="size-3.5 mr-2" />
            تصدير كـ CSV
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleCopy}>
            <Copy className="size-3.5 mr-2" />
            نسخ النص
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Analytics Section */}
          <DropdownMenuLabel className="text-xs">
            تحليلات
          </DropdownMenuLabel>
          <DropdownMenuItem onClick={() => setShowAnalytics(true)}>
            <TrendingUp className="size-3.5 mr-2" />
            عرض الإحصائيات
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Save Section */}
          <DropdownMenuLabel className="text-xs">
            حفظ
          </DropdownMenuLabel>
          <DropdownMenuItem onClick={() => setShowSaveDialog(true)}>
            <Save className="size-3.5 mr-2" />
            حفظ المحادثة
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Analytics Dialog */}
      <Dialog open={showAnalytics} onOpenChange={setShowAnalytics}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>إحصائيات المحادثة</DialogTitle>
            <DialogDescription>
              تحليل تفصيلي لمحادثتك
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Message Statistics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-secondary/50 rounded-lg p-3">
                <div className="flex items-center gap-1 mb-1">
                  <MessageSquare className="size-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    إجمالي الرسائل
                  </span>
                </div>
                <p className="text-lg font-bold">
                  {analytics.totalMessages}
                </p>
              </div>

              <div className="bg-secondary/50 rounded-lg p-3">
                <div className="flex items-center gap-1 mb-1">
                  <Clock className="size-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    المدة
                  </span>
                </div>
                <p className="text-lg font-bold">
                  {analytics.conversationDuration}
                </p>
              </div>

              <div className="bg-secondary/50 rounded-lg p-3">
                <div className="text-xs text-muted-foreground mb-1">
                  رسائل المستخدم
                </div>
                <p className="text-lg font-bold">
                  {analytics.userMessages}
                </p>
              </div>

              <div className="bg-secondary/50 rounded-lg p-3">
                <div className="text-xs text-muted-foreground mb-1">
                  ردود المساعد
                </div>
                <p className="text-lg font-bold">
                  {analytics.assistantMessages}
                </p>
              </div>
            </div>

            {/* Average Lengths */}
            <div className="space-y-2">
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  متوسط طول رسالة المستخدم
                </p>
                <p className="text-sm font-medium">
                  {analytics.averageUserLength} حرف
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  متوسط طول رد المساعد
                </p>
                <p className="text-sm font-medium">
                  {analytics.averageAssistantLength} حرف
                </p>
              </div>
            </div>

            {/* Top Keywords */}
            {analytics.topKeywords.length > 0 && (
              <div>
                <p className="text-xs font-semibold mb-2">
                  الكلمات الرئيسية
                </p>
                <div className="flex flex-wrap gap-2">
                  {analytics.topKeywords.map((kw) => (
                    <Badge
                      key={kw.word}
                      variant="secondary"
                      className="text-xs"
                    >
                      {kw.word} ({kw.count})
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Save Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>حفظ المحادثة</DialogTitle>
            <DialogDescription>
              أعط اسماً لهذه المحادثة (اختياري)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Input
              placeholder="اسم المحادثة..."
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSaveChat();
                }
              }}
            />

            <div className="bg-secondary/50 rounded p-3 text-xs space-y-1">
              <p>
                <strong>سيتم حفظ:</strong>
              </p>
              <p>{analytics.totalMessages} رسالة</p>
              <p>
                من {analytics.userMessages} مستخدم و{" "}
                {analytics.assistantMessages} مساعد
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleSaveChat}
                className="flex-1"
                size="sm"
              >
                <Save className="size-3.5 mr-1" />
                حفظ
              </Button>
              <Button
                onClick={() => setShowSaveDialog(false)}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                إلغاء
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
