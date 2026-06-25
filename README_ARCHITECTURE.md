# AzProud - معمارية النظام

## الملفات الأساسية

### مكتبات الوظائف
- `src/lib/upload-assets.ts` - تحميل ومزامنة الملفات
- `src/lib/connection-checker.ts` - مراقبة اتصال Azure OpenAI
- `src/lib/chat-tools.ts` - أدوات معالجة المحادثات (تصدير، حفظ، إحصائيات)
- `src/lib/integration-handler.ts` - إدارة التكاملات الخارجية
- `src/lib/ai-assistant.ts` - تكامل Azure OpenAI

### مكونات واجهة المستخدم
- `src/components/asset-upload-zone.tsx` - منطقة تحميل الملفات مع معاينة
- `src/components/connection-status-indicator.tsx` - مؤشر حالة الاتصال
- `src/components/chat-productivity-tools.tsx` - أدوات الإنتاجية (تصدير، حفظ)
- `src/components/chat-smart-suggestions.tsx` - الاقتراحات الذكية
- `src/components/integration-sync-monitor.tsx` - مراقب مزامنة التكاملات
- `src/components/products-data-table.tsx` - جدول البيانات المتقدم

### الصفحات
- `src/routes/_authenticated/ai-chat.tsx` - صفحة الدردشة الرئيسية
- `src/routes/_authenticated/ai-chat/history.tsx` - سجل المحادثات
- `src/routes/_authenticated/products/dashboard.tsx` - لوحة معلومات المنتجات
- `src/routes/_authenticated/products/index.tsx` - صفحة المنتجات
- `src/routes/_authenticated/integrations.tsx` - صفحة التكاملات

## الميزات الرئيسية

### 1. تحميل الملفات المحسّن
- معاينة فورية للصور
- التحقق من النوع والحجم
- إعادة محاولة ذكية (حتى 3 مرات)
- سجل تفصيلي للعمليات

### 2. مؤشرات الاتصال
- مراقبة حية لـ Azure OpenAI
- قياس المؤخرة والتوفر
- ألوان ديناميكية (أخضر/أصفر/أحمر)
- popup بتفاصيل كاملة

### 3. أدوات الإنتاجية
- تصدير JSON و CSV
- حفظ واسترجاع محادثات
- إحصائيات شاملة
- استخراج كلمات رئيسية

### 4. إدارة التكاملات
- مزامنة البيانات التلقائية
- اختبار الاتصال الفوري
- توصيات ذكية للإصلاح
- سجل العمليات الكامل

### 5. لوحات المعلومات
- إحصائيات المنتجات
- رسوم بيانية تفاعلية
- جداول بحث وتصفية متقدمة

## البنية التقنية

```
Data Flow:
User Input → Validation → Processing → Storage/API → Response → UI Update
     ↓           ↓            ↓          ↓         ↓       ↓
  Chat/Form  Type Check   Azure/DB  Supabase  Format  Components
```

## الأداء

- استجابة فورية (< 100ms للعمليات المحلية)
- مزامنة في الخلفية للعمليات الثقيلة
- تخزين محلي آمن للمحادثات
- ترقيم ذكي للصفحات

## الأمان

- تحقق من النوع والحجم قبل الرفع
- تشفير البيانات المحفوظة محلياً
- معالجة آمنة للأخطاء
- تحقق من الأذونات

## الدعم اللغوي

- دعم عربي 100% (RTL, تاريخ عربي)
- أسماء متغيرات إنجليزية (معيار)
- رسائل الخطأ بالعربية
