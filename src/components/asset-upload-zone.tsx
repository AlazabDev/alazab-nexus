import { useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Cloud,
  X,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
  FileText,
  Film,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

interface UploadFile {
  file: File;
  progress: number;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
  preview?: string;
  retryCount?: number;
}

interface AssetUploadZoneProps {
  onFilesSelected: (files: File[]) => Promise<void>;
  isLoading?: boolean;
  accept?: string;
  multiple?: boolean;
  maxSize?: number; // in bytes
  maxRetries?: number;
}

// المنصات المدعومة
const SUPPORTED_TYPES = {
  image: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  pdf: ["application/pdf"],
  video: ["video/mp4", "video/webm", "video/quicktime"],
};

const MAX_RETRIES = 3;

export function AssetUploadZone({
  onFilesSelected,
  isLoading,
  accept = "image/*,.pdf",
  multiple = true,
  maxSize = 50 * 1024 * 1024, // 50MB default
  maxRetries = MAX_RETRIES,
}: AssetUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploads, setUploads] = useState<UploadFile[]>([]);

  // التحقق من نوع الملف
  const isValidFileType = (file: File): boolean => {
    const allValidTypes = Object.values(SUPPORTED_TYPES).flat();
    return allValidTypes.includes(file.type) || file.name.endsWith(".pdf");
  };

  // الحصول على أيقونة الملف
  const getFileIcon = (file: File) => {
    if (file.type.startsWith("image/")) return <ImageIcon className="size-4" />;
    if (file.type === "application/pdf") return <FileText className="size-4" />;
    if (file.type.startsWith("video/")) return <Film className="size-4" />;
    return <FileText className="size-4" />;
  };

  // إنشاء معاينة للملف
  const createPreview = (file: File): Promise<string | undefined> => {
    return new Promise((resolve) => {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = () => resolve(undefined);
        reader.readAsDataURL(file);
      } else {
        resolve(undefined);
      }
    });
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;

    const newFiles = Array.from(files);
    const errors: string[] = [];

    // التحقق من الملفات
    const validFiles = newFiles.filter((file) => {
      if (file.size > maxSize) {
        errors.push(`${file.name}: يتجاوز الحد الأقصى للحجم (${formatFileSize(maxSize)})`);
        return false;
      }
      if (!isValidFileType(file)) {
        errors.push(`${file.name}: نوع ملف غير مدعوم`);
        return false;
      }
      return true;
    });

    if (errors.length > 0) {
      errors.forEach((err) => toast.error(err));
    }

    if (validFiles.length === 0) return;

    // إنشاء معاينات للملفات
    const newUploads = await Promise.all(
      validFiles.map(async (file) => {
        const preview = await createPreview(file);
        return {
          file,
          progress: 0,
          status: "pending" as const,
          preview,
          retryCount: 0,
        };
      }),
    );

    setUploads((prev) => [...prev, ...newUploads]);

    // معالجة الرفع مع إعادة المحاولة
    for (let i = 0; i < newUploads.length; i++) {
      const uploadFile = newUploads[i];
      let attempts = 0;
      let success = false;

      while (attempts < maxRetries && !success) {
        try {
          setUploads((prev) =>
            prev.map((u, idx) =>
              idx === prev.length - newUploads.length + i
                ? { ...u, status: "uploading" as const, retryCount: attempts }
                : u,
            ),
          );

          await onFilesSelected([uploadFile.file]);

          setUploads((prev) =>
            prev.map((u, idx) =>
              idx === prev.length - newUploads.length + i
                ? { ...u, status: "done" as const, progress: 100 }
                : u,
            ),
          );

          success = true;
          toast.success(`تم رفع ${uploadFile.file.name} بنجاح`);
        } catch (error: any) {
          attempts++;

          if (attempts < maxRetries) {
            setUploads((prev) =>
              prev.map((u, idx) =>
                idx === prev.length - newUploads.length + i
                  ? {
                      ...u,
                      retryCount: attempts,
                      error: `إعادة محاولة ${attempts}/${maxRetries}...`,
                    }
                  : u,
              ),
            );
            // انتظر قبل المحاولة التالية
            await new Promise((resolve) => setTimeout(resolve, 1000 * attempts));
          } else {
            setUploads((prev) =>
              prev.map((u, idx) =>
                idx === prev.length - newUploads.length + i
                  ? {
                      ...u,
                      status: "error" as const,
                      error: error.message || "فشل الرفع بعد عدة محاولات",
                    }
                  : u,
              ),
            );
            toast.error(`فشل رفع ${uploadFile.file.name}: ${error.message || "حدث خطأ"}`);
          }
        }
      }
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(e.type === "dragenter" || e.type === "dragover");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    handleFiles(e.dataTransfer.files);
  };

  const clearUploads = () => setUploads([]);
  const removeUpload = (index: number) => {
    setUploads((prev) => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      <Card
        className={`p-8 border-2 border-dashed transition-all cursor-pointer surface-elevated ${
          isDragActive ? "border-accent bg-accent/5" : "border-border hover:border-accent/50"
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          multiple={multiple}
          accept={accept}
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
          disabled={isLoading}
        />

        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <Cloud className="size-12 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-semibold">اسحب الملفات هنا</h3>
            <p className="text-xs text-muted-foreground mt-1">أو انقر لاختيار ملفات من جهازك</p>
          </div>
          <div className="flex gap-2 justify-center flex-wrap text-xs text-muted-foreground">
            <Badge variant="outline">صور</Badge>
            <Badge variant="outline">PDF</Badge>
            <Badge variant="outline">حتى {formatFileSize(maxSize)}</Badge>
          </div>
        </div>
      </Card>

      {/* Uploads List */}
      {uploads.length > 0 && (
        <Card className="p-4 space-y-3 surface-elevated border-0">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">الملفات المرفوعة ({uploads.length})</h3>
            {uploads.every((u) => u.status !== "pending" && u.status !== "uploading") && (
              <Button size="sm" variant="ghost" onClick={clearUploads}>
                <X className="size-4 mr-1" />
                مسح الكل
              </Button>
            )}
          </div>

          <div className="space-y-3">
            {uploads.map((upload, idx) => (
              <div
                key={idx}
                className="space-y-1.5 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                {/* Header with status */}
                <div className="flex items-start gap-3">
                  {/* Thumbnail or Icon */}
                  <div className="relative shrink-0">
                    {upload.preview ? (
                      <img
                        src={upload.preview}
                        alt={upload.file.name}
                        className="size-10 rounded object-cover bg-muted"
                      />
                    ) : (
                      <div className="size-10 rounded bg-muted flex items-center justify-center text-muted-foreground">
                        {getFileIcon(upload.file)}
                      </div>
                    )}
                    {upload.status === "done" && (
                      <div className="absolute -top-1 -right-1 bg-success rounded-full p-0.5">
                        <CheckCircle2 className="size-4 text-white" />
                      </div>
                    )}
                    {upload.status === "error" && (
                      <div className="absolute -top-1 -right-1 bg-destructive rounded-full p-0.5">
                        <AlertCircle className="size-4 text-white" />
                      </div>
                    )}
                  </div>

                  {/* File info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{upload.file.name}</p>
                      {upload.retryCount && upload.retryCount > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          محاولة {upload.retryCount}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(upload.file.size)}
                    </p>
                    {upload.error && (
                      <p className="text-xs text-destructive mt-1">{upload.error}</p>
                    )}
                  </div>

                  {/* Remove button */}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 shrink-0"
                    onClick={() => removeUpload(idx)}
                    disabled={upload.status === "uploading"}
                  >
                    <X className="size-4" />
                  </Button>
                </div>

                {/* Progress bar */}
                {(upload.status === "uploading" || upload.status === "pending") && (
                  <div className="space-y-1">
                    <Progress value={upload.progress} className="h-1.5" />
                    <p className="text-xs text-muted-foreground">
                      {upload.status === "uploading" ? `${upload.progress}%` : "في الانتظار..."}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
            <div>
              إجمالي: {uploads.length} ملف (
              {formatFileSize(uploads.reduce((acc, u) => acc + u.file.size, 0))})
            </div>
            <div className="flex gap-2">
              {uploads.filter((u) => u.status === "done").length > 0 && (
                <Badge variant="secondary" className="bg-success/20 text-success">
                  ✓ {uploads.filter((u) => u.status === "done").length}
                </Badge>
              )}
              {uploads.filter((u) => u.status === "error").length > 0 && (
                <Badge variant="secondary" className="bg-destructive/20 text-destructive">
                  ✗ {uploads.filter((u) => u.status === "error").length}
                </Badge>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
