# 📋 تتبع مهام مشروع Digital Mini Twin

هذا الملف يتبع التقدم في مراحل بناء "التوأم الرقمي".

## ✅ المراحل المكتملة
- [x] **المرحلة 1**: إعداد المشروع (Next.js 15 + Tailwind 4).
- [x] **المرحلة 2**: محرك Ollama + الذاكرة الهجينة.
- [x] **المرحلة 3**: API المحادثات (Streaming + Tool calling).
- [x] **المرحلة 4**: الأتمتة الإدراكية (Cron decay + Weekly snapshots).
- [x] **خاص**: إزالة Sentry بالكامل وإصلاح أخطاء بناء Webpack.

## 🔄 المهام الجارية (In Progress)
- [/] **المرحلة 5**: دمج Clerk Auth وتأمين المسارات.
    - [/] **استقرار البناء (Build Stabilization)**:
        - [ ] توحيد إصدارات OpenTelemetry في `package.json`.
        - [ ] إصلاح تعارض الأنواع في `observability-service.ts`.
        - [ ] تحديث `next.config.ts` لتجاهل موديولات Node-only.
    - [x] إعداد ClerkProvider والـ Webhooks.
    - [x] بناء صفحات الدخول (Sign-in / Sign-up) بتنسيق Cyberpunk.
    - [ ] إنشاء `src/middleware.ts` لتأمين المسارات.
    - [ ] تأمين API Routes باستخدام `auth()`.
    - [ ] ربط الـ Memory Engine بـ `userId` الفعلي.

## ⏳ المهام القادمة (Pending)
- [ ] **المرحلة 6**: طبقة الصوت LiveKit (Voice Layer).
- [ ] **المرحلة 7**: لوحة تجكم واجهة المستخدم (Dashboard UI).
- [ ] **المرحلة 8**: تدفق التهيئة للمستخدمين الجدد (Onboarding Flow).
- [ ] **المرحلة 9**: خريطة الذاكرة البصرية (Visual Memory Map / Canvas).
