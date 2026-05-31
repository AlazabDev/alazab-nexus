import { createFileRoute } from '@tanstack/react-router';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { CORS, json, requireAuth } from '@/lib/api-auth';
import { z } from 'zod';

const StatusRequestSchema = z.object({
  jobId: z.string(),
});

export const Route = createFileRoute('/api/private/v1/ai/job-status')({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        // Verify authentication
        const auth = await requireAuth(request);
        if (!auth.success) {
          return json({ error: 'Unauthorized' }, 401);
        }

        try {
          const url = new URL(request.url);
          const jobId = url.searchParams.get('jobId');

          if (!jobId) {
            return json({ error: 'jobId query parameter required' }, 400, { headers: CORS });
          }

          // Fetch job status
          const { data: job, error: jobError } = await supabaseAdmin
            .from('ai_optimization_jobs')
            .select('*')
            .eq('job_id', jobId)
            .eq('user_id', auth.userId)
            .maybeSingle();

          if (jobError) {
            return json({ error: 'Job not found' }, 404, { headers: CORS });
          }

          if (!job) {
            return json({ error: 'Unauthorized: Job not found or access denied' }, 403, { headers: CORS });
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
            { headers: CORS }
          );
        } catch (error) {
          console.error('[v0] Job status error:', error);
          return json(
            {
              error: error instanceof Error ? error.message : 'Failed to fetch job status',
            },
            500,
            { headers: CORS }
          );
        }
      },
    },
  },
});
