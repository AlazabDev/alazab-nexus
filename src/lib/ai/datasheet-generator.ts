/**
 * AI Datasheet Generator
 * Automatically generates technical datasheets for products
 */

import { generateObject, generateText } from "ai";
import { z } from "zod";

export interface DatasheetContent {
  product_name: string;
  product_code?: string;
  category: string;
  overview: string;
  technical_specs: Array<{
    parameter: string;
    value: string;
    unit?: string;
  }>;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
    weight?: number;
    unit: string;
  };
  materials: string[];
  certifications: string[];
  performance_data?: Record<string, string | number>;
  usage_guidelines: string;
  safety_info: string;
  storage_conditions?: string;
  warranty: string;
  environmental_info?: string;
  compliance: string[];
}

const DatasheetSchema = z.object({
  product_name: z.string(),
  category: z.string(),
  overview: z.string(),
  technical_specs: z.array(
    z.object({
      parameter: z.string(),
      value: z.string(),
      unit: z.string().optional(),
    }),
  ),
  dimensions: z
    .object({
      length: z.number().optional(),
      width: z.number().optional(),
      height: z.number().optional(),
      weight: z.number().optional(),
      unit: z.string(),
    })
    .optional(),
  materials: z.array(z.string()),
  certifications: z.array(z.string()),
  usage_guidelines: z.string(),
  safety_info: z.string(),
  warranty: z.string(),
  compliance: z.array(z.string()),
});

export interface GeneratedDatasheet {
  id: string;
  content: DatasheetContent;
  generated_at: Date;
  status: "draft" | "generated" | "exported";
  version: number;
}

export async function generateProductDatasheet(productData: {
  id: string;
  name: string;
  description: string;
  category: string;
  specifications?: Record<string, any>;
  materials?: string[];
  images?: Array<{ url: string }>;
}): Promise<DatasheetContent> {
  try {
    const prompt = buildDatasheetPrompt(productData);

    const result = await generateObject({
      model: "google/gemini-2.5-flash",
      schema: DatasheetSchema,
      prompt,
      system: `You are a professional technical datasheet generator. 
        Create comprehensive, accurate datasheets that:
        - Follow industry standards
        - Include all essential technical information
        - Are clear and professional
        - Use consistent formatting
        - Include safety and compliance information
        - Provide practical usage guidelines`,
    });

    return result.object as DatasheetContent;
  } catch (error) {
    console.error("[v0] Datasheet generation error:", error);
    throw new Error(
      `Datasheet generation failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function buildDatasheetPrompt(productData: {
  id: string;
  name: string;
  description: string;
  category: string;
  specifications?: Record<string, any>;
  materials?: string[];
  images?: Array<{ url: string }>;
}): string {
  const specs = productData.specifications
    ? JSON.stringify(productData.specifications, null, 2)
    : "";
  const materials = productData.materials ? productData.materials.join(", ") : "";
  const imageCount = productData.images?.length || 0;

  return `Generate a comprehensive technical datasheet for this product:

Product Name: ${productData.name}
Category: ${productData.category}
Description: ${productData.description}
Specifications: ${specs || "Not provided"}
Materials: ${materials || "Not specified"}
Number of Images: ${imageCount}

Create a datasheet that includes:
1. Brief product overview (2-3 sentences)
2. Technical specifications (at least 8-10 key parameters)
3. Dimensions and weight (if applicable)
4. Materials used
5. Certifications and compliance standards
6. Performance data
7. Usage guidelines and best practices
8. Safety information
9. Storage conditions
10. Warranty information
11. Environmental/sustainability info
12. Any relevant compliance standards

Ensure all information is accurate, professional, and follows standard technical documentation practices.`;
}

export async function generatePDFDatasheet(
  content: DatasheetContent,
  format: "html" | "markdown" = "html",
): Promise<string> {
  if (format === "html") {
    return generateHTMLDatasheet(content);
  }
  return generateMarkdownDatasheet(content);
}

function generateHTMLDatasheet(content: DatasheetContent): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${content.product_name} - Technical Datasheet</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background: white; }
    .container { max-width: 900px; margin: 0 auto; }
    h1 { color: #0066cc; border-bottom: 3px solid #0066cc; padding-bottom: 10px; }
    h2 { color: #0066cc; margin-top: 30px; }
    h3 { color: #333; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th { background: #f0f0f0; padding: 10px; text-align: left; font-weight: 600; }
    td { padding: 10px; border-bottom: 1px solid #ddd; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
    .spec-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
    .spec-card { background: #f9f9f9; padding: 15px; border-radius: 5px; border-left: 4px solid #0066cc; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <h1>${content.product_name}</h1>
        ${content.product_code ? `<p><strong>Product Code:</strong> ${content.product_code}</p>` : ""}
        <p><strong>Category:</strong> ${content.category}</p>
      </div>
    </div>

    <section>
      <h2>Overview</h2>
      <p>${content.overview}</p>
    </section>

    ${
      content.dimensions
        ? `
    <section>
      <h2>Dimensions & Physical Properties</h2>
      <div class="spec-grid">
        ${content.dimensions.length ? `<div class="spec-card"><strong>Length:</strong> ${content.dimensions.length} ${content.dimensions.unit}</div>` : ""}
        ${content.dimensions.width ? `<div class="spec-card"><strong>Width:</strong> ${content.dimensions.width} ${content.dimensions.unit}</div>` : ""}
        ${content.dimensions.height ? `<div class="spec-card"><strong>Height:</strong> ${content.dimensions.height} ${content.dimensions.unit}</div>` : ""}
        ${content.dimensions.weight ? `<div class="spec-card"><strong>Weight:</strong> ${content.dimensions.weight} kg</div>` : ""}
      </div>
    </section>
    `
        : ""
    }

    <section>
      <h2>Technical Specifications</h2>
      <table>
        <thead>
          <tr>
            <th>Parameter</th>
            <th>Value</th>
            ${content.technical_specs[0]?.unit ? "<th>Unit</th>" : ""}
          </tr>
        </thead>
        <tbody>
          ${content.technical_specs
            .map(
              (spec) => `
            <tr>
              <td><strong>${spec.parameter}</strong></td>
              <td>${spec.value}</td>
              ${spec.unit ? `<td>${spec.unit}</td>` : ""}
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>
    </section>

    ${
      content.materials.length > 0
        ? `
    <section>
      <h2>Materials</h2>
      <ul>
        ${content.materials.map((m) => `<li>${m}</li>`).join("")}
      </ul>
    </section>
    `
        : ""
    }

    ${
      content.certifications.length > 0
        ? `
    <section>
      <h2>Certifications & Compliance</h2>
      <ul>
        ${content.certifications.map((c) => `<li>${c}</li>`).join("")}
      </ul>
    </section>
    `
        : ""
    }

    <section>
      <h2>Usage Guidelines</h2>
      <p>${content.usage_guidelines}</p>
    </section>

    <section>
      <h2>Safety Information</h2>
      <p>${content.safety_info}</p>
    </section>

    ${
      content.storage_conditions
        ? `
    <section>
      <h2>Storage Conditions</h2>
      <p>${content.storage_conditions}</p>
    </section>
    `
        : ""
    }

    <section>
      <h2>Warranty</h2>
      <p>${content.warranty}</p>
    </section>

    <div class="footer">
      <p>Generated: ${new Date().toISOString()}</p>
      <p>This datasheet is subject to change without notice.</p>
    </div>
  </div>
</body>
</html>`;
}

function generateMarkdownDatasheet(content: DatasheetContent): string {
  let markdown = `# ${content.product_name} - Technical Datasheet

`;

  if (content.product_code) {
    markdown += `**Product Code:** ${content.product_code}\n`;
  }

  markdown += `**Category:** ${content.category}\n\n`;

  markdown += `## Overview\n\n${content.overview}\n\n`;

  if (content.dimensions) {
    markdown += `## Physical Properties\n\n`;
    if (content.dimensions.length)
      markdown += `- **Length:** ${content.dimensions.length} ${content.dimensions.unit}\n`;
    if (content.dimensions.width)
      markdown += `- **Width:** ${content.dimensions.width} ${content.dimensions.unit}\n`;
    if (content.dimensions.height)
      markdown += `- **Height:** ${content.dimensions.height} ${content.dimensions.unit}\n`;
    if (content.dimensions.weight) markdown += `- **Weight:** ${content.dimensions.weight} kg\n`;
    markdown += "\n";
  }

  markdown += `## Technical Specifications\n\n`;
  markdown += `| Parameter | Value | Unit |\n|-----------|-------|------|\n`;
  content.technical_specs.forEach((spec) => {
    markdown += `| ${spec.parameter} | ${spec.value} | ${spec.unit || "N/A"} |\n`;
  });
  markdown += "\n";

  if (content.materials.length > 0) {
    markdown += `## Materials\n\n${content.materials.map((m) => `- ${m}`).join("\n")}\n\n`;
  }

  if (content.certifications.length > 0) {
    markdown += `## Certifications & Compliance\n\n${content.certifications.map((c) => `- ${c}`).join("\n")}\n\n`;
  }

  markdown += `## Usage Guidelines\n\n${content.usage_guidelines}\n\n`;
  markdown += `## Safety Information\n\n${content.safety_info}\n\n`;

  if (content.storage_conditions) {
    markdown += `## Storage Conditions\n\n${content.storage_conditions}\n\n`;
  }

  markdown += `## Warranty\n\n${content.warranty}\n\n`;

  markdown += `---\n\n*Generated: ${new Date().toISOString()}*\n`;

  return markdown;
}
