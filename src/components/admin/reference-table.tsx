import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { useUserRole } from "@/lib/auth";

export interface FieldDef {
  name: string;
  label: string;
  required?: boolean;
  type?: "text" | "select";
  optionsQueryKey?: string;
  loadOptions?: () => Promise<{ value: string; label: string }[]>;
}

interface Props {
  title: string;
  description?: string;
  // Restricted to the reference tables this component supports so Supabase typings resolve.
  table: "categories" | "families" | "units";
  fields: FieldDef[];
  displayColumns: { key: string; label: string }[];
  searchField?: string;
  orderBy?: string;
}

export function ReferenceTable({
  title,
  description,
  table,
  fields,
  displayColumns,
  searchField = "name_ar",
  orderBy = "created_at",
}: Props) {
  const role = useUserRole();
  const canEdit = role === "admin" || role === "editor";
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<Record<string, any>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["ref", table, search],
    queryFn: async () => {
      let q = supabase.from(table).select("*").order(orderBy, { ascending: false }).limit(500);
      if (search) q = q.ilike(searchField, `%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (payload: Record<string, any>) => {
      const clean: Record<string, any> = {};
      for (const f of fields) {
        clean[f.name] = payload[f.name] === "" ? null : payload[f.name];
      }
      if (editing?.id) {
        const { error } = await supabase.from(table).update(clean).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(table).insert(clean as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ref", table] });
      qc.invalidateQueries({ queryKey: ["admin-count", table] });
      toast.success(editing ? "تم التحديث" : "تم الإنشاء");
      setOpen(false);
      setEditing(null);
      setForm({});
    },
    onError: (e: any) => toast.error(e?.message || "حدث خطأ"),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ref", table] });
      qc.invalidateQueries({ queryKey: ["admin-count", table] });
      toast.success("تم الحذف");
    },
    onError: (e: any) => toast.error(e?.message || "فشل الحذف"),
  });

  const openNew = () => {
    setEditing(null);
    setForm({});
    setOpen(true);
  };
  const openEdit = (row: any) => {
    setEditing(row);
    setForm({ ...row });
    setOpen(true);
  };

  return (
    <div className="p-6 space-y-4 max-w-[1200px]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
        </div>
        {canEdit && (
          <Button onClick={openNew}>
            <Plus className="size-4 ml-1" />
            إضافة جديد
          </Button>
        )}
      </div>

      <Card className="p-3 surface-elevated border-0">
        <div className="relative mb-3">
          <Search className="absolute right-2 top-2.5 size-4 text-muted-foreground" />
          <Input
            className="pr-8"
            placeholder="بحث..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {isLoading && <div className="text-center text-muted-foreground py-8">جاري التحميل...</div>}
        {!isLoading && data?.length === 0 && (
          <div className="text-center text-muted-foreground py-8">لا توجد سجلات</div>
        )}

        <div className="divide-y">
          {data?.map((row) => (
            <div key={row.id} className="py-2.5 flex items-center gap-4">
              <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                {displayColumns.map((c) => (
                  <div key={c.key} className="truncate">
                    <span className="text-muted-foreground text-xs ml-1">{c.label}:</span>
                    <span>{row[c.key] ?? "—"}</span>
                  </div>
                ))}
              </div>
              {canEdit && (
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => {
                      if (confirm("تأكيد الحذف؟")) del.mutate(row.id);
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "تعديل" : "إضافة"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {fields.map((f) => (
              <FieldInput
                key={f.name}
                field={f}
                value={form[f.name] ?? ""}
                onChange={(v) => setForm((p) => ({ ...p, [f.name]: v }))}
              />
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button
              onClick={() => {
                for (const f of fields) {
                  if (f.required && !form[f.name]) {
                    toast.error(`الحقل مطلوب: ${f.label}`);
                    return;
                  }
                }
                upsert.mutate(form);
              }}
              disabled={upsert.isPending}
            >
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: any;
  onChange: (v: any) => void;
}) {
  const opts = useQuery({
    queryKey: ["ref-opts", field.optionsQueryKey],
    queryFn: () => field.loadOptions?.() ?? Promise.resolve([]),
    enabled: field.type === "select" && !!field.loadOptions,
  });

  return (
    <div>
      <Label>
        {field.label}
        {field.required && <span className="text-destructive mr-1">*</span>}
      </Label>
      {field.type === "select" ? (
        <Select value={value ?? ""} onValueChange={(v) => onChange(v === "__none__" ? null : v)}>
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="اختر..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">— بدون —</SelectItem>
            {opts.data?.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Input className="mt-1" value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}
