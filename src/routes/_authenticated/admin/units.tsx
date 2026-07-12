import { createFileRoute } from "@tanstack/react-router";
import { ReferenceTable } from "@/components/admin/reference-table";

export const Route = createFileRoute("/_authenticated/admin/units")({
  head: () => ({ meta: [{ title: "الوحدات — لوحة الإدارة" }] }),
  component: () => (
    <ReferenceTable
      title="وحدات القياس"
      description="إدارة وحدات القياس المستخدمة في الكتالوج"
      table="units"
      searchField="name"
      displayColumns={[
        { key: "name", label: "الاسم" },
        { key: "code", label: "الكود" },
        { key: "description", label: "الوصف" },
      ]}
      fields={[
        { name: "name", label: "الاسم", required: true },
        { name: "code", label: "الكود", required: true },
        { name: "description", label: "الوصف" },
      ]}
    />
  ),
});
