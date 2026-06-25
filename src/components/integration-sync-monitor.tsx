import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Activity,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface SyncEvent {
  id: string;
  integrationId: string;
  timestamp: string;
  status: "success" | "failed" | "in_progress";
  recordsProcessed: number;
  duration: number; // in seconds
  error?: string;
}

interface IntegrationSyncMonitorProps {
  integrationId: string;
  integrationName: string;
  lastSync?: string;
  syncFrequency?: string;
  onSyncClick?: () => Promise<void>;
}

export function IntegrationSyncMonitor({
  integrationId,
  integrationName,
  lastSync,
  syncFrequency,
  onSyncClick,
}: IntegrationSyncMonitorProps) {
  const [expandedLogs, setExpandedLogs] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncLogs, setSyncLogs] = useState<SyncEvent[]>([
    {
      id: "1",
      integrationId,
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      status: "success",
      recordsProcessed: 250,
      duration: 45,
    },
    {
      id: "2",
      integrationId,
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      status: "success",
      recordsProcessed: 180,
      duration: 32,
    },
    {
      id: "3",
      integrationId,
      timestamp: new Date(Date.now() - 10800000).toISOString(),
      status: "failed",
      recordsProcessed: 0,
      duration: 8,
      error: "خطأ في الاتصال بالخادم",
    },
  ]);

  // بيانات الرسم البياني
  const chartData = syncLogs
    .slice(-10)
    .reverse()
    .map((log) => ({
      time: new Date(log.timestamp).toLocaleTimeString("ar-SA", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      records: log.recordsProcessed,
      duration: log.duration,
    }));

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      if (onSyncClick) {
        await onSyncClick();
      }
      // إضافة سجل مزامنة جديد
      setSyncLogs((prev) => [
        {
          id: Date.now().toString(),
          integrationId,
          timestamp: new Date().toISOString(),
          status: "success",
          recordsProcessed: Math.floor(Math.random() * 300),
          duration: Math.floor(Math.random() * 60),
        },
        ...prev,
      ]);
    } catch (error: any) {
      setSyncLogs((prev) => [
        {
          id: Date.now().toString(),
          integrationId,
          timestamp: new Date().toISOString(),
          status: "failed",
          recordsProcessed: 0,
          duration: 0,
          error: error.message,
        },
        ...prev,
      ]);
    } finally {
      setIsSyncing(false);
    }
  };

  const successCount = syncLogs.filter((l) => l.status === "success").length;
  const failureCount = syncLogs.filter((l) => l.status === "failed").length;
  const avgDuration = syncLogs.length > 0 ? (syncLogs.reduce((acc, l) => acc + l.duration, 0) / syncLogs.length).toFixed(1) : 0;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card className="p-3 space-y-1">
          <div className="text-xs text-muted-foreground">آخر مزامنة</div>
          <div className="text-sm font-semibold">{lastSync || "لم يتم"}</div>
        </Card>
        <Card className="p-3 space-y-1">
          <div className="text-xs text-muted-foreground">التكرار</div>
          <div className="text-sm font-semibold">{syncFrequency || "غير محدد"}</div>
        </Card>
        <Card className="p-3 space-y-1">
          <div className="text-xs text-muted-foreground">المزامنات الناجحة</div>
          <div className="text-sm font-semibold text-success">{successCount}</div>
        </Card>
        <Card className="p-3 space-y-1">
          <div className="text-xs text-muted-foreground">المتوسط</div>
          <div className="text-sm font-semibold">{avgDuration}ث</div>
        </Card>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card className="p-4">
          <div className="text-xs font-semibold mb-3">سجل المزامنة</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="time" stroke="var(--color-muted-foreground)" style={{ fontSize: "12px" }} />
              <YAxis stroke="var(--color-muted-foreground)" style={{ fontSize: "12px" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--color-background)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "0.5rem",
                }}
              />
              <Line type="monotone" dataKey="records" stroke="var(--color-accent)" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Sync Button */}
      <Button onClick={handleSync} disabled={isSyncing} className="w-full gap-2">
        {isSyncing ? (
          <>
            <RefreshCw className="size-4 animate-spin" />
            جاري المزامنة...
          </>
        ) : (
          <>
            <RefreshCw className="size-4" />
            مزامنة الآن
          </>
        )}
      </Button>

      {/* Logs */}
      <Card className="p-4">
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setExpandedLogs(!expandedLogs)}
        >
          <div className="flex items-center gap-2">
            <Activity className="size-4" />
            <span className="font-semibold">سجل العمليات</span>
            <Badge variant="secondary">{syncLogs.length}</Badge>
          </div>
          {expandedLogs ? (
            <ChevronUp className="size-4" />
          ) : (
            <ChevronDown className="size-4" />
          )}
        </div>

        {expandedLogs && (
          <div className="mt-4 space-y-2 max-h-[400px] overflow-y-auto">
            {syncLogs.map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-lg bg-muted/30 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {log.status === "success" ? (
                      <CheckCircle2 className="size-4 text-success" />
                    ) : (
                      <AlertCircle className="size-4 text-destructive" />
                    )}
                    <span className="font-semibold">
                      {log.status === "success" ? "نجحت" : "فشلت"}
                    </span>
                  </div>
                  <span className="text-muted-foreground">
                    {new Date(log.timestamp).toLocaleString("ar-SA")}
                  </span>
                </div>

                <div className="flex items-center justify-between text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <span>معالج:</span>
                    <span className="font-semibold">{log.recordsProcessed}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="size-3" />
                    <span>{log.duration}ث</span>
                  </div>
                </div>

                {log.error && (
                  <div className="p-2 bg-destructive/10 rounded text-destructive">
                    {log.error}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
