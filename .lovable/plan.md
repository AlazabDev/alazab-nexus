## تشخيص الحالة

فحص `tsc --noEmit` يكشف **~60 خطأ** موزعة على 23 ملف، السبب الرئيسي:

### 1. جداول مفقودة في قاعدة البيانات (13 جدول)
الكود يستدعي جداول غير موجودة في schema:
- `product_requests` (طلبات منتجات جديدة)
- `pricing_rules` (قواعد التسعير الذكي)
- `integration_configs` (إعدادات التكاملات الخارجية)
- `manufacturing_orders` (أوامر التصنيع)
- `quote_requests` + `api_quotes` (طلبات وعروض الأسعار)
- `material_requisitions` + `material_requisition_items` (طلبات المواد)
- `ai_audit_logs` + `ai_optimization_jobs` + `ai_optimization_logs` (سجلات وكلاء AI)
- `product_datasheets` (دفاتر مواصفات منتجات)
- `chatbot_interactions` (سجل محادثات الدعم)

### 2. أخطاء صياغة بسيطة
- 5 ملفات في `ai-studio/` تستخدم `preload: 'intent'` بدلاً من `boolean`
- `integrations.tsx` كان به وسم `</a>` بدلاً من `</Link>` (أصلحته)

### 3. أخطاء تابعة
كل الأخطاء الأخرى (column not exist, property not exist) ناتجة عن غياب الجداول الـ13 — ستزول تلقائياً بعد المايجريشن.

---

## الخطة

### مرحلة 1 — إنشاء الجداول الـ13 (Migration واحد)
- إنشاء كل الجداول بأعمدتها المستخدمة فعلياً في الكود
- إضافة GRANT لكل جدول للأدوار `authenticated` + `service_role`
- تفعيل RLS مع سياسات قائمة على `has_role()` (admin/editor) و `is_authorized()` للقراءة
- العلاقات (foreign keys) للمنتجات والموردين عند الحاجة

### مرحلة 2 — إصلاح صياغة الكود
- إزالة `preload: 'intent'` من 5 ملفات ai-studio (الـpreload العام مضبوط في الراوتر)
- تعديل أي `meta.title` خاطئ

### مرحلة 3 — تحديث `types.ts`
يتجدد تلقائياً بعد المايجريشن، ما يحل كل أخطاء الأعمدة.

### مرحلة 4 — التحقق
- إعادة تشغيل `tsc --noEmit` يجب أن تعطي **0 أخطاء**
- تحديث `src/data/build-health.json` عبر `bun scripts/build-health.ts`
- تشغيل `supabase--linter` للتأكد من سلامة RLS

---

## ملاحظات

- لا تغييرات على واجهة الاستخدام — العمل بحت في قاعدة البيانات وأخطاء صياغة
- المايجريشن سيُعرض عليك للموافقة قبل التطبيق
- لن أمس الجداول الموجودة (products, suppliers, prices, ...) إطلاقاً
- بعد الإصلاح سيكون المشروع جاهز للنشر بدون أخطاء بناء

هل أبدأ بكتابة المايجريشن وتطبيق الإصلاحات؟