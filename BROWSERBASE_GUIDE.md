# Browserbase Integration Guide

## ✅ Setup Complete

تم إعداد Browserbase بنجاح في مشروع MAS-ZERO Venture Lab.

---

## 📦 What Was Installed

### Dependencies
- **@browserbasehq/sdk@2.10.0** - Browserbase official SDK
- **playwright-core@1.59.1** - Browser automation engine

### Environment Variables
Added to `.env.local`:
```env
BROWSERBASE_API_KEY=bb_live_3isEejWJCMvqxzgJekLUIxBfs_Q
BROWSERBASE_PROJECT_ID=8e2b9b65-dc8f-4ad6-a7ca-33126043cb74
```

---

## 🏗️ Architecture

### Files Created

1. **[src/app/api/browserbase/session/route.ts](file:///Users/cryptojoker710/Desktop/DegitalTwin/src/app/api/browserbase/session/route.ts)**
   - REST API for managing browser sessions
   - `POST /api/browserbase/session` - Create session
   - `GET /api/browserbase/session?sessionId=xxx` - Get session details
   - `DELETE /api/browserbase/session` - Stop session

2. **[src/lib/browserbase/controller.ts](file:///Users/cryptojoker710/Desktop/DegitalTwin/src/lib/browserbase/controller.ts)**
   - High-level BrowserbaseController class
   - Playwright integration for automation
   - Helper methods for common tasks

3. **[src/app/api/browserbase/research/route.ts](file:///Users/cryptojoker710/Desktop/DegitalTwin/src/app/api/browserbase/research/route.ts)**
   - Example: Automated market research
   - Web scraping and data extraction
   - Session management demo

---

## 🚀 Usage Examples

### 1. Create a Browser Session

```typescript
import { browserbase } from '@/lib/browserbase/controller';

// Simple task execution
const result = await browserbase.executeTask(
  async (page) => {
    await page.goto('https://example.com');
    const title = await page.title();
    return { title };
  },
  { url: 'https://example.com' }
);
```

### 2. Take a Screenshot

```typescript
const screenshot = await browserbase.screenshot('https://example.com', {
  fullPage: true,
});
// Returns base64 encoded PNG
```

### 3. Extract Content

```typescript
// Extract all text
const content = await browserbase.extractContent('https://example.com');

// Extract specific element
const heading = await browserbase.extractContent(
  'https://example.com',
  'h1'
);
```

### 4. Submit Forms

```typescript
const result = await browserbase.submitForm(
  'https://example.com/login',
  {
    '#email': 'user@example.com',
    '#password': 'secret',
  }
);
```

### 5. Via REST API

```bash
# Create session
curl -X POST http://localhost:3000/api/browserbase/session \
  -H "Content-Type: application/json" \
  -d '{"keepAlive": true, "proxy": false}'

# Market research
curl -X POST http://localhost:3000/api/browserbase/research \
  -H "Content-Type: application/json" \
  -d '{"url": "https://producthunt.com"}'

# List sessions
curl http://localhost:3000/api/browserbase/research
```

---

## 🎯 Venture Lab Use Cases

### Opportunity Scout
```typescript
// Scan ProductHunt for new products
const opportunities = await browserbase.executeTask(async (page) => {
  await page.goto('https://www.producthunt.com');
  
  const products = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('[class*="item"]'))
      .map(el => ({
        name: el.querySelector('h3')?.textContent,
        description: el.querySelector('p')?.textContent,
        votes: el.querySelector('[class*="votes"]')?.textContent,
      }));
  });
  
  return products;
}, { url: 'https://www.producthunt.com' });
```

### Competitive Analysis
```typescript
// Monitor competitor pricing
const pricing = await browserbase.extractContent(
  'https://competitor.com/pricing',
  '.pricing-table'
);
```

### Market Research
```typescript
// Use the research API
const research = await fetch('/api/browserbase/research', {
  method: 'POST',
  body: JSON.stringify({ url: 'https://news.ycombinator.com' }),
});
```

---

## 🔧 Advanced Configuration

### Session Options

```typescript
const session = await browserbase.createSession({
  keepAlive: true,    // Keep session running after task
  proxy: true,        // Use Browserbase proxy
});
```

### Manual Browser Control

```typescript
const { sessionId, browser, page, debugUrl } = 
  await browserbase.createSession();

// Full Playwright API access
await page.goto('https://example.com');
await page.click('#button');
await page.fill('#input', 'text');

// Don't forget to stop!
await browserbase.stopSession(sessionId);
```

---

## 📊 Monitoring

### View Active Sessions

```typescript
const sessions = await browserbase.listSessions();
console.log(sessions);
```

### Browserbase Dashboard

Visit https://www.browserbase.com/ to:
- View all sessions
- Debug browser automation
- Monitor usage and costs
- Access session recordings

---

## ⚠️ Important Notes

1. **Always stop sessions** when done (unless `keepAlive: true`)
2. **Rate limits** apply based on your Browserbase plan
3. **Proxy usage** may incur additional costs
4. **Debug URL** provides live view of browser session
5. **Playwright API** is fully available - use any Playwright method

---

## 🐛 Troubleshooting

### Session Creation Fails
- Check `BROWSERBASE_API_KEY` is correct
- Verify project ID is valid
- Ensure you have available session quota

### Browser Connection Timeout
- Check network connectivity
- Verify `connectUrl` is accessible
- Increase timeout in page operations

### Page Navigation Fails
- Use `waitUntil: 'networkidle'` for complex pages
- Handle redirects explicitly
- Check for anti-bot protection

---

## 📚 Resources

- [Browserbase Docs](https://docs.browserbase.com/)
- [Playwright Docs](https://playwright.dev/)
- [Browserbase Dashboard](https://www.browserbase.com/)
- Project ID: `8e2b9b65-dc8f-4ad6-a7ca-33126043cb74`

---

## 🎓 Next Steps

1. Test the API endpoints
2. Integrate with Opportunity Scout agent
3. Build automated research workflows
4. Add to Venture Lab consensus engine
5. Set up monitoring and alerts
