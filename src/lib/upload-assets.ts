import { supabase } from "@/integrations/supabase/client";

export type AssetRole =
  | "main_image"
  | "gallery"
  | "before"
  | "after"
  | "technical_drawing"
  | "supplier_image"
  | "site_photo"
  | "invoice_attachment"
  | "warranty_document"
  | "datasheet"
  | "model_3d"
  | "cad_file";

const BUCKET = "product-assets";

// أنواع الملفات المدعومة
const SUPPORTED_MIME_TYPES = {
  image: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  pdf: ["application/pdf"],
  video: ["video/mp4", "video/webm", "video/quicktime"],
};

// السجل - تخزين محلي لسجل العمليات
interface UploadLog {
  timestamp: string;
  fileName: string;
  assetRole: AssetRole;
  status: "success" | "failed" | "retried";
  message: string;
  error?: string;
}

const uploadLogs: UploadLog[] = [];

function sanitize(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

/**
 * التحقق من صحة الملف قبل الرفع
 */
export function validateFile(file: File, maxSize: number = 50 * 1024 * 1024): {
  valid: boolean;
  error?: string;
} {
  // التحقق من الحجم
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `حجم الملف يتجاوز الحد الأقصى (${(maxSize / 1024 / 1024).toFixed(0)}MB)`,
    };
  }

  // التحقق من النوع
  const allValidTypes = Object.values(SUPPORTED_MIME_TYPES).flat();
  if (!allValidTypes.includes(file.type) && !file.name.endsWith(".pdf")) {
    return {
      valid: false,
      error: `نوع الملف غير مدعوم. الأنواع المدعومة: صور، PDF، فيديو`,
    };
  }

  return { valid: true };
}

/**
 * تسجيل العملية في السجل
 */
function logUploadOperation(log: UploadLog) {
  const fullLog = {
    ...log,
    timestamp: new Date().toISOString(),
  };
  uploadLogs.push(fullLog);
  console.log("[v0] Upload operation logged:", fullLog);
}

/**
 * الحصول على سجل العمليات
 */
export function getUploadLogs(): UploadLog[] {
  return [...uploadLogs];
}

/**
 * مسح سجل العمليات
 */
export function clearUploadLogs() {
  uploadLogs.length = 0;
}

export async function uploadAndLinkAsset(opts: {
  file: File;
  productId: string;
  azCode: string;
  role: AssetRole;
  sortOrder: number;
  folderPath?: string;
}) {
  const { file, productId, azCode, role, sortOrder, folderPath } = opts;

  // التحقق من الملف
  const validation = validateFile(file);
  if (!validation.valid) {
    logUploadOperation({
      fileName: file.name,
      assetRole: role,
      status: "failed",
      message: "فشل التحقق من الملف",
      error: validation.error,
      timestamp: new Date().toISOString(),
    });
    throw new Error(validation.error);
  }

  const ts = Date.now();
  const safeName = sanitize(file.name);
  const path = `${azCode}/${ts}_${sortOrder}_${safeName}`;

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // محاولة الرفع
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, {
        cacheControl: "31536000",
        upsert: false,
        contentType: file.type,
      });

    if (upErr) {
      throw new Error(`خطأ التخزين: ${upErr.message}`);
    }

    // Bucket is private: issue a signed URL instead of a public one.
    const { data: signed, error: signErr } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, 60 * 60 * 24 * 365);
    if (signErr || !signed) throw new Error(`خطأ التخزين: ${signErr?.message ?? "sign failed"}`);
    const pub = { publicUrl: signed.signedUrl };

    // إنشاء سجل الأصل
    const { data: asset, error: aErr } = await supabase
      .from("assets")
      .insert({
        file_name: file.name,
        file_url: pub.publicUrl,
        file_size: file.size,
        file_type: file.type || null,
        folder_path: folderPath ?? azCode,
        storage_provider: "supabase",
        source: "bulk_upload",
        uploaded_by: user?.id ?? null,
        status: "active",
      })
      .select("id")
      .single();

    if (aErr) {
      throw new Error(`خطأ في إنشاء سجل الأصل: ${aErr.message}`);
    }

    // ربط الأصل بالمنتج
    const { error: lErr } = await supabase.from("product_assets").insert({
      product_id: productId,
      asset_id: asset.id,
      asset_role: role,
      sort_order: sortOrder,
    });

    if (lErr) {
      throw new Error(`خطأ في ربط الأصل: ${lErr.message}`);
    }

    // تسجيل العملية الناجحة
    logUploadOperation({
      fileName: file.name,
      assetRole: role,
      status: "success",
      message: `تم رفع ${file.name} بنجاح`,
      timestamp: new Date().toISOString(),
    });

    return { assetId: asset.id, publicUrl: pub.publicUrl, path };
  } catch (error: any) {
    // تسجيل الفشل
    logUploadOperation({
      fileName: file.name,
      assetRole: role,
      status: "failed",
      message: "فشل الرفع",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
    throw error;
  }
}

/** Link an asset by external URL (no upload — stores the URL as-is). */
export async function linkAssetFromUrl(opts: {
  url: string;
  productId: string;
  azCode: string;
  role: AssetRole;
  sortOrder: number;
  fileName?: string;
}) {
  const { url, productId, azCode, role, sortOrder, fileName } = opts;
  if (!/^https?:\/\//i.test(url)) throw new Error("الرابط يجب أن يبدأ بـ http(s)");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const name = fileName || decodeURIComponent(url.split("/").pop()?.split("?")[0] || "external");

  const { data: asset, error: aErr } = await supabase
    .from("assets")
    .insert({
      file_name: name,
      file_url: url,
      file_size: 0,
      file_type: null,
      folder_path: azCode,
      storage_provider: "external",
      source: "url",
      uploaded_by: user?.id ?? null,
      status: "active",
    })
    .select("id")
    .single();
  if (aErr) throw new Error(`Asset row: ${aErr.message}`);

  const { error: lErr } = await supabase.from("product_assets").insert({
    product_id: productId,
    asset_id: asset.id,
    asset_role: role,
    sort_order: sortOrder,
  });
  if (lErr) throw new Error(`Link: ${lErr.message}`);

  return { assetId: asset.id, publicUrl: url };
}

export async function deleteAssetLink(linkId: string) {
  const { error } = await supabase.from("product_assets").delete().eq("id", linkId);
  if (error) throw error;
}

export async function setAssetRole(linkId: string, role: AssetRole) {
  const { error } = await supabase
    .from("product_assets")
    .update({ asset_role: role })
    .eq("id", linkId);
  if (error) throw error;
}

/** Promote a link to main_image, demote the existing main (if any) to gallery. */
export async function promoteToMain(productId: string, linkId: string) {
  const { data: current } = await supabase
    .from("product_assets")
    .select("id")
    .eq("product_id", productId)
    .eq("asset_role", "main_image")
    .maybeSingle();
  if (current && current.id !== linkId) {
    await supabase.from("product_assets").update({ asset_role: "gallery" }).eq("id", current.id);
  }
  const { error } = await supabase
    .from("product_assets")
    .update({ asset_role: "main_image" })
    .eq("id", linkId);
  if (error) throw error;
}

/** Persist new ordering: pass linkIds in display order. */
export async function reorderAssets(linkIds: string[]) {
  await Promise.all(
    linkIds.map((id, idx) =>
      supabase.from("product_assets").update({ sort_order: idx }).eq("id", id),
    ),
  );
}

/** Soft-delete an asset (status='archived'); links remain for audit. */
export async function softDeleteAsset(assetId: string) {
  const { error } = await supabase.from("assets").update({ status: "archived" }).eq("id", assetId);
  if (error) throw error;
}
