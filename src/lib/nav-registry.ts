// Single source of truth for navigation labels, icons, and groups.
// Used by sidebar, command palette, breadcrumbs, and search.
import {
  LayoutDashboard,
  BarChart3,
  Bell,
  Package,
  Image,
  Copy,
  MessageCircle,
  Bot,
  FileText,
  DollarSign,
  Truck,
  Warehouse,
  MessageSquare,
  Upload,
  Download,
  Network,
  Sparkles,
  CheckCircle2,
  History,
  Settings,
  Wrench,
  Shield,
  Layers,
  GitBranch,
  Ruler,
  Users,
  Key,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  title: string;
  to: string;
  icon: LucideIcon;
  group: string;
  keywords?: string[];
  shortcut?: string;
}

export const NAV_ITEMS: NavItem[] = [
  // نظرة عامة
  {
    title: "لوحة التحكم",
    to: "/dashboard",
    icon: LayoutDashboard,
    group: "نظرة عامة",
    keywords: ["home", "dashboard", "رئيسي"],
    shortcut: "G D",
  },
  {
    title: "التحليلات",
    to: "/analytics",
    icon: BarChart3,
    group: "نظرة عامة",
    keywords: ["analytics", "تقارير"],
  },
  {
    title: "الإشعارات والنشاط",
    to: "/notifications",
    icon: Bell,
    group: "نظرة عامة",
    keywords: ["notifications", "activity"],
  },

  // البيانات
  {
    title: "المنتجات والخدمات",
    to: "/products",
    icon: Package,
    group: "البيانات",
    keywords: ["products", "items", "كتالوج"],
    shortcut: "G P",
  },
  {
    title: "إضافة منتج جديد",
    to: "/products/new",
    icon: Package,
    group: "البيانات",
    keywords: ["new", "create", "إنشاء"],
  },
  {
    title: "إدارة الأصول",
    to: "/assets",
    icon: Image,
    group: "البيانات",
    keywords: ["assets", "media", "صور"],
  },
  {
    title: "لوحة تحكم المنتجات",
    to: "/products/dashboard",
    icon: BarChart3,
    group: "البيانات",
    keywords: ["products dashboard", "إحصائيات"],
  },
  { title: "أصول غير مرتبطة", to: "/assets/unlinked", icon: Copy, group: "البيانات" },
  { title: "أصول مكررة", to: "/assets/duplicates", icon: Copy, group: "البيانات" },
  { title: "رفع جماعي للأصول", to: "/assets/bulk-upload", icon: Upload, group: "البيانات" },
  { title: "وكيل الدعم", to: "/support", icon: MessageCircle, group: "البيانات" },
  { title: "إدارة المحتوى", to: "/content", icon: FileText, group: "البيانات" },

  // التسعير
  { title: "محرك التسعير", to: "/pricing", icon: DollarSign, group: "التسعير والموردين" },
  { title: "الموردون", to: "/suppliers", icon: Truck, group: "التسعير والموردين", shortcut: "G S" },
  {
    title: "مخزون الموردين",
    to: "/supplier-inventory",
    icon: Warehouse,
    group: "التسعير والموردين",
  },

  // الطلبات
  { title: "طلبات المنتجات", to: "/requests", icon: MessageSquare, group: "الطلبات" },
  { title: "طلبات العروض", to: "/quote-requests", icon: FileText, group: "الطلبات" },
  { title: "طلبات التصنيع", to: "/manufacturing-orders", icon: Package, group: "الطلبات" },

  // العمليات
  { title: "سجل التدقيق", to: "/audit-logs", icon: History, group: "العمليات" },
  { title: "مراجعة التكرار", to: "/duplicates", icon: Copy, group: "العمليات" },
  { title: "مركز الاستيراد", to: "/import", icon: Upload, group: "العمليات" },
  { title: "مركز التصدير", to: "/export", icon: Download, group: "العمليات" },
  { title: "مركز API", to: "/api-center", icon: Network, group: "العمليات" },
  { title: "التكاملات والتوصيلات", to: "/integrations", icon: Network, group: "العمليات" },
  { title: "مراجعة المحتوى AI", to: "/content-review", icon: Sparkles, group: "العمليات" },
  { title: "مساعد AI", to: "/ai-review", icon: Sparkles, group: "العمليات" },
  {
    title: "استوديو AI",
    to: "/ai-studio",
    icon: Sparkles,
    group: "العمليات",
    keywords: ["ai studio", "استوديو"],
  },
  {
    title: "Azure AI · ضبط جماعي",
    to: "/ai-studio/bulk",
    icon: Sparkles,
    group: "العمليات",
    keywords: ["azure", "bulk", "optimize", "تحسين"],
  },
  { title: "تحسين المحتوى AI", to: "/ai-studio/optimize", icon: Sparkles, group: "العمليات" },
  { title: "توليد الصور AI", to: "/ai-studio/images", icon: Image, group: "العمليات" },
  { title: "أوراق البيانات AI", to: "/ai-studio/datasheets", icon: FileText, group: "العمليات" },
  { title: "عروض الأسعار AI", to: "/ai-studio/quotes", icon: DollarSign, group: "العمليات" },
  {
    title: "وكيل المنتجات",
    to: "/product-agent",
    icon: Bot,
    group: "العمليات",
    keywords: ["agent", "وكيل", "foundry", "az-agent-prod"],
  },
  {
    title: "محادثة AI",
    to: "/ai-chat",
    icon: MessageCircle,
    group: "العمليات",
    keywords: ["chat", "محادثة"],
  },
  { title: "سجل المحادثات", to: "/ai-chat/history", icon: History, group: "العمليات" },
  { title: "الموافقات", to: "/approvals", icon: CheckCircle2, group: "العمليات" },

  // النظام
  { title: "Build Health", to: "/build-health", icon: Wrench, group: "النظام" },
  {
    title: "لوحة الإدارة",
    to: "/admin",
    icon: Shield,
    group: "النظام",
    keywords: ["admin", "إدارة"],
    shortcut: "G A",
  },
  {
    title: "المستخدمون والأدوار",
    to: "/admin/users",
    icon: Users,
    group: "النظام",
    keywords: ["users", "roles"],
  },
  { title: "مفاتيح API", to: "/admin/api-keys", icon: Key, group: "النظام" },
  { title: "الفئات", to: "/admin/categories", icon: Layers, group: "النظام" },
  { title: "العائلات", to: "/admin/families", icon: GitBranch, group: "النظام" },
  { title: "الوحدات", to: "/admin/units", icon: Ruler, group: "النظام" },
  { title: "الإعدادات", to: "/settings", icon: Settings, group: "النظام", shortcut: "G ," },
];

// Map from route prefix → label (for breadcrumbs).
export const ROUTE_LABELS: Record<string, string> = Object.fromEntries(
  NAV_ITEMS.map((i) => [i.to, i.title]),
);

// Extra static labels for nested segments
Object.assign(ROUTE_LABELS, {
  "/products/new": "إضافة منتج",
  "/assets/unlinked": "غير مرتبطة",
  "/assets/bulk-upload": "رفع جماعي",
  "/assets/duplicates": "مكررة",
  "/products/dashboard": "لوحة المنتجات",
  "/ai-chat/history": "السجل",
});

export function getBreadcrumbs(pathname: string): { label: string; to: string }[] {
  const segs = pathname.split("/").filter(Boolean);
  const crumbs: { label: string; to: string }[] = [];
  let acc = "";
  for (const seg of segs) {
    acc += "/" + seg;
    const label =
      ROUTE_LABELS[acc] || (seg.startsWith("$") || /^[a-f0-9-]{20,}$/i.test(seg) ? "تفاصيل" : seg);
    crumbs.push({ label, to: acc });
  }
  return crumbs;
}
