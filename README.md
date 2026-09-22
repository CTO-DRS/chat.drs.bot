<div align="center">

# 🤖 chat.drs.bot

**منصة دردشة ذكاء اصطناعي متكاملة — DRS AI Chat Platform**

بُنيت بـ Next.js و AI SDK مع مزوّد Z.AI المخصص وقاعدة بيانات SQLite

</div>

---

## 🇸🇦 نظرة عامة

**chat.drs.bot** هو تطبيق دردشة ذكاء اصطناعي متكامل (Full-stack) يدعم البث الفوري للردود، إنشاء المحتوى التفاعلي (Artifacts)، ومصادقة المستخدمين. المشروع مُكيَّف خصيصاً ليعمل مع مزوّد Z.AI المدمج وقاعدة بيانات SQLite محلية، مما يجعله خفيفاً وسهل النشر على أي خادم بدون الاعتماد على خدمات خارجية مدفوعة.

### المميزات

- 💬 **دردشة بالبث الفوري** — ردود لحظية متدفقة مع دعم استئناف المحادثات المقطوعة
- 📄 **المحتوى التفاعلي (Artifacts)** — إنشاء مستندات نصية، محرر كود Python، جداول بيانات، وصور مولدة بالذكاء الاصطناعي
- 🔐 **مصادقة مرنة** — دخول كضيف أو بالبريد الإلكتروني وكلمة المرور (Auth.js + bcrypt)
- 🗄️ **تخزين محلي** — حفظ كامل للمحادثات والرسائل والتصويتات في SQLite عبر Drizzle ORM
- 🧠 **مزوّد Z.AI المخصص** — تنفيذ `LanguageModelV4` متوافق مع OpenAI يدعم البث واستدعاء الأدوات والرؤية (تحليل الصور)
- 🗳️ **تصويت الرسائل** — تقييم ردود المساعد لتحسين جودة المحادثات
- ⚡ **اقتراحات ذكية** — أزرار اقتراحات جاهزة لبدء محادثات جديدة
- 🌐 **عربي RTL كامل** — واجهة ثنائية اللغة (عربي/إنجليزي) مع دعم الاتجاه من اليمين لليسار وخط IBM Plex Sans Arabic
- 🎙️ **إدخال صوتي** — إملاء صوتي مباشر داخل مربع الكتابة (Web Speech API) بالعربية والإنجليزية
- ⌨️ **اختصارات لوحة المفاتيح** — `Ctrl+K` بحث، `Ctrl+Shift+O` محادثة جديدة، `Ctrl+B` الشريط الجانبي، `Ctrl+/` قائمة الاختصارات
- 📊 **إحصائيات استخدام** — صفحة شخصية تعرض المحادثات والرسائل ونشاط آخر 7 أيام
- 📱 **تطبيق ويب تقدمي (PWA)** — قابل للتثبيت على الجوال مع أيقونات وبيانات manifest كاملة
- 📤 **تصدير المحادثات** — تنزيل أي محادثة بصيغة Markdown أو JSON
- 🩺 **فحص صحة** — نقطة نهاية `/api/health` عامة + HEALTHCHECK مدمج في Docker
- 🐳 **جاهز للنشر** — صورة Docker مدمجة مع دعم وحدة تخزين لقاعدة البيانات

### التقنيات المستخدمة

| الطبقة | التقنية |
|--------|---------|
| الواجهة | Next.js App Router · React 19 · Tailwind CSS · shadcn/ui · Radix UI |
| الذكاء الاصطناعي | AI SDK 7 · مزوّد Z.AI مخصص (`lib/ai/zai-provider.ts`) |
| قاعدة البيانات | SQLite (better-sqlite3) · Drizzle ORM |
| المصادقة | Auth.js (NextAuth v5) |
| الاختبارات | Playwright |

### البدء السريع

**المتطلبات:** Node.js 20+ · pnpm أو bun

```bash
# 1) استنساخ المشروع
git clone https://github.com/CTO-DRS/chat.drs.bot.git
cd chat.drs.bot

# 2) تثبيت الحزم
pnpm install          # أو: bun install

# 3) إعداد متغيرات البيئة
cp .env.example .env.local
# ثم عيّن قيمة AUTH_SECRET و DATABASE_PATH

# 4) إنشاء جداول قاعدة البيانات
pnpm db:push

# 5) تشغيل خادم التطوير
pnpm dev
```

سيعمل التطبيق على [localhost:3000](http://localhost:3000) 🎉

### متغيرات البيئة

| المتغير | مطلوب | الوصف |
|---------|-------|-------|
| `AUTH_SECRET` | ✅ | مفتاح توقيع جلسات المصادقة (`openssl rand -base64 32`) |
| `DATABASE_PATH` | ✅ | مسار ملف SQLite (الافتراضي: `db/drs-chat.db`) |
| `NEXT_PUBLIC_BASE_PATH` | ➖ | مسار فرعي عند النشر داخل مجلد (مثل `/chat`) |

> ⚠️ **تنبيه:** لا ترفع ملف `.env` أو `.env.local` إلى Git — فهما يحتويان على أسرار المصادقة.

### النشر باستخدام Docker

```bash
# بناء الصورة
docker build -t chat-drs-bot .

# التشغيل مع حفظ قاعدة البيانات في وحدة تخزين دائمة
docker run -d \
  -p 3000:3000 \
  -e AUTH_SECRET="$(openssl rand -base64 32)" \
  -v drs-chat-data:/app/db \
  --name drs-bot \
  chat-drs-bot
```

### هيكل المشروع

```
chat.drs.bot/
├── app/                    # صفحات التطبيق (دردشة، دخول، تسجيل)
│   ├── (auth)/             # المصادقة: login · register · actions
│   └── (chat)/             # واجهة الدردشة الرئيسية + API routes
├── artifacts/              # المحتوى التفاعلي: نص · كود · جداول · صور
├── components/             # مكونات واجهة المستخدم (shadcn/ui)
├── lib/
│   ├── ai/                 # مزوّد Z.AI · النماذج · الأدوات · الطلبات
│   └── db/                 # مخطط Drizzle · استعلامات SQLite
├── hooks/                  # React hooks مخصصة
├── scripts/                # سكربتات فحص واختبار
└── tests/                  # اختبارات Playwright الشاملة
```

### أوامر مفيدة

| الأمر | الوظيفة |
|-------|---------|
| `pnpm dev` | تشغيل خادم التطوير على المنفذ 3000 |
| `pnpm build` | بناء نسخة الإنتاج |
| `pnpm db:generate` | توليد ملفات ترحيل Drizzle |
| `pnpm db:push` | تطبيق المخطط على قاعدة البيانات |
| `pnpm db:studio` | فتح Drizzle Studio لاستعراض البيانات |
| `pnpm test` | تشغيل اختبارات Playwright |
| `pnpm fix` | إصلاح مشاكل التنسيق تلقائياً (Biome) |

---

## 🇬🇧 Overview (English)

**chat.drs.bot** is a full-stack AI chat application with streaming responses, interactive artifacts, and user authentication. It is adapted to run with a custom built-in Z.AI provider and a local SQLite database — lightweight, self-contained, and deployable on any server without external paid services.

**Key features:** streaming chat with resume support · text/code/sheet/image artifacts · guest & email/password auth (Auth.js) · SQLite persistence via Drizzle ORM · custom OpenAI-compatible `LanguageModelV4` provider with streaming, tool calling & vision · message voting · suggested actions · production-ready Docker image with a database volume.

**Quick start:**

```bash
pnpm install
cp .env.example .env.local   # set AUTH_SECRET & DATABASE_PATH
pnpm db:push
pnpm dev                     # → http://localhost:3000
```

**Environment variables:** `AUTH_SECRET` (required, session signing key) · `DATABASE_PATH` (required, SQLite file path) · `NEXT_PUBLIC_BASE_PATH` (optional, sub-directory serving).

**Docker:**

```bash
docker build -t chat-drs-bot .
docker run -d -p 3000:3000 -e AUTH_SECRET="$(openssl rand -base64 32)" -v drs-chat-data:/app/db --name drs-bot chat-drs-bot
```

No AI gateway key, Postgres, Redis, or Blob storage required — the Z.AI provider (`lib/ai/zai-provider.ts`) and SQLite handle everything locally.

---

<div align="center">

**DRS** · [github.com/CTO-DRS](https://github.com/CTO-DRS)

</div>
