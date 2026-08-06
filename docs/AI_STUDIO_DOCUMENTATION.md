# AI-Powered Product Optimization System - Documentation

## Overview

The AI Studio is a comprehensive product management environment that enables intelligent optimization of product content, automatic datasheet generation, professional image fetching, and quote generation powered by Gemini AI.

## Features

### 1. Content Optimization

Enhance product names, descriptions, and metadata with AI-powered suggestions.

**Optimization Levels:**

- **Basic**: Optimizes product names and descriptions
- **Standard**: Includes metadata and SEO keywords
- **Premium**: Full optimization with marketing-focused copy

**Supported Languages:**

- English
- Arabic
- Multilingual support

**API Endpoint:**

```
POST /api/private/v1/ai/optimize-product
```

**Request:**

```json
{
  "productId": "uuid",
  "optimizationLevel": "standard|basic|premium",
  "focusAreas": ["name", "description", "keywords"],
  "applyAutomatically": false
}
```

**Response:**

```json
{
  "success": true,
  "optimization": {
    "optimized_name_en": "Enhanced Name",
    "optimized_name_ar": "الاسم المحسّن",
    "optimized_description_en": "...",
    "optimized_description_ar": "...",
    "keywords": ["keyword1", "keyword2"],
    "metadata_suggestions": {},
    "contentQualityScore": 85
  }
}
```

### 2. Datasheet Generation

Automatically create comprehensive technical datasheets for products.

**Supported Formats:**

- PDF - Professional printable format
- HTML - Web-ready interactive version
- JSON - Structured data format

**Sections Included:**

- Technical Specifications
- Dimensions & Weight
- Materials & Composition
- Certifications & Standards
- Performance Data
- Usage Guidelines
- Safety Information
- Warranty Terms

**API Endpoint:**

```
POST /api/private/v1/ai/generate-datasheet
```

**Request:**

```json
{
  "productId": "uuid",
  "format": "pdf|html|json",
  "language": "en|ar|multilingual"
}
```

**Response:**

```json
{
  "success": true,
  "datasheet": {
    "id": "uuid",
    "product_id": "uuid",
    "content": {},
    "file_url": "https://...",
    "status": "generated",
    "format": "pdf",
    "language": "en"
  }
}
```

### 3. Professional Image Management

Fetch professional images and match them with products based on AI analysis.

**Features:**

- Multi-source image fetching (Unsplash, Pexels, custom APIs)
- Confidence-based matching (0-100%)
- Image quality analysis
- Batch processing support
- Multiple image type support

**Image Types:**

- Product Photo - Direct product shots
- Lifestyle - Product in use context
- Technical - Close-ups and specifications
- 3D Render - Rendered visualizations

**API Endpoint:**

```
POST /api/private/v1/ai/image-fetch-and-match
```

### 4. Quote Generation

Create professional quotes with AI-powered intelligent pricing.

**Features:**

- Automatic discount calculation
- Volume-based pricing
- Customer tier adjustments
- Tax calculation
- Currency support
- Secure quote tokens

**Customer Types:**

- **Retail**: Standard pricing
- **Wholesale**: 10-15% discount
- **Enterprise**: 20-30% discount

**Public API Endpoint:**

```
POST /api/public/v1/ai/quotes
```

**Request:**

```json
{
  "products": [
    {
      "product_id": "uuid",
      "quantity": 100,
      "unit": "pcs"
    }
  ],
  "customer": {
    "type": "wholesale|retail|enterprise",
    "name": "Customer Name",
    "email": "customer@example.com"
  },
  "special_requirements": "Custom requirements"
}
```

**Response:**

```json
{
  "success": true,
  "quote": {
    "quote_id": "QT-...",
    "quote_token": "...",
    "items": [],
    "subtotal": 5000,
    "tax": 750,
    "discount": 750,
    "total": 5000,
    "currency": "SAR",
    "valid_until": "2026-06-30",
    "terms": "Net 30"
  }
}
```

## Batch Operations

### Start Batch Optimization

**Endpoint:**

```
POST /api/private/v1/ai/batch-optimize
```

**Request:**

```json
{
  "productIds": ["uuid1", "uuid2", "..."],
  "optimizationLevel": "standard",
  "optimizationType": "content|datasheet|images|all",
  "priority": "normal|high|low"
}
```

**Response:**

```json
{
  "success": true,
  "job": {
    "job_id": "job_...",
    "status": "queued",
    "total_products": 100,
    "estimated_duration": "45 seconds"
  }
}
```

### Check Job Status

**Endpoint:**

```
GET /api/private/v1/ai/job-status?jobId=job_...
```

**Response:**

```json
{
  "success": true,
  "job": {
    "job_id": "job_...",
    "status": "processing",
    "progress_percent": 45,
    "total_products": 100,
    "processed_count": 45,
    "success_count": 45,
    "failed_count": 0,
    "errors": [],
    "time_remaining": "25 seconds"
  }
}
```

## Database Schema

### ai_settings

Stores optimization preferences for each product.

```sql
- id (UUID, pk)
- product_id (UUID, fk)
- optimization_level (enum: basic|standard|premium)
- image_fetch_enabled (boolean)
- datasheet_enabled (boolean)
- quote_auto_generation (boolean)
- last_optimization_at (timestamp)
```

### product_datasheets

Stores generated datasheets.

```sql
- id (UUID, pk)
- product_id (UUID, fk)
- content (JSONB)
- file_url (text)
- status (enum: draft|generated|exported)
- generator_model (text)
- language (text)
- format (text)
```

### product_images_ai

Enhanced image management with AI metadata.

```sql
- id (UUID, pk)
- product_id (UUID, fk)
- image_url (text)
- image_source (enum)
- image_type (enum)
- processing_status (enum)
- ai_confidence_score (numeric 0-100)
- ai_analysis (JSONB)
```

### api_quotes

Auto-generated quotes from API requests.

```sql
- id (UUID, pk)
- product_id (UUID, fk)
- supplier_id (UUID, fk)
- quote_request_data (JSONB)
- generated_quote (JSONB)
- status (enum)
- quote_token (text unique)
```

### ai_optimization_jobs

Batch optimization task tracking.

```sql
- id (UUID, pk)
- job_id (text unique)
- user_id (UUID, fk)
- product_ids (UUID[])
- status (enum: queued|processing|completed|failed)
- progress_percent (integer)
- errors (JSONB[])
```

### ai_audit_logs

Audit trail for all AI operations.

```sql
- id (UUID, pk)
- user_id (UUID)
- action (text)
- entity_type (text)
- status (enum: success|error|warning)
- duration_ms (integer)
- cost_estimate (numeric)
```

## Frontend Routes

| Route                   | Component               | Purpose                   |
| ----------------------- | ----------------------- | ------------------------- |
| `/ai-studio`            | AIStudioDashboard       | Hub/home page             |
| `/ai-studio/optimize`   | ProductContentOptimizer | Content optimization      |
| `/ai-studio/datasheets` | DatasheetBuilder        | Datasheet generation      |
| `/ai-studio/images`     | ImageFetcher            | Image fetching & matching |
| `/ai-studio/quotes`     | QuoteBuilder            | Quote generation          |

## Security & Rate Limiting

- All private endpoints require authentication
- Public quote endpoint requires valid API key
- Rate limiting: 100 requests/minute per API key
- All operations logged to audit_logs table
- Row-Level Security (RLS) policies enforced
- SQL injection prevention via parameterized queries

## Error Handling

All API endpoints return standardized error responses:

```json
{
  "error": "Error message",
  "details": "Additional details if available"
}
```

HTTP Status Codes:

- 200: Success
- 202: Accepted (async operation)
- 400: Bad Request
- 401: Unauthorized
- 404: Not Found
- 500: Server Error

## Performance Optimization

- Batch operations process products in parallel
- Caching layer for frequent optimizations
- Lazy-loading for image galleries
- Streaming responses for large datasheets
- Database indexes on frequently queried fields

## AI Models Used

- **Content Optimization**: google/gemini-2.5-flash
- **Image Analysis**: google/gemini-2.5-flash-vision
- **Quote Generation**: google/gemini-2.5-flash

## Limitations & Considerations

- AI Gateway rate limits: 100 req/min
- Image processing timeout: 30 seconds
- Maximum batch size: 100 products
- File storage limit: Per Supabase plan
- Quote generation: Requires pricing rules configuration

## Cost Estimation

Cost per operation (estimated):

- Content Optimization: $0.001 - $0.005
- Datasheet Generation: $0.01 - $0.02
- Image Analysis: $0.005 - $0.01
- Quote Generation: $0.001 - $0.003

## Future Enhancements

- [ ] Custom AI model training
- [ ] Video content generation
- [ ] Multi-supplier pricing aggregation
- [ ] Inventory integration
- [ ] Automated quality scoring
- [ ] Export to external platforms
- [ ] Webhook notifications
- [ ] Advanced analytics dashboard
