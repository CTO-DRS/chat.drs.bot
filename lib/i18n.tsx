"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type Locale = "en" | "ar";

type Dictionary = Record<string, string>;

const en: Dictionary = {
  "dialog.cancel": "Cancel",
  "dialog.deleteAllConfirm": "Delete All",
  "dialog.deleteAllDescription":
    "This action cannot be undone. This will permanently delete all your chats and remove them from our servers.",

  // Dialogs
  "dialog.deleteAllTitle": "Delete all chats?",
  "dialog.deleteConfirm": "Continue",
  "dialog.deleteDescription":
    "This action cannot be undone. This will permanently delete your chat and remove it from our servers.",
  "dialog.deleteTitle": "Are you absolutely sure?",
  "greeting.subtitle": "Ask a question, write code, or explore ideas.",

  // Greeting
  "greeting.title": "What can I help with?",
  "header.exportJson": "Export as JSON",

  // Header / export
  "header.exportMarkdown": "Export as Markdown",
  "input.attach": "Attach files",
  "input.editPlaceholder": "Edit your message...",
  "input.listening": "Listening...",

  // Input
  "input.placeholder": "Ask anything...",
  "input.visionRequired":
    "The selected model does not support images. Switch to a vision model or attach a PDF instead.",
  "input.voice": "Voice input",
  "input.voiceError": "Voice recognition failed, please try again.",
  "input.voicePermission": "Please allow microphone access to use voice input.",
  "input.voiceUnsupported": "Voice input is not supported in this browser.",
  "shortcuts.escToClose": "Press Esc to close",
  "shortcuts.newChat": "New chat",
  "shortcuts.search": "Search chats",
  "shortcuts.showHelp": "Show shortcuts",
  "shortcuts.subtitle": "Move faster with these keyboard combos.",

  // Shortcuts
  "shortcuts.title": "Keyboard shortcuts",
  "shortcuts.toggleSidebar": "Toggle sidebar",
  "sidebar.deleteAll": "Delete all",
  "sidebar.emptyHistory":
    "Your conversations will appear here once you start chatting!",
  "sidebar.history": "History",
  "sidebar.last7Days": "Last 7 days",
  "sidebar.last30Days": "Last 30 days",
  "sidebar.loading": "Loading...",
  "sidebar.loginToSave": "Login to save and revisit previous chats!",
  // Sidebar
  "sidebar.newChat": "New chat",
  "sidebar.noResults": "No chats matching",
  "sidebar.older": "Older",
  "sidebar.searchChats": "Search chats...",
  "sidebar.stats": "Usage stats",
  "sidebar.today": "Today",
  "sidebar.yesterday": "Yesterday",
  "stats.accountSince": "Chatting since",
  "stats.activity7Days": "Activity — last 7 days",
  "stats.chatsPerDay": "New chats",
  "stats.documents": "Artifacts",
  "stats.messagesPerDay": "Messages",
  "stats.mostRecentChat": "Most recent conversation",
  "stats.noChats": "No conversations yet — start chatting to see your stats!",
  "stats.subtitle": "Your personal activity overview",

  // Stats page
  "stats.title": "Usage statistics",
  "stats.totalChats": "Conversations",
  "stats.totalMessages": "Messages",
  "stats.upvoteRate": "Positive feedback",
  "stats.userMessages": "Your messages",
  "stats.viewAll": "View all conversations in the sidebar",
  "stats.votes": "Feedback votes",
  "toast.allChatsDeleted": "All chats deleted",

  // Toasts
  "toast.chatDeleted": "Chat deleted",

  // User nav
  "usernav.guest": "Guest",
  "usernav.language": "العربية",
  "usernav.login": "Login to your account",
  "usernav.shortcuts": "Keyboard shortcuts",
  "usernav.signOut": "Sign out",
  "usernav.toggleTheme": "Toggle theme",

  // Visibility
  "visibility.private": "Private",
  "visibility.privateDescription": "Only you can access this chat",
  "visibility.public": "Public",
  "visibility.publicDescription": "Anyone with the link can access this chat",
};

const ar: Dictionary = {
  "dialog.cancel": "إلغاء",
  "dialog.deleteAllConfirm": "حذف الكل",
  "dialog.deleteAllDescription":
    "لا يمكن التراجع عن هذا الإجراء. سيتم حذف جميع محادثاتك نهائياً وإزالتها من خوادمنا.",

  // Dialogs
  "dialog.deleteAllTitle": "حذف جميع المحادثات؟",
  "dialog.deleteConfirm": "متابعة",
  "dialog.deleteDescription":
    "لا يمكن التراجع عن هذا الإجراء. سيتم حذف محادثتك نهائياً وإزالتها من خوادمنا.",
  "dialog.deleteTitle": "هل أنت متأكد تماماً؟",
  "greeting.subtitle": "اطرح سؤالاً، اكتب كوداً، أو استكشف الأفكار.",

  // Greeting
  "greeting.title": "بمَ يمكنني مساعدتك؟",
  "header.exportJson": "تصدير كـ JSON",

  // Header / export
  "header.exportMarkdown": "تصدير كـ Markdown",
  "input.attach": "إرفاق ملفات",
  "input.editPlaceholder": "عدّل رسالتك...",
  "input.listening": "جارٍ الاستماع...",

  // Input
  "input.placeholder": "اسأل عن أي شيء...",
  "input.visionRequired":
    "النموذج المحدد لا يدعم الصور. بدّل إلى نموذج يدعم الرؤية أو أرفق ملف PDF بدلاً منه.",
  "input.voice": "إدخال صوتي",
  "input.voiceError": "تعذّر التعرف على الصوت، حاول مرة أخرى.",
  "input.voicePermission":
    "يرجى السماح بالوصول إلى الميكروفون لاستخدام الإدخال الصوتي.",
  "input.voiceUnsupported": "الإدخال الصوتي غير مدعوم في هذا المتصفح.",
  "shortcuts.escToClose": "اضغط Esc للإغلاق",
  "shortcuts.newChat": "محادثة جديدة",
  "shortcuts.search": "البحث في المحادثات",
  "shortcuts.showHelp": "عرض الاختصارات",
  "shortcuts.subtitle": "تنقّل بسرعة أكبر باستخدام هذه الاختصارات.",

  // Shortcuts
  "shortcuts.title": "اختصارات لوحة المفاتيح",
  "shortcuts.toggleSidebar": "إظهار/إخفاء الشريط الجانبي",
  "sidebar.deleteAll": "حذف الكل",
  "sidebar.emptyHistory": "ستظهر محادثاتك هنا بمجرد بدء الدردشة!",
  "sidebar.history": "السجل",
  "sidebar.last7Days": "آخر 7 أيام",
  "sidebar.last30Days": "آخر 30 يوماً",
  "sidebar.loading": "جارٍ التحميل...",
  "sidebar.loginToSave": "سجّل الدخول لحفظ محادثاتك والعودة إليها!",
  // Sidebar
  "sidebar.newChat": "محادثة جديدة",
  "sidebar.noResults": "لا توجد محادثات تطابق",
  "sidebar.older": "أقدم",
  "sidebar.searchChats": "ابحث في المحادثات...",
  "sidebar.stats": "إحصائيات الاستخدام",
  "sidebar.today": "اليوم",
  "sidebar.yesterday": "أمس",
  "stats.accountSince": "تستخدم الدردشة منذ",
  "stats.activity7Days": "النشاط — آخر 7 أيام",
  "stats.chatsPerDay": "محادثات جديدة",
  "stats.documents": "المصنّفات",
  "stats.messagesPerDay": "الرسائل",
  "stats.mostRecentChat": "أحدث محادثة",
  "stats.noChats": "لا توجد محادثات بعد — ابدأ الدردشة لترى إحصائياتك!",
  "stats.subtitle": "نظرة عامة على نشاطك الشخصي",

  // Stats page
  "stats.title": "إحصائيات الاستخدام",
  "stats.totalChats": "المحادثات",
  "stats.totalMessages": "الرسائل",
  "stats.upvoteRate": "التقييمات الإيجابية",
  "stats.userMessages": "رسائلك",
  "stats.viewAll": "اعرض جميع المحادثات في الشريط الجانبي",
  "stats.votes": "أصوات التقييم",
  "toast.allChatsDeleted": "تم حذف جميع المحادثات",

  // Toasts
  "toast.chatDeleted": "تم حذف المحادثة",

  // User nav
  "usernav.guest": "ضيف",
  "usernav.language": "English",
  "usernav.login": "تسجيل الدخول",
  "usernav.shortcuts": "اختصارات لوحة المفاتيح",
  "usernav.signOut": "تسجيل الخروج",
  "usernav.toggleTheme": "تبديل المظهر",

  // Visibility
  "visibility.private": "خاص",
  "visibility.privateDescription": "فقط أنت من يمكنه الوصول لهذه المحادثة",
  "visibility.public": "عام",
  "visibility.publicDescription": "أي شخص لديه الرابط يمكنه الوصول للمحادثة",
};

const dictionaries: Record<Locale, Dictionary> = { ar, en };

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  t: (key: string) => string;
  dir: "ltr" | "rtl";
};

const I18nContext = createContext<I18nContextValue | null>(null);

const LOCALE_STORAGE_KEY = "drs-locale";

function readInitialLocale(): Locale {
  if (typeof window === "undefined") {
    return "en";
  }

  const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);

  return stored === "ar" ? "ar" : "en";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    setLocaleState(readInitialLocale());
  }, []);

  useEffect(() => {
    const dir = locale === "ar" ? "rtl" : "ltr";
    const root = document.documentElement;

    root.setAttribute("dir", dir);
    root.setAttribute("lang", locale === "ar" ? "ar" : "en");
    root.style.setProperty("--drs-font-scale", locale === "ar" ? "1" : "1");
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
  }, []);

  const toggleLocale = useCallback(() => {
    setLocaleState((current) => {
      const next = current === "en" ? "ar" : "en";
      window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
      return next;
    });
  }, []);

  const t = useCallback(
    (key: string) => dictionaries[locale][key] ?? dictionaries.en[key] ?? key,
    [locale]
  );

  const value = useMemo<I18nContextValue>(
    () => ({
      dir: locale === "ar" ? "rtl" : "ltr",
      locale,
      setLocale,
      t,
      toggleLocale,
    }),
    [locale, setLocale, t, toggleLocale]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }

  return context;
}
