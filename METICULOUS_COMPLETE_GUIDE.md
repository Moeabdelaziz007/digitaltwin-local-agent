# 🧪 Meticulous - Automated Visual Regression Testing

## What is Meticulous?

Meticulous is an automated visual regression testing tool that works by:

1. **Recording real user sessions** via lightweight JavaScript recorder
2. **Selecting golden set** - representative sessions that maximize coverage
3. **Replaying on every PR** - testing against new code changes automatically
4. **Visual diff comparison** - screenshots compared to baseline
5. **PR comments** - visual diff results posted as PR status checks

**Zero hand-written tests required** - generates tests from real user traffic!

---

## ✅ Current Setup Status

### Recorder Installation
- **Status:** ✅ INSTALLED
- **Location:** `src/app/layout.tsx`
- **Environment:** Development & Preview only (NOT production)
- **Token:** `NEXT_PUBLIC_METICULOUS_TOKEN` (environment variable)

### Implementation Details
```tsx
// src/app/layout.tsx
{(process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview") && (
  <script
    data-recording-token={process.env.NEXT_PUBLIC_METICULOUS_TOKEN || ""}
    data-is-production-environment="false"
    src="https://snippet.meticulous.ai/v1/meticulous.js"
  />
)}
```

**✅ Critical Requirements Met:**
- ✅ First script in `<head>` (before all other scripts)
- ✅ No `async` or `defer` attributes
- ✅ Native `<script>` tag (NOT Next.js `Script` component)
- ✅ In initial HTML (not dynamically injected)
- ✅ Environment variable (NOT hardcoded)

---

## 🚀 Next Steps

### Step 1: Verify Locally
```bash
# 1. Start your app
pnpm dev

# 2. Open browser and navigate to http://localhost:3000
# 3. Browse through different pages and interact
# 4. Check browser console for Meticulous messages

# 5. Verify recording in Network tab:
#    - snippet.meticulous.ai (script loading)
#    - app.meticulous.ai (session uploads)
```

### Step 2: Install Meticulous CLI
```bash
# Install globally
npm install -g @meticulous/cli

# Or use npx
npx @meticulous/cli
```

### Step 3: Test Locally with CLI
```bash
# Simulate replay
meticulous simulate --token $NEXT_PUBLIC_METICULOUS_TOKEN

# This will:
# 1. Download recorded sessions
# 2. Replay them against your local app
# 3. Show you any visual diffs
```

### Step 4: Setup CI Testing

#### Option 1: Vercel Preview URLs (RECOMMENDED for your setup)
Since you're using Vercel, this is the easiest approach:

1. **Connect Meticulous to Vercel:**
   - Go to Meticulous Dashboard → Settings → Integrations
   - Select Vercel
   - Authorize access

2. **Add to GitHub Actions:**
   Create `.github/workflows/meticulous.yml`:

```yaml
name: Meticulous Visual Tests

on:
  pull_request:
    branches: [main]

jobs:
  visual-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Install dependencies
        run: pnpm install

      - name: Build app
        run: pnpm build

      - name: Run Meticulous tests
        uses: Meticulous-AI/meticulous-action@v1
        with:
          api-token: ${{ secrets.METICULOUS_API_TOKEN }}
          preview-url: ${{ steps.deploy.outputs.url }}
```

3. **Add Meticulous API Token:**
   ```bash
   # In GitHub repo settings → Secrets → Add:
   METICULOUS_API_TOKEN=your_api_token_here
   ```

#### Option 2: Docker Container (For SSR apps)
If Vercel integration doesn't work:

```dockerfile
# Dockerfile.meticulous
FROM node:22-alpine

WORKDIR /app
COPY . .
RUN pnpm install
RUN pnpm build

EXPOSE 3000
CMD ["pnpm", "start"]
```

```yaml
# In GitHub Actions
- name: Build Docker image
  run: docker build -f Dockerfile.meticulous -t myapp .

- name: Run Meticulous tests
  uses: Meticulous-AI/meticulous-action@v1
  with:
    api-token: ${{ secrets.METICULOUS_API_TOKEN }}
    docker-image: myapp
```

---

## 🔧 Configuration & Tuning

### Fix False Positives
If you see diffs from dynamic content (timestamps, random IDs, etc.):

Create `meticulous.config.json`:
```json
{
  "ignore": {
    "selectors": [
      "[data-timestamp]",
      ".animate-pulse",
      "[data-random-id]"
    ],
    "attributes": [
      "data-testid",
      "aria-describedby"
    ]
  }
}
```

### Authentication Setup
If your app requires login:

```bash
# Create auth config
cat > .meticulous/auth.json << EOF
{
  "type": "clerk",
  "credentials": {
    "email": "test@example.com",
    "password": "testpassword"
  }
}
EOF
```

### Session Selection
Control which sessions are included in testing:

```bash
# View recorded sessions
meticulous sessions list

# Mark specific sessions as golden
meticulous sessions mark-golden <session-id>

# Remove sessions from golden set
meticulous sessions remove-golden <session-id>
```

---

## 📊 Dashboard & Monitoring

### Meticulous Dashboard
Visit: https://app.meticulous.ai

**Features:**
- View all recorded sessions
- Manage golden set
- Review visual diffs
- Configure test settings
- Monitor CI test results

### PR Integration
After setup, every PR will have:

1. **Status Check:** `Meticulous Visual Tests`
   - ✅ Pass: No visual changes
   - ❌ Fail: Visual diffs detected

2. **PR Comment:** Side-by-side diff images showing:
   - Baseline screenshot
   - New screenshot
   - Highlighted differences

---

## 🐛 Troubleshooting

### No Sessions Recording
**Problem:** Sessions not appearing in dashboard

**Solutions:**
1. Verify `NEXT_PUBLIC_METICULOUS_TOKEN` is set
2. Check browser console for errors
3. Ensure you're in dev/preview environment
4. Verify script is loading in Network tab
5. Disable ad blockers

### False Positive Diffs
**Problem:** Diffs from non-visual changes

**Solutions:**
1. Add selectors to `meticulous.config.json` ignore list
2. Use consistent data attributes
3. Mock random/timestamp values in test mode

### CI Failures
**Problem:** Tests failing in CI but not locally

**Solutions:**
1. Ensure preview URL is accessible
2. Check environment variables are set
3. Verify app builds successfully
4. Try Docker approach if SSR issues

---

## 📚 Resources

### Documentation
- **Getting Started:** https://app.meticulous.ai/docs
- **Onboarding Guide:** https://app.meticulous.ai/docs/onboarding-guide
- **Recorder Installation:** https://app.meticulous.ai/docs/recorder-installation
- **CI Setup:** https://app.meticulous.ai/docs/ci
- **Fix False Positives:** https://app.meticulous.ai/docs/how-to/fix-false-positives
- **FAQ & Troubleshooting:** https://app.meticulous.ai/docs/faq-and-troubleshooting
- **CLI Commands:** https://app.meticulous.ai/docs/reference/cli-commands

### Dashboard
- **Main Dashboard:** https://app.meticulous.ai
- **Your Recording Token:** Check Vercel environment variables

---

## 🎯 Best Practices

1. **Review Golden Set Regularly**
   - Remove outdated sessions
   - Add sessions for new features
   - Ensure coverage of critical paths

2. **Monitor Diffs**
   - Don't ignore all diffs - review each one
   - Fix legitimate visual regressions
   - Update baseline for intentional changes

3. **Keep Recorder Active**
   - Always on in dev/preview
   - Disable in production (privacy)
   - Monitor token usage

4. **CI Integration**
   - Run on every PR
   - Block merges on visual failures
   - Review diffs before approving

---

## 🔐 Security Notes

- ✅ Token stored in environment variable (NOT hardcoded)
- ✅ Recording disabled in production
- ✅ Only dev/preview environments capture sessions
- ⚠️ Only trusted users should access Meticulous dashboard
- ⚠️ Network requests may include auth headers (reviewed by Meticulous)

---

**Last Updated:** April 22, 2026  
**Status:** ✅ Recorder Installed - Awaiting CI Setup
