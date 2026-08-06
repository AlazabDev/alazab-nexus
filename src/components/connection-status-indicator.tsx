import { useState, useEffect } from "react";
import {
  getConnectionStatusData,
  startConnectionMonitoring,
  stopConnectionMonitoring,
  checkAzureConnection,
} from "@/lib/connection-checker";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Activity, Wifi, WifiOff, AlertCircle, RotateCcw, Clock, TrendingUp } from "lucide-react";

interface ConnectionStatusIndicatorProps {
  showDetails?: boolean;
  autoMonitor?: boolean;
  monitorInterval?: number;
}

export function ConnectionStatusIndicator({
  showDetails = true,
  autoMonitor = true,
  monitorInterval = 30000,
}: ConnectionStatusIndicatorProps) {
  const [statusData, setStatusData] = useState(getConnectionStatusData());
  const [isChecking, setIsChecking] = useState(false);
  const [showPopover, setShowPopover] = useState(false);

  useEffect(() => {
    if (autoMonitor) {
      startConnectionMonitoring(monitorInterval);
    }

    const interval = setInterval(() => {
      setStatusData(getConnectionStatusData());
    }, 5000);

    return () => {
      clearInterval(interval);
      if (autoMonitor) {
        stopConnectionMonitoring();
      }
    };
  }, [autoMonitor, monitorInterval]);

  const handleManualCheck = async () => {
    setIsChecking(true);
    await checkAzureConnection();
    setStatusData(getConnectionStatusData());
    setIsChecking(false);
  };

  const getStatusColor = () => {
    if (statusData.isHealthy) return "bg-green-500";
    if (statusData.isWarning) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getStatusLabel = () => {
    switch (statusData.status) {
      case "connected":
        return "متصل";
      case "reconnecting":
        return "إعادة اتصال...";
      case "disconnected":
        return "غير متصل";
      default:
        return "غير معروف";
    }
  };

  const getStatusIcon = () => {
    switch (statusData.status) {
      case "connected":
        return <Wifi className="size-4" />;
      case "reconnecting":
        return <Activity className="size-4 animate-pulse" />;
      case "disconnected":
        return <WifiOff className="size-4" />;
    }
  };

  const formatTime = (date: Date | null) => {
    if (!date) return "لم يتم الاختبار";
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return "للتو";
    if (diff < 3600) return `قبل ${Math.floor(diff / 60)} د.`;
    if (diff < 86400) return `قبل ${Math.floor(diff / 3600)} س.`;
    return `قبل ${Math.floor(diff / 86400)} أيام`;
  };

  return (
    <TooltipProvider>
      <Popover open={showPopover} onOpenChange={setShowPopover}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border hover:bg-secondary/50 transition-colors cursor-pointer">
                <div className={`size-2.5 rounded-full ${getStatusColor()} animate-pulse`} />
                <span className="text-xs font-medium">{getStatusLabel()}</span>
              </button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent className="text-xs" side="bottom">
            {statusData.isHealthy
              ? "الاتصال صحي"
              : statusData.isWarning
                ? "قد تكون هناك مشاكل"
                : "لا يوجد اتصال"}
          </TooltipContent>
        </Tooltip>

        {showDetails && (
          <PopoverContent className="w-80 p-4" side="bottom">
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getStatusIcon()}
                  <h3 className="font-semibold text-sm">حالة الاتصال</h3>
                </div>
                <Badge
                  className={
                    statusData.isHealthy
                      ? "bg-green-500/20 text-green-700"
                      : statusData.isWarning
                        ? "bg-yellow-500/20 text-yellow-700"
                        : "bg-red-500/20 text-red-700"
                  }
                >
                  {getStatusLabel()}
                </Badge>
              </div>

              {/* Status Details */}
              <div className="space-y-3 text-sm">
                {/* Latency */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Clock className="size-3" />
                      المؤخرة
                    </span>
                    <span className="font-medium">{statusData.latency}ms</span>
                  </div>
                  {statusData.latency > 1000 && (
                    <p className="text-xs text-yellow-600">المؤخرة مرتفعة نسبياً</p>
                  )}
                </div>

                {/* Uptime */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="size-3" />
                      التوفر
                    </span>
                    <span className="font-medium">{statusData.uptime}%</span>
                  </div>
                  <Progress value={statusData.uptime} className="h-1.5" />
                </div>

                {/* Last Check */}
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">آخر فحص</span>
                  <span className="text-xs">{formatTime(statusData.lastSuccessfulCheck)}</span>
                </div>

                {/* Error Message */}
                {statusData.lastError && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded p-2 text-xs text-red-700">
                    <div className="flex gap-1 items-start">
                      <AlertCircle className="size-3.5 shrink-0 mt-0.5" />
                      <div>{statusData.lastError}</div>
                    </div>
                  </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                  <div className="bg-secondary/50 rounded p-2 text-center">
                    <div className="text-xs text-muted-foreground">نجاحات</div>
                    <div className="text-sm font-bold text-green-600">
                      {statusData.successCount}
                    </div>
                  </div>
                  <div className="bg-secondary/50 rounded p-2 text-center">
                    <div className="text-xs text-muted-foreground">فشل</div>
                    <div className="text-sm font-bold text-red-600">{statusData.failureCount}</div>
                  </div>
                </div>

                {/* Manual Check Button */}
                <Button
                  onClick={handleManualCheck}
                  disabled={isChecking}
                  size="sm"
                  className="w-full h-8 text-xs"
                  variant="outline"
                >
                  <RotateCcw className="size-3.5 mr-1" />
                  {isChecking ? "جاري الفحص..." : "فحص الآن"}
                </Button>
              </div>

              {/* Recent Events */}
              <div className="pt-2 border-t">
                <p className="text-xs font-semibold mb-2">آخر 5 أحداث</p>
                <div className="space-y-1 text-xs max-h-32 overflow-y-auto">
                  {statusData.recentEvents.length > 0 ? (
                    statusData.recentEvents
                      .slice()
                      .reverse()
                      .map((event, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between px-2 py-1 rounded bg-secondary/30"
                        >
                          <div className="flex items-center gap-1">
                            <div
                              className={`size-1.5 rounded-full ${
                                event.status === "connected" ? "bg-green-500" : "bg-red-500"
                              }`}
                            />
                            <span>{event.status === "connected" ? "متصل" : "قطع"}</span>
                          </div>
                          <span className="text-muted-foreground">{event.latency}ms</span>
                        </div>
                      ))
                  ) : (
                    <div className="text-muted-foreground text-center py-2">لا توجد أحداث بعد</div>
                  )}
                </div>
              </div>
            </div>
          </PopoverContent>
        )}
      </Popover>
    </TooltipProvider>
  );
}
