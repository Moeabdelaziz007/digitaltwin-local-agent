# 🔒 SECURITY NOTICE - Tokens & Credentials

## ⚠️ Critical Security Issues Fixed

### 1. Meticulous Recording Token
**Status:** ✅ FIXED

**Issue:** Token was hardcoded in `src/app/layout.tsx` and documentation files

**Fix Applied:**
- Changed from hardcoded value to environment variable: `process.env.NEXT_PUBLIC_METICULOUS_TOKEN`
- Token now stored in `.env.local` (gitignored)
- `.env.example` contains placeholder: `your-recording-token-here`

**Action Required:**
- If you've already committed with hardcoded token, run:
  ```bash
  git filter-branch --force --index-filter \
    "git rm --cached --ignore-unmatch src/app/layout.tsx" \
    --prune-empty --tag-name-filter cat -- --all
  ```
- Or better: rotate the token in Meticulous dashboard

### 2. Environment Variables Security
**Status:** ✅ PROPERLY CONFIGURED

All sensitive credentials are now in `.env.local`:
- ✅ `.env.local` is in `.gitignore`
- ✅ `.env.example` contains only placeholders
- ✅ No hardcoded secrets in source code

---

## 🔐 Best Practices Implemented

1. **Environment Variable Separation:**
   - Server-side: `GROQ_API_KEY`, `BROWSERBASE_API_KEY`, etc.
   - Client-side (public): `NEXT_PUBLIC_METICULOUS_TOKEN`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`

2. **Token Rotation Recommendations:**
   - Rotate any tokens that were previously committed
   - Use `.env.vault` or Vercel dashboard for production secrets
   - Never commit `.env.local`

3. **Access Control:**
   - Only trusted users should have access to Meticulous organization
   - Browserbase sessions should have rate limiting
   - Groq API has built-in rate limiting (30 req/min free tier)

---

## 📋 Current Security Status

| Service | Token Location | Status |
|---------|---------------|--------|
| Meticulous | `.env.local` | ✅ Secure |
| Groq | `.env.local` | ✅ Secure |
| Braintrust | `.env.local` | ✅ Secure |
| Browserbase | `.env.local` | ✅ Secure |
| Mixedbread AI | `.env.local` | ✅ Secure |
| LiveKit | `.env.local` | ✅ Secure |
| Clerk | `.env.local` | ✅ Secure |
| Sentry | `.env.local` | ✅ Secure |

---

## 🚨 If You Accidentally Committed Secrets

1. **Rotate the secret immediately** in the service dashboard
2. **Remove from git history:**
   ```bash
   # Install BFG Repo-Cleaner
   brew install bfg
   
   # Remove sensitive files
   bfg --delete-files .env.local
   
   # Or replace text
   bfg --replace-text passwords.txt
   ```
3. **Force push:**
   ```bash
   git push --force --all
   git push --force --tags
   ```

---

**Last Updated:** April 22, 2026
