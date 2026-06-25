import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit,
  Trash2,
  Download,
  Filter,
} from "lucide-react";

interface Product {
  id: string;
  name_ar: string;
  name_en: string;
  az_code: string;
  item_type: string;
  status: string;
  created_at: string;
}

interface ProductsDataTableProps {
  products: Product[];
  isLoading?: boolean;
  onView?: (product: Product) => void;
  onEdit?: (product: Product) => void;
  onDelete?: (productId: string) => void;
}

type SortDirection = "asc" | "desc" | null;

export function ProductsDataTable({
  products,
  isLoading,
  onView,
  onEdit,
  onDelete,
}: ProductsDataTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filter and search
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        product.name_ar.includes(searchTerm) ||
        product.name_en.includes(searchTerm) ||
        product.az_code.includes(searchTerm);

      const matchesStatus = !statusFilter || product.status === statusFilter;
      const matchesType = !typeFilter || product.item_type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [products, searchTerm, statusFilter, typeFilter]);

  // Sort
  const sortedProducts = useMemo(() => {
    if (!sortColumn || !sortDirection) return filteredProducts;

    return [...filteredProducts].sort((a, b) => {
      let aValue = a[sortColumn as keyof Product] || "";
      let bValue = b[sortColumn as keyof Product] || "";

      if (sortDirection === "asc") {
        return String(aValue).localeCompare(String(bValue), "ar");
      } else {
        return String(bValue).localeCompare(String(aValue), "ar");
      }
    });
  }, [filteredProducts, sortColumn, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(sortedProducts.length / itemsPerPage);
  const paginatedProducts = sortedProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortDirection(null);
        setSortColumn(null);
      }
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (column: string) => {
    if (sortColumn !== column) return null;
    return sortDirection === "asc" ? (
      <ChevronUp className="size-4 inline ml-1" />
    ) : (
      <ChevronDown className="size-4 inline ml-1" />
    );
  };

  const getStatusBadgeClass = (status: string) => {
    const classes: Record<string, string> = {
      approved: "bg-success/20 text-success",
      draft: "bg-muted text-muted-foreground",
      needs_review: "bg-yellow-500/20 text-yellow-700",
      duplicate_suspected: "bg-yellow-500/20 text-yellow-700",
      content_incomplete: "bg-destructive/20 text-destructive",
      pricing_incomplete: "bg-destructive/20 text-destructive",
      supplier_pending: "bg-blue-500/20 text-blue-700",
      rejected: "bg-destructive/20 text-destructive",
      exported: "bg-purple-500/20 text-purple-700",
      archived: "bg-muted text-muted-foreground",
    };
    return classes[status] || "bg-muted text-muted-foreground";
  };

  const translateStatus = (status: string) => {
    const translations: Record<string, string> = {
      approved: "معتمد",
      draft: "مسودة",
      needs_review: "بحاجة مراجعة",
      duplicate_suspected: "مكرر محتمل",
      content_incomplete: "محتوى ناقص",
      pricing_incomplete: "سعر ناقص",
      supplier_pending: "بانتظار المورد",
      rejected: "مرفوض",
      exported: "مصدر",
      archived: "مؤرشف",
    };
    return translations[status] || status;
  };

  const translateType = (type: string) => {
    const translations: Record<string, string> = {
      product: "منتج",
      service: "خدمة",
      work_item: "عنصر عمل",
      material: "مادة",
      tool: "أداة",
      spare_part: "قطعة غيار",
      finish_item: "منتج نهائي",
      custom_unit: "وحدة مخصصة",
      supplier_item: "منتج المورد",
      package: "عبوة",
      bundle: "مجموعة",
    };
    return translations[type] || type;
  };

  const uniqueStatuses = [...new Set(products.map((p) => p.status))];
  const uniqueTypes = [...new Set(products.map((p) => p.item_type))];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Filter className="size-4" />
          البحث والتصفية
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="ابحث باسم أو رمز..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-3 pr-9"
            />
          </div>

          {/* Status Filter */}
          <Select value={statusFilter || ""} onValueChange={(val) => {
            setStatusFilter(val || null);
            setCurrentPage(1);
          }}>
            <SelectTrigger>
              <SelectValue placeholder="تصفية بالحالة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">الكل</SelectItem>
              {uniqueStatuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {translateStatus(status)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Type Filter */}
          <Select value={typeFilter || ""} onValueChange={(val) => {
            setTypeFilter(val || null);
            setCurrentPage(1);
          }}>
            <SelectTrigger>
              <SelectValue placeholder="تصفية بالنوع" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">الكل</SelectItem>
              {uniqueTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {translateType(type)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Export */}
          <Button variant="outline" className="gap-2">
            <Download className="size-4" />
            تصدير
          </Button>
        </div>

        {/* Results info */}
        <div className="text-xs text-muted-foreground">
          {sortedProducts.length} من {products.length} منتج
        </div>
      </Card>

      {/* Table */}
      <Card className="p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">جاري التحميل...</div>
        ) : paginatedProducts.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            لم يتم العثور على منتجات
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-right font-semibold">
                      <button
                        onClick={() => handleSort("name_ar")}
                        className="flex items-center gap-1 hover:text-accent transition-colors"
                      >
                        الاسم
                        {getSortIcon("name_ar")}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-right font-semibold">
                      <button
                        onClick={() => handleSort("az_code")}
                        className="flex items-center gap-1 hover:text-accent transition-colors"
                      >
                        الرمز
                        {getSortIcon("az_code")}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-right font-semibold">
                      النوع
                    </th>
                    <th className="px-4 py-3 text-right font-semibold">
                      <button
                        onClick={() => handleSort("status")}
                        className="flex items-center gap-1 hover:text-accent transition-colors"
                      >
                        الحالة
                        {getSortIcon("status")}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-right font-semibold">
                      <button
                        onClick={() => handleSort("created_at")}
                        className="flex items-center gap-1 hover:text-accent transition-colors"
                      >
                        التاريخ
                        {getSortIcon("created_at")}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-center font-semibold">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginatedProducts.map((product) => (
                    <tr
                      key={product.id}
                      className="hover:bg-muted/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">{product.name_ar}</p>
                          <p className="text-xs text-muted-foreground">
                            {product.name_en}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {product.az_code}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className="text-xs">
                          {translateType(product.item_type)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={`text-xs border-0 ${getStatusBadgeClass(product.status)}`}>
                          {translateStatus(product.status)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(product.created_at).toLocaleDateString("ar-SA")}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => onView?.(product)}
                          >
                            <Eye className="size-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => onEdit?.(product)}
                          >
                            <Edit className="size-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 hover:text-destructive"
                            onClick={() => onDelete?.(product.id)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-border bg-muted/30">
                <div className="text-xs text-muted-foreground">
                  الصفحة {currentPage} من {totalPages} ({sortedProducts.length} نتيجة)
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                    className="gap-1"
                  >
                    <ChevronLeft className="size-4" />
                    السابق
                  </Button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .slice(Math.max(0, currentPage - 2), Math.min(totalPages, currentPage + 1))
                      .map((page) => (
                        <Button
                          key={page}
                          size="sm"
                          variant={page === currentPage ? "default" : "outline"}
                          onClick={() => setCurrentPage(page)}
                          className="min-w-8"
                        >
                          {page}
                        </Button>
                      ))}
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(currentPage + 1)}
                    className="gap-1"
                  >
                    التالي
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
