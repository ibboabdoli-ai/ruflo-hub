# راه‌اندازی RuFlo Hub

این مخزن فعلاً یک مرکز تنظیمات مشترک است، نه سیستم فعال مدیریت ایجنت‌ها.

## وضعیت فعلی

مخزن رسمی پروژه:
https://github.com/ibboabdoli-ai/ruflo-hub

این مخزن ساخته شده است؛ دوباره Create repository را نزنید.

## آزمایش محلی

Node.js 22 یا جدیدتر لازم است. روی کامپیوتر مجاز خودتان اجرا کنید:

```bash
git clone https://github.com/ibboabdoli-ai/ruflo-hub.git
cd ruflo-hub
npm run validate
npm test
npm run projects
```

برای تست‌های فعلی نصب هیچ پکیجی لازم نیست.

## اضافه کردن پروژه

برای هر پروژه یک فایل از روی `templates/project.example.json` در پوشه `profiles/` بسازید. فعلاً همه پروژه‌ها disconnected و read_only هستند؛ دسترسی نوشتن و تغییر Production ندارند.

## امنیت

این مخزن Public است. کلید API، رمز، فایل مشتری و داده محرمانه در آن قرار ندهید. هر پروژه به محیط و مجوز مستقل نیاز دارد.

## نصب واقعی RuFlo

هنوز انجام نشده. برای اتصال واقعی باید یک محیط آزمایشی جدا، بازبینی امنیتی و مجوز مشخص تعریف شود.

ابزار اصلی: https://github.com/ruvnet/ruflo
