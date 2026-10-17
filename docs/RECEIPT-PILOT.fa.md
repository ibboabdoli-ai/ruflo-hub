# آزمایش RuFlo روی Ibbo Receipt AI

این آزمایش فقط روی کد عمومی مخزن `ibboabdoli-ai/Ibbo_Receipt_AI` در GitHub Actions انجام می‌شود و تغییری در مخزن اصلی یا Production نمی‌دهد.

- نسخه ثابت کد پروژه: `fa9ff4aecabdaeb05f2be54d4b7d649086d0fdd2`
- RuFlo: `3.56.10`
- تست RuFlo: راه‌اندازی در کپی موقت، فهرست ایجنت‌ها و `security scan --depth full`
- تست کد پروژه: Node.js 24، `npm test`، `npm run typecheck`، `npm run lint`
- بدون OpenAI API، Turso، Blob، دیتای مالی، کلیدهای محرمانه، Push، Merge یا Deploy
- خروجی خام بررسی امنیتی برای جلوگیری از افشای احتمالی در لاگ عمومی منتشر نمی‌شود
- از ابزار RuFlo استفاده می‌شود، اما انجام بازبینی چندایجنتی واقعی با مدل زبانی در این مرحله فعال نیست

برای اجرای دستی: [Workflow](https://github.com/ibboabdoli-ai/ruflo-hub/actions/workflows/ruflo-receipt-pilot.yml) → Run workflow.

نصب روی Runner موقت است؛ بعد از اجرای GitHub Actions از بین می‌رود. نتیجه فقط پس از موفقیت واقعی Jobها قابل تأیید است.
