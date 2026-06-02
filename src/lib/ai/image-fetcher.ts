/**
 * AI Image Fetcher & Matcher
 * Fetches professional images and matches them with products
 */

import { generateObject, generateText } from 'ai';
import { z } from 'zod';

export interface ImageAnalysisResult {
  url: string;
  source: string;
  image_type: string;
  confidence_score: number;
  analysis: {
    objects_detected: string[];
    color_analysis: string;
    quality_score: number;
    background_info: string;
    composition: string;
  };
  suitable_for_product: boolean;
  match_notes: string;
}

const ImageAnalysisSchema = z.object({
  objects_detected: z.array(z.string()),
  color_analysis: z.string(),
  quality_score: z.number().min(0).max(100),
  background_info: z.string(),
  composition: z.string(),
  suitability: z.number().min(0).max(100),
  match_explanation: z.string(),
});

export async function fetchImageSources(
  productName: string,
  productCategory: string,
  count: number = 5,
  imageTypes: string[] = ['product_photo', 'lifestyle']
): Promise<Array<{ url: string; source: string; type: string }>> {
  try {
    // For now, return mock data - in production, integrate with Unsplash, Pexels APIs
    const mockImages = [
      {
        url: `https://images.unsplash.com/photo-product-${Math.random().toString(36).substring(7)}`,
        source: 'unsplash',
        type: 'product_photo',
      },
      {
        url: `https://images.pexels.com/photo-${Math.random()}`,
        source: 'pexels',
        type: 'lifestyle',
      },
    ];

    return mockImages.slice(0, count);
  } catch (error) {
    console.error('[v0] Image fetch error:', error);
    return [];
  }
}

export async function analyzeAndMatchImage(
  imageUrl: string,
  productName: string,
  productDescription: string,
  productCategory: string
): Promise<ImageAnalysisResult> {
  try {
    const analysisPrompt = `Analyze this product image and determine if it matches the product:

Product Name: ${productName}
Category: ${productCategory}
Description: ${productDescription}
Image URL: ${imageUrl}

Provide:
1. List of objects detected in the image
2. Color analysis
3. Quality score (0-100)
4. Background information
5. Composition analysis
6. Suitability score (0-100)
7. Explanation of match`;

    const result = await generateObject({
      model: 'google/gemini-2.5-flash-vision',
      schema: ImageAnalysisSchema,
      prompt: analysisPrompt,
      system: `You are an expert image analyst for product matching.
        Analyze images and determine if they match product descriptions.
        Provide detailed analysis and confidence scores.
        Consider image quality, relevance, and professional appearance.`,
    });

    return {
      url: imageUrl,
      source: 'analyzed',
      image_type: 'product_photo',
      confidence_score: result.object.suitability,
      analysis: {
        objects_detected: result.object.objects_detected,
        color_analysis: result.object.color_analysis,
        quality_score: result.object.quality_score,
        background_info: result.object.background_info,
        composition: result.object.composition,
      },
      suitable_for_product: result.object.suitability > 70,
      match_notes: result.object.match_explanation,
    };
  } catch (error) {
    console.error('[v0] Image analysis error:', error);
    throw new Error(`Image analysis failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function batchMatchImages(
  images: Array<{ url: string; source: string }>,
  productName: string,
  productDescription: string,
  productCategory: string
): Promise<ImageAnalysisResult[]> {
  try {
    // Process images sequentially to avoid rate limits
    const results: ImageAnalysisResult[] = [];

    for (const image of images) {
      const result = await analyzeAndMatchImage(image.url, productName, productDescription, productCategory);
      results.push(result);
      // Add delay between requests
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Sort by confidence score
    return results.sort((a, b) => b.confidence_score - a.confidence_score);
  } catch (error) {
    console.error('[v0] Batch image matching error:', error);
    throw new Error(`Batch image matching failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function generateImageSuggestions(
  productName: string,
  productCategory: string,
  currentImages?: number
): Promise<Array<{ type: string; description: string; priority: 'high' | 'medium' | 'low' }>> {
  try {
    const { text } = await generateText({
      model: 'google/gemini-2.5-flash',
      prompt: `Suggest image types needed for this product listing:

Product Name: ${productName}
Category: ${productCategory}
Current Images: ${currentImages || 0}

Suggest 5-7 image types that would improve the product listing, prioritized by importance.
For each, explain why it's important.

Format as JSON array with: type, description, priority (high|medium|low)`,
    });

    try {
      // Extract JSON from response
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error('[v0] Failed to parse suggestions:', parseError);
    }

    // Return default suggestions if parsing fails
    return [
      {
        type: 'product_photo',
        description: 'High-quality product photography from multiple angles',
        priority: 'high',
      },
      {
        type: 'lifestyle',
        description: 'Product in use or context of use',
        priority: 'high',
      },
      {
        type: 'technical',
        description: 'Technical specifications or close-up details',
        priority: 'medium',
      },
    ];
  } catch (error) {
    console.error('[v0] Image suggestion error:', error);
    return [];
  }
}

export async function calculateImageQualityScore(
  analysisResults: ImageAnalysisResult[]
): Promise<{ overallScore: number; recommendations: string[] }> {
  const scores = analysisResults.map((r) => r.confidence_score);
  const overallScore =
    scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

  const recommendations: string[] = [];

  if (overallScore < 50) {
    recommendations.push('Consider fetching higher quality images from professional sources');
  }

  if (analysisResults.filter((r) => r.analysis.quality_score < 70).length > analysisResults.length / 2) {
    recommendations.push('Many images have quality issues. Consider professional product photography');
  }

  if (analysisResults.filter((r) => r.image_type === 'product_photo').length === 0) {
    recommendations.push('No direct product photos found. Add professional product photography');
  }

  if (analysisResults.length < 3) {
    recommendations.push('Add more images for better product showcase (at least 3-5 images recommended)');
  }

  return { overallScore, recommendations };
}

export interface ImageFetchJob {
  job_id: string;
  product_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  total_images: number;
  processed_count: number;
  results: ImageAnalysisResult[];
  error?: string;
  created_at: Date;
  completed_at?: Date;
}

export async function createImageFetchJob(
  productId: string,
  productData: {
    name: string;
    description: string;
    category: string;
  },
  imageCount: number = 5
): Promise<ImageFetchJob> {
  const jobId = `img_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  return {
    job_id: jobId,
    product_id: productId,
    status: 'pending',
    total_images: imageCount,
    processed_count: 0,
    results: [],
    created_at: new Date(),
  };
}
