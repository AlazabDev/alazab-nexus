/**
 * Connection Checker - Azure OpenAI Connection Status Monitor
 * Monitors and tracks Azure OpenAI API connectivity
 */

import { azureChatCompletion } from "./ai-assistant.functions";

export type ConnectionStatus = "connected" | "reconnecting" | "disconnected";

export interface ConnectionMetrics {
  status: ConnectionStatus;
  latency: number; // milliseconds
  lastSuccessfulCheck: Date | null;
  failureCount: number;
  successCount: number;
  uptime: number; // percentage
  lastError?: string;
}

interface ConnectionEvent {
  timestamp: Date;
  status: ConnectionStatus;
  latency?: number;
  error?: string;
}

// Store connection state and history
const connectionState: {
  status: ConnectionStatus;
  metrics: ConnectionMetrics;
  events: ConnectionEvent[];
  lastCheckTime: Date | null;
  checkInterval?: NodeJS.Timeout;
} = {
  status: "disconnected",
  metrics: {
    status: "disconnected",
    latency: 0,
    lastSuccessfulCheck: null,
    failureCount: 0,
    successCount: 0,
    uptime: 0,
  },
  events: [],
  lastCheckTime: null,
};

/**
 * Test Azure OpenAI connection with a simple echo request
 */
export async function checkAzureConnection(): Promise<{
  success: boolean;
  latency: number;
  error?: string;
}> {
  const startTime = performance.now();

  try {
    const response = await azureChatCompletion({
      data: {
        messages: [
          {
            role: "system",
            content: "أنت مساعد اختبار. رد بـ 'OK' فقط للتأكد من الاتصال.",
          },
          {
            role: "user",
            content: "اختبار الاتصال",
          },
        ],
        max_tokens: 10,
        temperature: 0,
      },
    });

    const latency = Math.round(performance.now() - startTime);

    if ("error" in response || !response.choices?.[0]?.message?.content) {
      throw new Error(response.error || "رد فارغ من API");
    }

    logConnectionEvent("connected", latency);
    return { success: true, latency };
  } catch (error) {
    const latency = Math.round(performance.now() - startTime);
    const errorMsg = error instanceof Error ? error.message : "خطأ غير معروف";
    logConnectionEvent("disconnected", latency, errorMsg);
    return {
      success: false,
      latency,
      error: errorMsg,
    };
  }
}

/**
 * Log connection event and update metrics
 */
function logConnectionEvent(status: ConnectionStatus, latency: number, error?: string) {
  const event: ConnectionEvent = {
    timestamp: new Date(),
    status,
    latency,
    error,
  };

  connectionState.events.push(event);

  // Keep only last 100 events
  if (connectionState.events.length > 100) {
    connectionState.events.shift();
  }

  // Update status and metrics
  connectionState.status = status;
  connectionState.lastCheckTime = new Date();

  if (status === "connected") {
    connectionState.metrics.status = "connected";
    connectionState.metrics.successCount++;
    connectionState.metrics.latency = latency;
    connectionState.metrics.lastSuccessfulCheck = new Date();
    connectionState.metrics.lastError = undefined;
  } else {
    connectionState.metrics.status =
      connectionState.metrics.failureCount > 2 ? "disconnected" : "reconnecting";
    connectionState.metrics.failureCount++;
    connectionState.metrics.lastError = error;
  }

  // Calculate uptime percentage
  const total = connectionState.metrics.successCount + connectionState.metrics.failureCount;
  connectionState.metrics.uptime =
    total > 0 ? Math.round((connectionState.metrics.successCount / total) * 100) : 0;

  console.log("[v0] Connection event:", event);
}

/**
 * Start monitoring Azure OpenAI connection
 */
export function startConnectionMonitoring(intervalMs: number = 30000) {
  if (connectionState.checkInterval) {
    clearInterval(connectionState.checkInterval);
  }

  // Initial check
  checkAzureConnection();

  // Periodic checks
  connectionState.checkInterval = setInterval(() => {
    checkAzureConnection();
  }, intervalMs);

  console.log(`[v0] Connection monitoring started (interval: ${intervalMs}ms)`);
}

/**
 * Stop monitoring Azure OpenAI connection
 */
export function stopConnectionMonitoring() {
  if (connectionState.checkInterval) {
    clearInterval(connectionState.checkInterval);
    connectionState.checkInterval = undefined;
  }
  console.log("[v0] Connection monitoring stopped");
}

/**
 * Get current connection metrics
 */
export function getConnectionMetrics(): ConnectionMetrics {
  return {
    ...connectionState.metrics,
  };
}

/**
 * Get connection history (last N events)
 */
export function getConnectionHistory(limit: number = 20): ConnectionEvent[] {
  return connectionState.events.slice(-limit);
}

/**
 * Reset connection metrics
 */
export function resetConnectionMetrics() {
  connectionState.metrics = {
    status: "disconnected",
    latency: 0,
    lastSuccessfulCheck: null,
    failureCount: 0,
    successCount: 0,
    uptime: 0,
  };
  connectionState.events = [];
  connectionState.lastCheckTime = null;
  console.log("[v0] Connection metrics reset");
}

/**
 * Get connection status indicator data
 */
export function getConnectionStatusData() {
  const metrics = getConnectionMetrics();
  const recentEvents = getConnectionHistory(5);
  const isHealthy = metrics.status === "connected" && metrics.uptime >= 95;
  const isWarning =
    metrics.status === "reconnecting" || (metrics.uptime >= 80 && metrics.uptime < 95);

  return {
    status: metrics.status,
    isHealthy,
    isWarning,
    latency: metrics.latency,
    uptime: metrics.uptime,
    lastError: metrics.lastError,
    lastSuccessfulCheck: metrics.lastSuccessfulCheck,
    recentEvents,
    failureCount: metrics.failureCount,
    successCount: metrics.successCount,
  };
}

export default {
  checkAzureConnection,
  startConnectionMonitoring,
  stopConnectionMonitoring,
  getConnectionMetrics,
  getConnectionHistory,
  resetConnectionMetrics,
  getConnectionStatusData,
};
