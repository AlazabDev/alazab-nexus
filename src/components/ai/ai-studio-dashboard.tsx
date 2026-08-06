"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  FileText,
  Image as ImageIcon,
  ReceiptText,
  Zap,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

export interface OptimizationJob {
  job_id: string;
  status: "queued" | "processing" | "completed" | "failed";
  progress_percent: number;
  total_products: number;
  processed_count: number;
  type: string;
}

interface AIStudioDashboardProps {
  recentJobs?: OptimizationJob[];
  onStartOptimization?: () => void;
  onStartDatasheet?: () => void;
  onStartImageFetch?: () => void;
  onStartQuote?: () => void;
}

export function AIStudioDashboard({
  recentJobs = [],
  onStartOptimization,
  onStartDatasheet,
  onStartImageFetch,
  onStartQuote,
}: AIStudioDashboardProps) {
  const actions = [
    {
      icon: Sparkles,
      title: "Optimize Content",
      description: "Enhance product names, descriptions, and metadata with AI",
      color: "from-blue-500 to-blue-600",
      onClick: onStartOptimization,
      badge: "Most Popular",
    },
    {
      icon: FileText,
      title: "Generate Datasheet",
      description: "Create professional technical datasheets automatically",
      color: "from-purple-500 to-purple-600",
      onClick: onStartDatasheet,
      badge: "New",
    },
    {
      icon: ImageIcon,
      title: "Fetch & Match Images",
      description: "Find professional images and match them to products",
      color: "from-green-500 to-green-600",
      onClick: onStartImageFetch,
    },
    {
      icon: ReceiptText,
      title: "Generate Quotes",
      description: "Auto-generate quotes with intelligent pricing",
      color: "from-orange-500 to-orange-600",
      onClick: onStartQuote,
    },
  ];

  const statusIcons = {
    queued: <Clock className="h-4 w-4 text-yellow-500" />,
    processing: <Zap className="h-4 w-4 text-blue-500" />,
    completed: <CheckCircle2 className="h-4 w-4 text-green-500" />,
    failed: <AlertCircle className="h-4 w-4 text-red-500" />,
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">AI Studio</h1>
        <p className="text-muted-foreground">Optimize your products with AI-powered tools</p>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Card
              key={action.title}
              className="group relative overflow-hidden hover:shadow-lg transition-all duration-300"
            >
              {/* Gradient background on hover */}
              <div
                className={`absolute inset-0 opacity-0 group-hover:opacity-10 bg-gradient-to-br ${action.color} transition-opacity`}
              />

              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${action.color} text-white`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  {action.badge && (
                    <span className="text-xs font-semibold px-2 py-1 bg-primary/10 text-primary rounded-full">
                      {action.badge}
                    </span>
                  )}
                </div>
                <CardTitle className="text-lg mt-3">{action.title}</CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                <CardDescription className="text-sm leading-relaxed">
                  {action.description}
                </CardDescription>
                <Button
                  onClick={action.onClick}
                  className={`w-full bg-gradient-to-r ${action.color} hover:opacity-90 text-white border-0`}
                  size="sm"
                >
                  Start
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Jobs */}
      {recentJobs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Jobs</CardTitle>
            <CardDescription>Track your optimization tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentJobs.map((job) => (
              <div key={job.job_id} className="space-y-2 pb-4 border-b last:border-0 last:pb-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {statusIcons[job.status]}
                    <div className="text-sm">
                      <p className="font-medium">{job.type}</p>
                      <p className="text-xs text-muted-foreground">
                        {job.processed_count} of {job.total_products} products
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold">{job.progress_percent}%</span>
                </div>
                <Progress value={job.progress_percent} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Optimized This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,247</div>
            <p className="text-xs text-green-600">+12% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Datasheets Generated
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">342</div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Quotes Created
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">89</div>
            <p className="text-xs text-green-600">+23% conversion rate</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
