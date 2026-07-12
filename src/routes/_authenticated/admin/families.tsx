import { createFileRoute } from "@tanstack/react-router";
import { ReferenceTable } from "@/components/admin/reference-table";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/families")({
  head: () => ({ meta: [{ title: "العائلات — لوحة الإدارة" }] }),
  component: () => (
    <ReferenceTable
      title="عائلات المنتجات"
      description="إدارة عائلات المنتجات وربطها بالفئات"
      table="families"
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
          name: "category_id",
          label: "الفئة",
          type: "select",
          optionsQueryKey: "families-categories",
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
