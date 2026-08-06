/**
 * Chat Productivity Tools
 * Tools for exporting, translating, summarizing, and analyzing chat conversations
 */

import { supabase } from "@/integrations/supabase/client";
import { translateChatText, summarizeConversation } from "@/lib/chat-ai.functions";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp?: Date;
}

/**
 * Export chat to JSON format
 */
export function exportChatToJSON(
  messages: ChatMessage[],
  filename: string = "chat-export.json",
): void {
  const data = {
    exportDate: new Date().toISOString(),
    messageCount: messages.length,
    messages: messages.map((m) => ({
      ...m,
      timestamp: m.timestamp?.toISOString(),
    })),
  };

  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  downloadFile(blob, filename);
}

/**
 * Export chat to CSV format
 */
export function exportChatToCSV(
  messages: ChatMessage[],
  filename: string = "chat-export.csv",
): void {
  const headers = ["الدور", "الرسالة", "الوقت"];
  const rows = messages.map((m) => [
    m.role === "user" ? "مستخدم" : "مساعد",
    `"${m.content.replace(/"/g, '""')}"`, // Escape quotes
    m.timestamp?.toLocaleString("ar-SA") || "",
  ]);

  const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  downloadFile(blob, filename);
}

/**
 * Copy chat content to clipboard
 */
export async function copyToClipboard(messages: ChatMessage[]): Promise<boolean> {
  try {
    const text = messages
      .map((m) => `${m.role === "user" ? "أنت" : "المساعد"}: ${m.content}`)
      .join("\n\n");

    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Save chat to browser storage
 */
export function saveChatHistory(conversationId: string, messages: ChatMessage[]): void {
  try {
    const data = {
      id: conversationId,
      savedDate: new Date().toISOString(),
      messages,
    };

    const existing = JSON.parse(localStorage.getItem("chat_history") || "[]");
    const updated = existing.filter((c: any) => c.id !== conversationId);
    updated.push(data);

    // Keep only last 50 conversations
    if (updated.length > 50) {
      updated.shift();
    }

    localStorage.setItem("chat_history", JSON.stringify(updated));
    console.log(`[v0] Chat saved: ${conversationId}`);
  } catch (error) {
    console.error("[v0] Failed to save chat:", error);
  }
}

/**
 * Retrieve saved chat history
 */
export function getSavedChats(): Array<{
  id: string;
  savedDate: string;
  messageCount: number;
  preview: string;
}> {
  try {
    const data = JSON.parse(localStorage.getItem("chat_history") || "[]");
    return data.map((chat: any) => ({
      id: chat.id,
      savedDate: chat.savedDate,
      messageCount: chat.messages.length,
      preview: chat.messages[0]?.content.substring(0, 50) || "",
    }));
  } catch {
    return [];
  }
}

/**
 * Load a specific saved chat
 */
export function loadSavedChat(conversationId: string): ChatMessage[] | null {
  try {
    const data = JSON.parse(localStorage.getItem("chat_history") || "[]");
    const chat = data.find((c: any) => c.id === conversationId);
    return chat?.messages || null;
  } catch {
    return null;
  }
}

/**
 * Delete a saved chat
 */
export function deleteSavedChat(conversationId: string): void {
  try {
    const data = JSON.parse(localStorage.getItem("chat_history") || "[]");
    const updated = data.filter((c: any) => c.id !== conversationId);
    localStorage.setItem("chat_history", JSON.stringify(updated));
  } catch {
    console.error("[v0] Failed to delete chat");
  }
}

/**
 * Generate analytics for the conversation
 */
export function generateAnalytics(messages: ChatMessage[]): {
  totalMessages: number;
  userMessages: number;
  assistantMessages: number;
  averageUserLength: number;
  averageAssistantLength: number;
  topKeywords: Array<{ word: string; count: number }>;
  conversationDuration: string;
} {
  const userMessages = messages.filter((m) => m.role === "user");
  const assistantMessages = messages.filter((m) => m.role === "assistant");

  const userLength =
    userMessages.reduce((sum, m) => sum + m.content.length, 0) / (userMessages.length || 1) || 0;
  const assistantLength =
    assistantMessages.reduce((sum, m) => sum + m.content.length, 0) /
      (assistantMessages.length || 1) || 0;

  // Extract keywords (simple approach)
  const allText = messages
    .map((m) => m.content)
    .join(" ")
    .toLowerCase();
  const words =
    allText
      .match(/\b\w+\b/g)
      ?.filter(
        (w) => w.length > 3 && !["من", "إلى", "في", "هذا", "أن", "لا", "نعم", "يا"].includes(w),
      ) || [];

  const wordFreq: Record<string, number> = {};
  words.forEach((w) => {
    wordFreq[w] = (wordFreq[w] || 0) + 1;
  });

  const topKeywords = Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word, count]) => ({ word, count }));

  const duration =
    messages.length > 0 && messages[0].timestamp && messages[messages.length - 1].timestamp
      ? formatDuration(
          messages[messages.length - 1].timestamp!.getTime() - messages[0].timestamp!.getTime(),
        )
      : "غير معروف";

  return {
    totalMessages: messages.length,
    userMessages: userMessages.length,
    assistantMessages: assistantMessages.length,
    averageUserLength: Math.round(userLength),
    averageAssistantLength: Math.round(assistantLength),
    topKeywords,
    conversationDuration: duration,
  };
}

/**
 * Generate smart suggestions based on conversation
 */
export function generateSmartSuggestions(messages: ChatMessage[]): string[] {
  const suggestions: string[] = [];

  if (messages.length === 0) {
    return ["ابدأ بسؤال عن المنتجات", "اطلب توصيات", "اسأل عن الأسعار"];
  }

  const lastMessage = messages[messages.length - 1];

  // Check message content for context
  if (lastMessage.role === "assistant" && lastMessage.content.includes("منتج")) {
    suggestions.push("اطلب المزيد من التفاصيل");
    suggestions.push("اسأل عن السعر");
    suggestions.push("هل هناك منتجات بديلة؟");
  }

  if (lastMessage.content.includes("سعر") || lastMessage.content.includes("تسعير")) {
    suggestions.push("اطلب مقارنة الأسعار");
    suggestions.push("هل هناك خصومات؟");
    suggestions.push("ما أفضل قيمة؟");
  }

  if (messages.length > 5) {
    suggestions.push("لخص المحادثة حتى الآن");
    suggestions.push("احفظ هذه المحادثة");
  }

  return suggestions.slice(0, 3);
}

/**
 * Format duration in milliseconds to readable string
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) return `${hours} س و ${minutes % 60} د`;
  if (minutes > 0) return `${minutes} د و ${seconds % 60} ث`;
  return `${seconds} ثانية`;
}

/**
 * Helper function to download files
 */
function downloadFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Translate text through the server (Azure OpenAI, Lovable AI fallback).
 */
export async function translateContent(
  text: string,
  targetLanguage: "en" | "fr" | "ar" = "en",
): Promise<string> {
  if (!text.trim()) return text;
  try {
    const res = await translateChatText({ data: { text, target: targetLanguage } });
    return res.text;
  } catch (error) {
    console.error("Translation failed:", error);
    throw error instanceof Error ? error : new Error("فشلت الترجمة");
  }
}

/**
 * Generate a real conversation summary through the server.
 */
export async function getConversationSummary(messages: ChatMessage[]): Promise<string> {
  if (!messages.length) return "لا توجد رسائل للتلخيص.";
  try {
    const res = await summarizeConversation({
      data: { messages: messages.map((m) => ({ role: m.role, content: m.content })) },
    });
    return res.summary;
  } catch (error) {
    console.error("Summary generation failed:", error);
    throw error instanceof Error ? error : new Error("فشل إنشاء الملخص");
  }
}

export default {
  exportChatToJSON,
  exportChatToCSV,
  copyToClipboard,
  saveChatHistory,
  getSavedChats,
  loadSavedChat,
  deleteSavedChat,
  generateAnalytics,
  generateSmartSuggestions,
  translateContent,
  getConversationSummary,
};
