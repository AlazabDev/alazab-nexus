/**
 * AI Product Content Optimizer
 * Enhances product descriptions, names, and metadata using AI
 */

import { generateObject, generateText } from "ai";
import { z } from "zod";

const AIGateway = "https://api.vercel.ai";

export interface OptimizationResult {
  optimized_name_ar: string;
  optimized_name_en: string;
  optimized_description_ar: string;
  optimized_description_en: string;
  keywords: string[];
  metadata_suggestions: Record<string, string>;
  contentQualityScore: number;
  timestamp: Date;
  focusAreas: string[];
}

const OptimizationSchema = z.object({
  optimized_name_ar: z.string().describe("Optimized product name in Arabic"),
  optimized_name_en: z.string().describe("Optimized product name in English"),
  optimized_description_ar: z.string().describe("Enhanced product description in Arabic"),
  optimized_description_en: z.string().describe("Enhanced product description in English"),
  keywords: z.array(z.string()).describe("SEO keywords extracted from product"),
  metadata_suggestions: z.record(z.string()).describe("Metadata field suggestions"),
  contentQualityScore: z.number().min(0).max(100).describe("Quality score 0-100"),
  focusAreas: z.array(z.string()).describe("Areas that were optimized"),
});

export async function optimizeProductContent(
  productData: {
    id: string;
    name: string;
    description: string;
    category?: string;
    specifications?: Record<string, any>;
  },
  optimizationLevel: "basic" | "standard" | "premium" = "standard",
): Promise<OptimizationResult> {
  const startTime = Date.now();

  try {
    const focusAreasMap = {
      basic: ["name", "description"],
      standard: ["name", "description", "keywords", "metadata"],
      premium: ["name", "description", "keywords", "metadata", "seo", "marketing", "localization"],
    };

    const prompt = buildOptimizationPrompt(productData, focusAreasMap[optimizationLevel]);

    const result = await generateObject({
      model: "google/gemini-2.5-flash",
      schema: OptimizationSchema,
      prompt,
      system: `You are an expert product content optimizer. 
        - Optimize product names to be engaging and searchable
        - Create compelling descriptions that highlight benefits
        - Extract relevant SEO keywords
        - Provide metadata suggestions for better discoverability
        - Ensure content is appropriate for both Arabic and English markets
        - Score content quality from 0-100 based on clarity, completeness, and engagement`,
    });

    const duration = Date.now() - startTime;

    return {
      ...result.object,
      timestamp: new Date(),
      focusAreas: focusAreasMap[optimizationLevel],
    };
  } catch (error) {
    console.error("[v0] Optimization error:", error);
    throw new Error(
      `Product optimization failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function buildOptimizationPrompt(
  productData: {
    id: string;
    name: string;
    description: string;
    category?: string;
    specifications?: Record<string, any>;
  },
  focusAreas: string[],
): string {
  const specs =
    productData.specifications && Object.keys(productData.specifications).length > 0
      ? `\nProduct Specifications: ${JSON.stringify(productData.specifications, null, 2)}`
      : "";

  return `Optimize this product content:

Product ID: ${productData.id}
Current Name: ${productData.name}
Category: ${productData.category || "General"}
Current Description: ${productData.description}${specs}

Focus areas for optimization: ${focusAreas.join(", ")}

Please provide:
1. An optimized product name in both Arabic and English that's catchy and SEO-friendly
2. Enhanced descriptions (2-3 sentences) for both languages highlighting key benefits
3. Relevant keywords for search and discoverability
4. Metadata suggestions (brand, model, rating, availability, etc.)
5. A content quality score from 0-100

Make the content engaging, accurate, and suitable for e-commerce platforms.`;
}

export async function generateProductKeywords(
  productName: string,
  description: string,
  category?: string,
): Promise<string[]> {
  try {
    const { text } = await generateText({
      model: "google/gemini-2.5-flash",
      prompt: `Generate 8-12 relevant SEO keywords for this product:
Name: ${productName}
Description: ${description}
Category: ${category || "General"}

Return only the keywords as a comma-separated list, no explanations.`,
    });

    return text
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k.length > 0);
  } catch (error) {
    console.error("[v0] Keyword generation error:", error);
    return [];
  }
}

export async function scoreContentQuality(
  productName: string,
  description: string,
  hasImages: boolean,
  hasSpecifications: boolean,
): Promise<number> {
  try {
    const { text } = await generateText({
      model: "google/gemini-2.5-flash",
      prompt: `Score the quality of this product content from 0-100:
Name: ${productName}
Description: ${description}
Has Images: ${hasImages}
Has Specifications: ${hasSpecifications}

Consider: clarity, completeness, engagement, SEO-friendliness, and professionalism.
Return only a number between 0-100.`,
    });

    const score = parseInt(text.trim(), 10);
    return isNaN(score) ? 0 : Math.min(100, Math.max(0, score));
  } catch (error) {
    console.error("[v0] Quality scoring error:", error);
    return 0;
  }
}
