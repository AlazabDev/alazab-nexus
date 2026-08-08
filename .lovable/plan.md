# خطة تطوير وجهات إعدادات المنتجات والكتالوج العام

## الهدف
ربط جميع المنتجات بالدومين العام، وإنشاء كتالوجات أعمال مخصصة، وصفحات وصف احترافية، مع وجهات إدارية منفصلة للمشرف فقط. كل ما سبق يعرض بدون مصادقة للزوار.

## المشاكل الحالية المراد حلها
- تعقيد الواجهة الإدارية للمنتجات.
- حقول ناقصة في صفحات العرض العام.
- تداخل في التصميم (sticky headers، مسافات، أزرار مكررة).
- عدم وجود "كتالوجات أعمال" منظمة لعرض مجموعات منتجات.

## الأقسام والوجهات الجديدة

### 1. قاعدة البيانات

#### جدول `product_catalogs`
يخزن الكتالوجات العامة والتجارية.

```sql
CREATE TABLE public.product_catalogs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title_ar text NOT NULL,
  title_en text,
  description_ar text,
  description_en text,
  cover_image_url text,
  is_public boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
```

#### جدول `catalog_items`
يربط المنتجات بالكتالوجات مع ترتيب ودور.

```sql
CREATE TABLE public.catalog_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_id uuid NOT NULL REFERENCES public.product_catalogs(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  featured boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (catalog_id, product_id)
);
```

#### View `public_catalog_products`
للقراءة العامة الآمنة من الكتالوج، يعرض فقط المنتجات المعتمدة (`approved`) والأعمدة الآمنة.

```sql
CREATE OR REPLACE VIEW public.public_catalog_products AS
SELECT
  id, az_code, name_ar, name_en, short_description_ar, short_description_en,
  description_ar, description_en, brand, item_type, unit_id, category_id, family_id,
  gpc_class, gpc_family, gpc_segment, gpc_brick_title, operational_track,
  unit_price, estimated_price, main_image_url, image_url_2, image_url_3,
  specifications, materials, price, buy_price, stock_balance, track_stock,
  status, created_at, updated_at
FROM public.products
WHERE status = 'approved';
```

### 2. الوجهات العامة (بدون تسجيل دخول)

#### `/catalog`
- إعادة تصميم الصفحة الحالية باستخدام tokens التصميم الرسمية بدلاً من الألوان الثابتة.
- إضافة قسم "كتالوجات الأعمال" في الأعلى.
- تحسين الفلاتر: نوع البند، الفئة، العلامة التجارية، السعر، النص.
- حفظ حالة الفلاتر والترقيم في URL.
- تحسين بطاقات المنتج (صورة، سعر، نوع، كود).

#### `/catalog/$azCode`
- تحسين صفحة تفاصيل المنتج.
- إضافة معرض صور كامل (main + 3 صور إضافية).
- إضافة تبويبات: الوصف / المواصفات / الاستخدامات / المنتجات ذات الصلة.
- إضافة زر "طلب عرض سعر" (يرسل إلى `/quote-requests` العامة).
- إضافة بيانات منظمة JSON-LD للـ SEO.
- تحسين QR code وإضافة مشاركة WhatsApp.

#### `/catalogs/$slug`
صفحة كتالوج عمل واحد تعرض:
- غلاف الكتالوج والوصف.
- شبكة المنتجات المرتبطة مرتبة حسب `sort_order`.
- زر مشاركة الكتالوج.

### 3. الوجهات الإدارية (للمشرف فقط)

#### `/admin/catalogs`
- قائمة الكتالوجات مع البحث والفلترة.
- إنشاء / تعديل / حذف كتالوج.
- رفع صورة الغلاف.

#### `/admin/catalogs/$slug`
- تفاصيل الكتالوج.
- إضافة/إزالة منتجات من الكتالوج.
- ترتيب المنتجات بالسحب والإفلات.
- تحديد المنتجات المميزة (`featured`).

#### `/admin/products/settings`
- صفحة إعدادات المنتجات المركزية:
  - الحقول الافتراضية للمنتج الجديد.
  - تفعيل/تعطيل تتبع المخزون.
  - آلية توليد AZ Code.
  - إعدادات العرض العام (الحقول الظاهرة للزوار).

### 4. تحسينات التصميم

- استخدام `PageHeader` الموحد في كل الوجهات الإدارية.
- إزالة الألوان الثابتة من الكتالوج العام واستبدالها بـ tokens CSS.
- إصلاح التداخل بين الـ sticky header والمحتوى.
- توحيد المسافات والبطاقات.
- تحسين تجربة الجوال.

### 5. SEO وربط الدومين

- إضافة `head()` لكل وجهة عامة بعناوين ووصف فريد.
- إضافة `og:image` لكل منتج وكل كتالوج.
- JSON-LD للمنتج (`Product`) والكتالوج (`ItemList`).
- توجيه المستخدم لربط الدومين `products.alazab.com` عبر Lovable Domains.

## المخرجات المتوقعة
1. وجهات عامة احترافية: `/catalog`، `/catalog/$azCode`، `/catalogs/$slug`.
2. وجهات إدارية: `/admin/catalogs`، `/admin/catalogs/$slug`، `/admin/products/settings`.
3. جداول قاعدة بيانات جديدة مع RLS مناسب.
4. تحسين SEO ودعم المشاركة.
5. تصميم متجاوب خالٍ من التعارضات.

## ملاحظات تنفيذية
- كل القراءات العامة تمر عبر `public_catalog_products` View.
- الكتالوجات العامة تُدار بواسطة `admin` فقط باستخدام `has_role`.
- لا يُنشأ Edge Functions جديد؛ يتم استخدام `createServerFn` للمنطق الداخلي.
