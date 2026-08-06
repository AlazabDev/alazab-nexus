import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getSavedChats, loadSavedChat, deleteSavedChat } from "@/lib/chat-tools";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { MessageSquare, Trash2, Copy, Clock, RotateCcw, Search } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/ai-chat/history")({
  head: () => ({ meta: [{ title: "سجل المحادثات — Alazab PAOP" }] }),
  component: ChatHistory,
});

function ChatHistory() {
  const [chats, setChats] = useState<
    Array<{ id: string; savedDate: string; messageCount: number; preview: string }>
  >([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const allChats = getSavedChats();
    setChats(allChats);
    setLoading(false);
  }, []);

  const filteredChats = chats.filter(
    (chat) => chat.preview.includes(searchTerm) || chat.id.includes(searchTerm),
  );

  const handleDelete = (id: string) => {
    deleteSavedChat(id);
    setChats(chats.filter((c) => c.id !== id));
    toast.success("تم حذف المحادثة");
  };

  const handleLoad = (id: string) => {
    const messages = loadSavedChat(id);
    if (messages) {
      toast.success(`تم تحميل المحادثة (${messages.length} رسالة)`);
      // In a real app, you would navigate to the chat and load the messages
    } else {
      toast.error("فشل تحميل المحادثة");
    }
  };

  const handleCopy = (preview: string) => {
    navigator.clipboard.writeText(preview);
    toast.success("تم النسخ");
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return "للتو";
    if (diff < 3600) return `قبل ${Math.floor(diff / 60)} دقيقة`;
    if (diff < 86400) return `قبل ${Math.floor(diff / 3600)} ساعة`;
    if (diff < 604800) return `قبل ${Math.floor(diff / 86400)} أيام`;

    return date.toLocaleDateString("ar-SA");
  };

  return (
    <>
      <PageHeader
        icon={<MessageSquare className="size-5" />}
        title="سجل المحادثات"
        description="عرض واسترجاع المحادثات المحفوظة سابقاً"
      />

      <div className="max-w-3xl mx-auto p-4 space-y-4">
        {/* البحث */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="ابحث في المحادثات..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10"
          />
        </div>

        {/* الحالة */}
        {loading && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">جاري تحميل المحادثات...</p>
          </div>
        )}

        {!loading && filteredChats.length === 0 && (
          <div className="text-center py-12">
            <MessageSquare className="size-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">
              {chats.length === 0 ? "لا توجد محادثات محفوظة" : "لم يتم العثور على نتائج"}
            </p>
          </div>
        )}

        {/* قائمة المحادثات */}
        {!loading && filteredChats.length > 0 && (
          <div className="grid gap-3">
            {filteredChats.map((chat) => (
              <Card
                key={chat.id}
                className="p-4 hover:bg-secondary/50 transition-colors cursor-pointer group"
              >
                <div className="flex items-start justify-between gap-3">
                  {/* المعلومات */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare className="size-4 text-accent shrink-0" />
                      <p className="text-sm font-medium truncate">
                        {chat.preview || `محادثة - ${chat.id}`}
                      </p>
                      <Badge variant="secondary" className="text-xs">
                        {chat.messageCount} رسالة
                      </Badge>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" />
                        {formatDate(chat.savedDate)}
                      </span>
                      <span className="text-xs font-mono opacity-50">
                        {chat.id.substring(0, 12)}...
                      </span>
                    </div>
                  </div>

                  {/* الإجراءات */}
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={() => handleLoad(chat.id)}
                      title="تحميل المحادثة"
                    >
                      <RotateCcw className="size-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={() => handleCopy(chat.preview)}
                      title="نسخ النص"
                    >
                      <Copy className="size-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          title="حذف"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>حذف المحادثة</AlertDialogTitle>
                          <AlertDialogDescription>
                            هل أنت متأكد من رغبتك في حذف هذه المحادثة؟ لا يمكن التراجع عن هذا
                            الإجراء.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogAction
                          onClick={() => handleDelete(chat.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          حذف
                        </AlertDialogAction>
                        <AlertDialogCancel>إلغاء</AlertDialogCancel>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
