import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { CORS, json, requireApiKey, logCall, corsHeaders } from "@/lib/api-auth";
import { z } from "zod";

const StatusRequestSchema = z.object({
  jobId: z.string(),
});

export const Route = createFileRoute("/api/private/v1/ai/job-status")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) =>
        new Response(null, { status: 204, headers: corsHeaders(request) }),
      GET: async ({ request }) => {
        const started = Date.now();

        // Verify authentication
        const authResult = await requireApiKey(request, "/api/private/v1/ai/job-status");
        if (authResult.error) {
          return authResult.error;
        }
        const consumer = authResult.consumer;

        try {
          const url = new URL(request.url);
          const jobId = url.searchParams.get("jobId");

          if (!jobId) {
            await logCall({
              consumer,
              request,
              endpoint: "/api/private/v1/ai/job-status",
              status: 400,
              startedAt: started,
              error: "Missing jobId parameter",
            });
            return json({ error: "jobId query parameter required" }, 400);
          }

          // Fetch job status
          const { data: job, error: jobError } = await supabaseAdmin
            .from("ai_optimization_jobs")
            .select("*")
            .eq("job_id", jobId)
            .eq("consumer_id", consumer?.id)
            .maybeSingle();

          if (jobError) {
            await logCall({
              consumer,
              request,
              endpoint: "/api/private/v1/ai/job-status",
              status: 404,
              startedAt: started,
              error: "Job not found",
            });
            return json({ error: "Job not found" }, 404);
          }

          if (!job) {
            await logCall({
              consumer,
              request,
              endpoint: "/api/private/v1/ai/job-status",
              status: 403,
              startedAt: started,
              error: "Access denied to job",
            });
            return json({ error: "Unauthorized: Job not found or access denied" }, 403);
          }

          // Calculate time remaining
          let timeRemaining: string | null = null;
          if (job.estimated_completion) {
            const remaining = new Date(job.estimated_completion).getTime() - Date.now();
            if (remaining > 0) {
              timeRemaining = `${Math.ceil(remaining / 1000)} seconds`;
            }
          }

          return json(
            {
              success: true,
              job: {
                job_id: job.job_id,
                status: job.status,
                progress_percent: job.progress_percent,
                total_products: job.total_products,
                processed_count: job.processed_count,
                success_count: job.success_count,
                failed_count: job.failed_count,
                errors: job.errors || [],
                started_at: job.started_at,
                estimated_completion: job.estimated_completion,
                completed_at: job.completed_at,
                time_remaining: timeRemaining,
                results: job.results || {},
              },
            },
            200,
          );
        } catch (error) {
          console.error("[v0] Job status error:", error);

          await logCall({
            consumer: null,
            request,
            endpoint: "/api/private/v1/ai/job-status",
            status: 500,
            startedAt: started,
            error: error instanceof Error ? error.message : String(error),
          });

          return json(
            {
              error: error instanceof Error ? error.message : "Failed to fetch job status",
            },
            500,
          );
        }
      },
    },
  },
});
