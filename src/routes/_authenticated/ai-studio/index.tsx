import { createFileRoute } from '@tanstack/react-router';
import { AIStudioDashboard } from '@/components/ai/ai-studio-dashboard';
import { PageHeader } from '@/components/page-header';

export const Route = createFileRoute('/_authenticated/ai-studio/')({
  component: AIStudioPage,
  preload: 'intent',
});

function AIStudioPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader 
        title="AI Studio"
        description="AI-powered product optimization, datasheet generation, image matching, and intelligent quote generation"
      />
      
      <main className="flex-1">
        <AIStudioDashboard 
          onStartOptimization={() => window.location.href = '/ai-studio/optimize'}
          onStartDatasheet={() => window.location.href = '/ai-studio/datasheets'}
          onStartImageFetch={() => window.location.href = '/ai-studio/images'}
          onStartQuote={() => window.location.href = '/ai-studio/quotes'}
        />
      </main>
    </div>
  );
}
