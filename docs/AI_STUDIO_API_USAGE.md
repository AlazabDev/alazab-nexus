# AI Studio API Usage Guide

## Quick Start

### Authentication

All private endpoints require authentication via JWT token in the Authorization header:

```bash
Authorization: Bearer <your_jwt_token>
```

Public endpoints require an API key:

```bash
Authorization: Bearer <your_api_key>
```

### Example: Optimize Product Content

```bash
curl -X POST https://app.example.com/api/private/v1/ai/optimize-product \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "productId": "550e8400-e29b-41d4-a716-446655440000",
    "optimizationLevel": "standard",
    "focusAreas": ["name", "description", "keywords"],
    "applyAutomatically": false
  }'
```

### Example: Generate Datasheet

```bash
curl -X POST https://app.example.com/api/private/v1/ai/generate-datasheet \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "productId": "550e8400-e29b-41d4-a716-446655440000",
    "format": "pdf",
    "language": "en"
  }'
```

### Example: Create Quote (Public API)

```bash
curl -X POST https://app.example.com/api/public/v1/ai/quotes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "products": [
      {
        "product_id": "550e8400-e29b-41d4-a716-446655440000",
        "quantity": 100,
        "unit": "pcs"
      }
    ],
    "customer": {
      "type": "wholesale",
      "name": "ABC Company",
      "email": "buyer@abc.com"
    },
    "special_requirements": "Urgent delivery required"
  }'
```

## SDK Integration

### JavaScript/TypeScript

```typescript
// Import the client
import { AIStudioClient } from "@/lib/ai-studio-client";

// Initialize
const client = new AIStudioClient({
  baseUrl: "https://app.example.com",
  token: "your_jwt_token",
});

// Optimize content
const result = await client.optimizeProduct({
  productId: "uuid",
  optimizationLevel: "standard",
});

// Generate datasheet
const datasheet = await client.generateDatasheet({
  productId: "uuid",
  format: "pdf",
  language: "en",
});

// Create batch job
const job = await client.batchOptimize({
  productIds: ["uuid1", "uuid2", "uuid3"],
  optimizationType: "all",
});

// Check job status
const status = await client.getJobStatus(job.job_id);
```

### Python

```python
import requests

# Base configuration
BASE_URL = "https://app.example.com"
HEADERS = {
    "Authorization": "Bearer YOUR_TOKEN",
    "Content-Type": "application/json"
}

# Optimize product
response = requests.post(
    f"{BASE_URL}/api/private/v1/ai/optimize-product",
    headers=HEADERS,
    json={
        "productId": "uuid",
        "optimizationLevel": "standard"
    }
)

result = response.json()
print(result['optimization']['optimized_name_en'])
```

## Use Cases

### Use Case 1: Bulk Product Content Enhancement

**Scenario:** You have 500 products with poor descriptions and want to enhance them all.

**Approach:**

1. Create a batch optimization job
2. Monitor progress via job status endpoint
3. Review results and apply automatically or manually

```bash
# Start batch job
curl -X POST /api/private/v1/ai/batch-optimize \
  -d '{
    "productIds": ["id1", "id2", "..."],
    "optimizationType": "content",
    "optimizationLevel": "standard"
  }'

# Check status (poll every 5 seconds)
curl -X GET /api/private/v1/ai/job-status?jobId=job_...
```

### Use Case 2: E-commerce Integration

**Scenario:** Your e-commerce platform needs to auto-generate professional quotes when customers request them.

**Approach:**

1. Integrate public quote API
2. Customer submits request with products and quantity
3. System generates professional quote automatically
4. Send quote to customer via email

```javascript
async function generateQuoteForCustomer(cartItems, customerInfo) {
  const response = await fetch("/api/public/v1/ai/quotes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SELLER_API_KEY}`,
    },
    body: JSON.stringify({
      products: cartItems.map((item) => ({
        product_id: item.id,
        quantity: item.qty,
        unit: item.unit,
      })),
      customer: {
        type: customerInfo.isWholesale ? "wholesale" : "retail",
        name: customerInfo.name,
        email: customerInfo.email,
      },
    }),
  });

  const quote = await response.json();
  return quote.quote;
}
```

### Use Case 3: Content Localization

**Scenario:** You need to create product content in both English and Arabic.

**Approach:**

1. Use standard or premium optimization level
2. Retrieve both optimized_name_en and optimized_name_ar
3. Store in your database with language flags

```bash
curl -X POST /api/private/v1/ai/optimize-product \
  -d '{
    "productId": "uuid",
    "optimizationLevel": "premium",
    "focusAreas": ["name", "description", "keywords"]
  }'
```

### Use Case 4: Data Sheet Generation Pipeline

**Scenario:** Generate datasheets for all products in your catalog.

**Approach:**

1. Get all products
2. For each, generate datasheet in PDF format
3. Store file URLs in product database
4. Provide download links to customers

```javascript
async function generateAllDatasheets() {
  const products = await fetchAllProducts();

  for (const product of products) {
    try {
      const datasheet = await fetch("/api/private/v1/ai/generate-datasheet", {
        method: "POST",
        body: JSON.stringify({
          productId: product.id,
          format: "pdf",
          language: "en",
        }),
      });

      const data = await datasheet.json();
      // Store file URL in product record
      await updateProduct(product.id, {
        datasheetUrl: data.datasheet.file_url,
      });
    } catch (error) {
      console.error(`Failed for ${product.id}:`, error);
    }
  }
}
```

## Error Recovery

### Retry Logic

```typescript
async function retryWithBackoff(fn: () => Promise<any>, maxRetries = 3, delayMs = 1000) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;

      const delay = delayMs * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

// Usage
const result = await retryWithBackoff(() => client.optimizeProduct({ productId: "uuid" }));
```

### Handling Timeouts

```typescript
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 30000);

try {
  const response = await fetch(url, {
    signal: controller.signal,
    // ... other options
  });
} finally {
  clearTimeout(timeout);
}
```

## Monitoring & Analytics

### Track API Usage

```sql
-- Get API calls per endpoint
SELECT
  entity_type,
  COUNT(*) as total_calls,
  AVG(duration_ms) as avg_duration,
  SUM(CAST(cost_estimate as decimal)) as total_cost
FROM ai_audit_logs
WHERE created_at > NOW() - INTERVAL '1 day'
GROUP BY entity_type;

-- Get errors
SELECT action, error_message, COUNT(*) as error_count
FROM ai_audit_logs
WHERE status = 'error'
GROUP BY action, error_message
ORDER BY error_count DESC;
```

### Performance Metrics

- Average optimization time: < 5 seconds
- Average datasheet generation: 10-15 seconds
- Quote generation: < 2 seconds
- Batch processing: ~5 seconds per product

## Best Practices

1. **Always validate input data** before sending to API
2. **Use batch operations** for multiple products
3. **Implement retry logic** for production systems
4. **Cache results** to avoid unnecessary API calls
5. **Monitor costs** - track API usage and spending
6. **Use appropriate optimization levels** - Premium is more expensive
7. **Set reasonable timeouts** for long-running operations
8. **Log all API calls** for debugging and auditing
9. **Test with small batches** before large operations
10. **Keep API keys secure** - use environment variables

## Troubleshooting

### Common Issues

**Issue: 401 Unauthorized**

- Check token/API key validity
- Verify token hasn't expired
- Ensure correct Authorization header format

**Issue: 404 Product Not Found**

- Verify product ID is correct UUID format
- Ensure product exists in database
- Check user has access to product

**Issue: Job Status Returns Empty**

- Wait a few seconds for job to start processing
- Verify job ID is correct
- Check if job has completed (status: "completed")

**Issue: API Rate Limit Exceeded**

- Implement exponential backoff retry logic
- Batch requests where possible
- Contact support for higher limits

## Support

For issues or questions:

1. Check this documentation
2. Review API response error messages
3. Contact support@example.com
4. Check API status page
