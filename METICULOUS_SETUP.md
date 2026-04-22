# 🔬 Meticulous Integration - Session Recording & Auto-Testing

## Overview
Meticulous automatically records user sessions and generates/updating tests based on actual user behavior. This ensures comprehensive test coverage that evolves with your application.

## ✅ Setup Complete

### What Was Added:

#### 1. **Recorder Script in `src/app/layout.tsx`**
```tsx
<head>
  {/* Meticulous Recorder - Must be first script to instrument browser APIs */}
  {(process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview") && (
    <script
      data-recording-token="4Xpgf4D3rQQ7lbQLnTi8ITizL9f9jdzO5qmnIjmB"
      data-is-production-environment="false"
      src="https://snippet.meticulous.ai/v1/meticulous.js"
    />
  )}
  {/* ... other scripts */}
</head>
```

**Important Implementation Details:**
- ✅ Uses native `<script>` tag (NOT Next.js `<Script>` component)
- ✅ Placed as **first script** in `<head>` to instrument browser APIs before other scripts
- ✅ No `defer` or `async` attributes (synchronous loading required)
- ✅ Enabled only in `development` and `preview` environments
- ✅ Production recording disabled by default (`data-is-production-environment="false"`)

#### 2. **Environment Variables**
```env
# .env.local
METICULOUS_RECORDING_TOKEN="4Xpgf4D3rQQ7lbQLnTi8ITizL9f9jdzO5qmnIjmB"
```

---

## 🎯 How It Works

### Recording Flow:
1. **User visits your app** (development/preview environment)
2. **Meticulous script loads** and instruments browser APIs (`fetch`, `XMLHttpRequest`, etc.)
3. **All user actions recorded:**
   - Clicks, form submissions, navigation
   - Network requests and responses
   - API calls with headers/tokens
4. **Sessions uploaded** to Meticulous platform
5. **Tests automatically generated** from recorded sessions

### Auto-Testing Benefits:
- ✅ **Self-maintaining tests** - Tests update automatically as your app changes
- ✅ **Edge case coverage** - Captures real user behavior patterns
- ✅ **No manual test writing** - Tests generated from actual usage
- ✅ **CI/CD integration** - Run generated tests in your pipeline

---

## 🔧 Configuration Options

### Enable in Production (Optional)
If you want recording in production too:

```tsx
<script
  data-recording-token="4Xpgf4D3rQQ7lbQLnTi8ITizL9f9jdzO5qmnIjmB"
  data-is-production-environment="true"
  src="https://snippet.meticulous.ai/v1/meticulous.js"
/>
```

⚠️ **Security Warning:** Only enable in production if you trust all users in your Meticulous organization, as recorded network requests may include authorization tokens.

### Environment-Specific Setup

| Environment | Recording Status | Use Case |
|------------|------------------|----------|
| `localhost` (development) | ✅ Enabled | Developer testing with hot reload |
| Vercel Preview URLs | ✅ Enabled | QA testing on staging |
| Production | ❌ Disabled (default) | Protect user privacy |

---

## 📊 What Gets Recorded

### User Actions:
- ✅ Mouse clicks and interactions
- ✅ Form inputs and submissions
- ✅ Page navigation
- ✅ Scroll behavior
- ✅ Keyboard inputs

### Network Activity:
- ✅ `fetch()` requests and responses
- ✅ `XMLHttpRequest` calls
- ✅ GraphQL queries
- ✅ REST API calls
- ✅ Request/response headers

### ⚠️ Security Notes:
- **Passwords are automatically redacted**
- **Authorization tokens MAY be recorded** in headers
- **Only trusted users** should access your Meticulous organization
- **Review recorded sessions** periodically for sensitive data

---

## 🚀 Next Steps

### 1. Verify Recording is Working
```bash
# Run your app locally
pnpm dev

# Open browser devtools → Network tab
# Look for requests to: snippet.meticulous.ai
# You should see session data being uploaded
```

### 2. Check Meticulous Dashboard
Visit [Meticulous Dashboard](https://app.meticulous.ai) to:
- View recorded sessions
- Review auto-generated tests
- Configure test suites
- Set up CI/CD integration

### 3. Enable `/pages` Directory (If Needed)
Your project currently uses `/app` directory only. If you add `/pages` later, create `_document.tsx`:

```tsx
// pages/_document.tsx
import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html>
      <Head>
        {(process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview") && (
          <script
            data-recording-token="4Xpgf4D3rQQ7lbQLnTi8ITizL9f9jdzO5qmnIjmB"
            data-is-production-environment="false"
            src="https://snippet.meticulous.ai/v1/meticulous.js"
          />
        )}
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
```

### 4. Contact for `/app` Directory Testing
Meticulous documentation mentions:
> "If you want to setup testing for pages in your /app directory too then ping us at eng@meticulous.ai"

Email them to enable full test generation for Next.js App Router.

---

## 🔍 Troubleshooting

### Script Not Loading?
1. Check browser console for errors
2. Verify `NODE_ENV` or `VERCEL_ENV` is correct
3. Ensure recording token is valid
4. Check network tab for blocked requests

### No Sessions Appearing in Dashboard?
1. Verify you're in development/preview environment
2. Check browser console for upload errors
3. Ensure ad blocker is disabled
4. Wait 1-2 minutes for session processing

### Build Errors?
The script uses native HTML `<script>` tag, which is fully compatible with Next.js. If you encounter ESLint warnings:

```tsx
// eslint-disable-next-line @next/next/no-sync-scripts
<script ... />
```

---

## 📚 Resources

- **Meticulous Documentation:** https://docs.meticulous.ai
- **Dashboard:** https://app.meticulous.ai
- **Support:** eng@meticulous.ai
- **Setup Guide:** https://docs.meticulous.ai/recorder-script

---

## 🔐 Security Best Practices

1. ✅ **Limit organization access** - Only invite trusted team members
2. ✅ **Review recorded sessions** - Check for sensitive data exposure
3. ✅ **Use environment variables** - Never hardcode tokens in production
4. ✅ **Disable in production** (default) - Protect end-user privacy
5. ✅ **Monitor network requests** - Ensure no PII is being recorded
6. ✅ **Regular audits** - Review what data Meticulous is capturing

---

## 📝 Commit History

- **`d065c04`** - feat(meticulous): add session recording script for auto-testing in development/preview
  - Added recorder to `src/app/layout.tsx`
  - Added `METICULOUS_RECORDING_TOKEN` to `.env.local`
  - Updated `.env.example` template

---

**Last Updated:** April 22, 2026
