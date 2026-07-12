import { createFileRoute } from "@tanstack/react-router";
import { ReferenceTable } from "@/components/admin/reference-table";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/categories")({
  head: () => ({ meta: [{ title: "الفئات — لوحة الإدارة" }] }),
  component: () => (
    <ReferenceTable
      title="الفئات"
      description="إدارة تصنيفات المنتجات والخدمات"
      table="categories"
      searchField="name_ar"
      displayColumns={[
        { key: "name_ar", label: "الاسم (عربي)" },
        { key: "name_en", label: "الاسم (إنجليزي)" },
        { key: "code", label: "الكود" },
      ]}
      fields={[
        { name: "name_ar", label: "الاسم بالعربية", required: true },
        { name: "name_en", label: "الاسم بالإنجليزية" },
        { name: "code", label: "الكود" },
        {
          name: "parent_id",
          label: "الفئة الأب",
          type: "select",
          optionsQueryKey: "categories-parent",
          loadOptions: async () => {
            const { data } = await supabase
              .from("categories")
              .select("id,name_ar")
              .order("name_ar");
            return (data ?? []).map((c) => ({ value: c.id, label: c.name_ar }));
          },
        },
      ]}
    />
  ),
});
