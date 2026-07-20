import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import {
  useGetPreferences,
  getGetPreferencesQueryKey,
} from "@workspace/api-client-react";
import { CATEGORIES, type Category } from "@/lib/categories";

export type Lang = "en" | "ar";

/** The translation key required for every canonical category. */
export type CategoryKey = `category.${Category}`;

/** English dictionary — the source of truth for the set of translation keys. */
const en = {
  // App / auth
  "app.name": "Ember",
  "auth.headline": "Keep your spending from catching fire.",
  "auth.subtitle":
    "Small daily expenses are like embers: harmless while you keep an eye on them, costly when you don't.",
  "auth.signIn": "Sign In to Ember",
  "notFound.title": "Page Not Found",
  "notFound.subtitle":
    "The page you are looking for has been moved or no longer exists.",

  // Navigation
  "nav.menu": "Menu",
  "nav.dashboard": "Dashboard",
  "nav.expenses": "Expenses",
  "nav.rituals": "Rituals",
  "nav.budget": "Budget",
  "nav.goals": "Goals",
  "nav.coach": "Ask Ember",
  "nav.myAccount": "My Account",
  "nav.logOut": "Log out",

  // Categories
  "category.Food & Drink": "Food & Drink",
  "category.Transport": "Transport",
  "category.Shopping": "Shopping",
  "category.Health": "Health",
  "category.Entertainment": "Entertainment",
  "category.Housing": "Housing",
  "category.Utilities": "Utilities",
  "category.Remittances": "Remittances",
  "category.Family support": "Family support",
  "category.Installments": "Installments",
  "category.Other": "Other",

  // Frequencies
  "frequency.daily": "Daily",
  "frequency.weekly": "Weekly",
  "frequency.monthly": "Monthly",
  "frequency.quarterly": "Quarterly",
  "frequency.yearly": "Yearly",
  "frequency.suffix.daily": "/ day",
  "frequency.suffix.weekly": "/ week",
  "frequency.suffix.monthly": "/ month",
  "frequency.suffix.quarterly": "/ quarter",
  "frequency.suffix.yearly": "/ year",

  // Common
  "common.amount": "Amount",
  "common.date": "Date",
  "common.category": "Category",
  "common.description": "Description",
  "common.descriptionPlaceholder": "What was this for?",
  "common.selectCategory": "Select a category",
  "common.allCategories": "All Categories",
  "common.saving": "Saving...",
  "common.saveChanges": "Save Changes",
  "common.total": "Total:",
  "common.pickDate": "Pick a date",
  "common.approx": "approx.",

  // Add / Edit expense
  "expense.add": "Add Expense",
  "expense.adding": "Adding...",
  "expense.log": "Log an Expense",
  "expense.edit": "Edit Expense",
  "toast.recordAdded.title": "Record added",
  "toast.recordAdded.desc": "Your expense has been successfully logged.",
  "toast.recordUpdated.title": "Record updated",
  "toast.recordUpdated.desc": "Your expense has been successfully updated.",
  "toast.addFailed.desc": "Failed to add expense. Please try again.",
  "toast.updateFailed.desc": "Failed to update expense. Please try again.",
  "toast.error.title": "Error",

  // Dashboard
  "dashboard.title": "Overview",
  "dashboard.subtitle": "Your money's temperature today.",
  "dashboard.todaysBurn": "Today's Burn",
  "dashboard.overLimit": "{amount} over your limit",
  "dashboard.leftToSpend": "{amount} left to spend safely",
  "dashboard.categoriesToday": "Categories Today",
  "dashboard.transaction": "transaction",
  "dashboard.transactions": "transactions",
  "dashboard.insights": "Insights",
  "dashboard.quietTitle": "Quiet on the front",
  "dashboard.quietDesc":
    "Your spending is perfectly aligned with your goals today.",

  // Dashboard — payday prompt
  "dashboard.paydayPrompt.title": "Budget payday to payday",
  "dashboard.paydayPrompt.desc":
    "Tell Ember which day your salary lands and budgets will follow your real salary cycle instead of the calendar month.",
  "dashboard.paydayPrompt.cta": "Set my payday",
  "dashboard.paydayPrompt.dismiss": "Dismiss",

  // Dashboard — salary cycle card
  "dashboard.cycle.thisCycle": "This salary cycle",
  "dashboard.cycle.thisMonth": "This month",
  "dashboard.cycle.daysToPayday": "{days} day to payday",
  "dashboard.cycle.daysToPaydayPlural": "{days} days to payday",
  "dashboard.cycle.spentSoFar": "Spent so far",
  "dashboard.cycle.percentOf": "{percent}% of {amount}",
  "dashboard.cycle.projected": "Projected",
  "dashboard.cycle.byPayday": "by payday",
  "dashboard.cycle.byMonthEnd": "by month end",
  "dashboard.cycle.stillCommitted": "Still committed",
  "dashboard.cycle.ofObligations": "of {amount} obligations",
  "dashboard.cycle.salary": "Salary",
  "dashboard.cycle.daysElapsed": "Days elapsed",
  "dashboard.cycle.dayOf": "day {current} of {total}",
  "dashboard.cycle.ofWindow": "of this window",
  "dashboard.cycle.dueBeforePayday": "Due before payday",
  "dashboard.cycle.dueBeforeMonthEnd": "Due before month end",

  // Stat cards
  "stats.monthSoFar": "Month so far",
  "stats.ofCeiling": "{percent}% of your ceiling",
  "stats.projectedMonthEnd": "Projected month-end",
  "stats.onPaceExceed": "On pace to exceed your ceiling",
  "stats.onPaceUnder": "On pace to stay under",
  "stats.underBudgetStreak": "Under-budget streak",
  "stats.day": "day",
  "stats.days": "days",
  "stats.atOrUnder": "at or under your daily limit",
  "stats.avgPerDay": "Average per day",
  "stats.acrossDays": "across {days} {unit} this month",

  // Expenses
  "expenses.title": "Logbook",
  "expenses.subtitle": "Every ember tracked and categorized.",
  "expenses.searchPlaceholder": "Search by description or amount...",
  "expenses.noRecords": "No records found",
  "expenses.emptyFiltered":
    "Try clearing your search or filters to see your expenses.",
  "expenses.emptyDefault":
    "Your logbook is empty. Time to add your first expense.",
  "expenses.clearFilters": "Clear Filters",
  "expenses.auto": "Auto",
  "expenses.confirmDelete": "Are you sure you want to delete this expense?",
  "toast.expenseDeleted.title": "Expense deleted",
  "toast.expenseDeleted.desc": "The record has been removed.",

  // Budget
  "budget.title": "Boundaries",
  "budget.subtitle": "Set your limits to prevent fires.",
  "budget.spendingLimits": "Spending Limits",
  "budget.spendingLimitsDesc":
    "Define how much oxygen your spending gets before we alert you.",
  "budget.dailyTarget": "Daily Target",
  "budget.dailyTargetDesc": "Your ideal max spending per day.",
  "budget.monthlyCeiling": "Monthly Ceiling",
  "budget.monthlyCeilingDesc":
    "The absolute max you want to spend in a month.",
  "budget.saveLimits": "Save Limits",
  "budget.whyLimitsWork": "Why limits work",
  "budget.whyLimits1":
    "A daily limit helps you make micro-decisions. Instead of stressing over a massive monthly number, you only have to think about today.",
  "budget.whyLimits2":
    "We'll let you know when you're getting close to your daily boundary so you can adjust your plans before the day is over.",
  "budget.salaryAnchoring": "Salary anchoring",
  "budget.salaryAnchoringDesc":
    "Tell Ember when your salary lands and budgets run payday to payday instead of by calendar month.",
  "budget.salaryPerPayday": "Salary per payday",
  "budget.salaryOptional": "Optional",
  "budget.dayItLands": "Day it lands",
  "budget.dayItLandsPlaceholder": "e.g. 25",
  "budget.dayItLandsDesc": "1–31 · leave both empty for calendar-month budgeting.",
  "budget.salaryAmountInvalid": "Enter a valid salary amount, or leave it empty.",
  "budget.salaryDayInvalid": "Pick a day between 1 and 31, or leave it empty.",
  "budget.alignmentCheck": "Alignment Check",
  "budget.alignmentDesc":
    "Your daily target equals {amount} over a typical 30-day month.",
  "budget.alignmentDescCycle":
    "Your daily target equals {amount} over a typical 30-day salary cycle.",
  "budget.ceiling": "Ceiling",
  "budget.cycleCeiling": "Cycle ceiling",
  "budget.payday": "Payday",
  "budget.paydayDay": "Day {day}",
  "toast.settingsSaved.title": "Settings saved",
  "toast.settingsSaved.desc":
    "Your Ember limits have been successfully updated.",
  "toast.limitsError.desc": "Could not update limits. Please try again.",

  // Preferences
  "prefs.title": "Preferences",
  "prefs.desc": "The currency Ember displays and how early it warns you.",
  "prefs.currency": "Currency",
  "prefs.currencyDesc": "How amounts are displayed everywhere.",
  "prefs.language": "Language",
  "prefs.languageDesc": "The language Ember speaks throughout the app.",
  "prefs.alertThreshold": "Alert threshold",
  "prefs.alertThresholdDesc": "Warn me once I've burned this much of a limit.",
  "prefs.save": "Save Preferences",
  "toast.invalidThreshold.title": "Invalid threshold",
  "toast.invalidThreshold.desc": "Pick a percentage between 50 and 100.",
  "toast.prefsSaved.title": "Preferences saved",
  "toast.prefsSaved.desc":
    "Ember now speaks your currency and warns at your pace.",
  "toast.prefsError.desc": "Could not save preferences. Please try again.",

  // Recurring
  "recurring.title": "Rituals",
  "recurring.subtitle": "Repeating expenses, logged for you automatically.",
  "recurring.add": "Add Recurring",
  "recurring.noRituals": "No rituals yet",
  "recurring.emptyDesc":
    "Rent, subscriptions, the gym, your daily coffee — add them once and Ember logs them on schedule, automatically.",
  "recurring.addFirst": "Add your first",
  "recurring.next": "Next: {date}",
  "recurring.paused": "Paused",
  "recurring.committedMonthly": "Committed each month",
  "recurring.activeRituals": "Active rituals",
  "recurring.howItWorks": "How rituals work",
  "recurring.how1":
    "Each ritual is logged into your logbook automatically on its schedule — daily, weekly on the start date's weekday, monthly, quarterly (great for rent paid four times a year) or yearly on its day of the month.",
  "recurring.how2":
    "Pause one and Ember stops logging it; resume and it picks up from today. Deleting a ritual never touches what's already in the logbook.",
  "recurring.editRitual": "Edit Ritual",
  "recurring.newRitual": "New Ritual",
  "recurring.name": "Name",
  "recurring.namePlaceholder": "Netflix, rent, gym…",
  "recurring.repeats": "Repeats",
  "recurring.startsOn": "Starts on",
  "recurring.startsOnDesc":
    "Pick a past date and Ember will backfill every occurrence since then.",
  "recurring.lightIt": "Light It",
  "recurring.confirmDelete":
    "Delete this recurring expense? Entries already in your logbook will stay.",
  "toast.ritualUpdated.title": "Ritual updated",
  "toast.ritualLit.title": "Ritual lit",
  "toast.ritualBackfill.desc":
    "Ember logged every occurrence since the start date, and will keep going automatically.",
  "toast.ritualGoing.desc":
    "Ember will log this expense automatically from now on.",
  "toast.ritualSaveError.desc":
    "Could not save the recurring expense. Please try again.",
  "toast.ritualResumed.title": "Ritual resumed",
  "toast.ritualPaused.title": "Ritual paused",
  "toast.ritualResumed.desc":
    "Logging picks up from today — no catch-up entries for the paused stretch.",
  "toast.ritualPaused.desc":
    "Ember will stop logging this one until you resume it.",
  "toast.ritualRemoved.title": "Ritual removed",
  "toast.ritualRemoved.desc": "Its logged entries remain in your logbook.",

  // Goals
  "goals.title": "Targets",
  "goals.subtitle": "Savings goals and no-spend challenges.",
  "goals.savingsGoals": "Savings Goals",
  "goals.newGoal": "New Goal",
  "goals.setGoal": "Set a Savings Goal",
  "goals.goalName": "Goal Name",
  "goals.goalNamePlaceholder": "Emergency Fund",
  "goals.targetAmount": "Target Amount",
  "goals.deadlineOptional": "Deadline (Optional)",
  "goals.perPaydayOptional": "Set aside per payday (Optional)",
  "goals.perPaydayHint": "Reserved from safe-to-spend each pay cycle",
  "goals.perPaydayBadge": "{amount} / payday",
  "goals.saveGoal": "Save Goal",
  "goals.noGoals": "No goals yet",
  "goals.noGoalsDesc": "Set a target to keep your spending intentional.",
  "goals.createFirst": "Create your first goal",
  "goals.by": "By {date}",
  "goals.update": "Update {name}",
  "goals.action": "Action",
  "goals.addFunds": "Add Funds",
  "goals.withdrawFunds": "Withdraw Funds",
  "goals.add": "Add",
  "goals.save": "Save",
  "toast.goalCreated.title": "Goal created",
  "toast.goalCreated.desc": "Your savings goal has been set.",
  "toast.goalDeleted.title": "Goal deleted",
  "toast.goalUpdated.title": "Goal updated",
  "toast.contributionLogged.title": "Contribution logged",

  // Challenges
  "challenges.title": "Challenges",
  "challenges.new": "New Challenge",
  "challenges.start": "Start a No-Spend Challenge",
  "challenges.name": "Challenge Name",
  "challenges.namePlaceholder": "No takeout November",
  "challenges.categoryToBlock": "Category to block",
  "challenges.blockAll": "Block ALL Spending",
  "challenges.duration": "Duration (Days)",
  "challenges.startDate": "Start Date",
  "challenges.startChallenge": "Start Challenge",
  "challenges.noActive": "No active challenges",
  "challenges.noActiveDesc": "Test your discipline with a no-spend window.",
  "challenges.startFirst": "Start a challenge",
  "challenges.failed": "Failed",
  "challenges.completed": "Completed",
  "challenges.active": "Active",
  "challenges.noSpendingOn": "No spending on {category}",
  "challenges.noSpendingAtAll": "No spending at all",
  "challenges.daysLabel": "{days} days",
  "challenges.dayN": "Day {n}",
  "challenges.brokenBy": "Broken by {count} {unit}. Try again!",
  "challenges.expense": "expense",
  "challenges.expenses": "expenses",
  "challenges.madeIt": "You made it! Challenge completed.",
  "toast.challengeStarted.title": "Challenge started",
  "toast.challengeStarted.desc": "You've got this!",
  "toast.challengeEnded.title": "Challenge ended",

  // Coach
  "coach.title": "Coach",
  "coach.subtitle": "Your personal money advisor.",
  "coach.newConversation": "New Conversation",
  "coach.conversation": "Conversation",
  "coach.noConversations": "No conversations yet. Start one to get advice!",
  "coach.askEmber": "Ask Ember",
  "coach.askEmberDesc":
    "I know your budget, your goals, and your spending habits. Ask me anything about your money.",
  "coach.startChatting": "Start Chatting",
  "coach.inputPlaceholder": "Ask about your budget...",
  "toast.conversationDeleted.title": "Conversation deleted",
} as const;

export type TranslationKey = keyof typeof en;

/** Arabic (Modern Standard Arabic) dictionary — same keys as English. */
const ar: Record<TranslationKey, string> = {
  // App / auth
  "app.name": "Ember",
  "auth.headline": "لا تدع إنفاقك يشتعل.",
  "auth.subtitle":
    "المصاريف اليومية الصغيرة كالجمرات: غير مؤذية طالما تراقبها، ومكلفة حين تغفل عنها.",
  "auth.signIn": "تسجيل الدخول إلى Ember",
  "notFound.title": "الصفحة غير موجودة",
  "notFound.subtitle": "الصفحة التي تبحث عنها قد نُقلت أو لم تعد موجودة.",

  // Navigation
  "nav.menu": "القائمة",
  "nav.dashboard": "الرئيسية",
  "nav.expenses": "المصاريف",
  "nav.rituals": "الطقوس",
  "nav.budget": "الميزانية",
  "nav.goals": "الأهداف",
  "nav.coach": "اسأل Ember",
  "nav.myAccount": "حسابي",
  "nav.logOut": "تسجيل الخروج",

  // Categories
  "category.Food & Drink": "طعام وشراب",
  "category.Transport": "النقل",
  "category.Shopping": "التسوق",
  "category.Health": "الصحة",
  "category.Entertainment": "الترفيه",
  "category.Housing": "السكن",
  "category.Utilities": "الفواتير والخدمات",
  "category.Remittances": "التحويلات المالية",
  "category.Family support": "إعالة الأسرة",
  "category.Installments": "الأقساط",
  "category.Other": "أخرى",

  // Frequencies
  "frequency.daily": "يومي",
  "frequency.weekly": "أسبوعي",
  "frequency.monthly": "شهري",
  "frequency.quarterly": "ربع سنوي",
  "frequency.yearly": "سنوي",
  "frequency.suffix.daily": "/ يوم",
  "frequency.suffix.weekly": "/ أسبوع",
  "frequency.suffix.monthly": "/ شهر",
  "frequency.suffix.quarterly": "/ ربع سنة",
  "frequency.suffix.yearly": "/ سنة",

  // Common
  "common.amount": "المبلغ",
  "common.date": "التاريخ",
  "common.category": "الفئة",
  "common.description": "الوصف",
  "common.descriptionPlaceholder": "على ماذا كان هذا الإنفاق؟",
  "common.selectCategory": "اختر فئة",
  "common.allCategories": "كل الفئات",
  "common.saving": "جارٍ الحفظ...",
  "common.saveChanges": "حفظ التغييرات",
  "common.total": "الإجمالي:",
  "common.pickDate": "اختر تاريخًا",
  "common.approx": "تقريبًا",

  // Add / Edit expense
  "expense.add": "إضافة مصروف",
  "expense.adding": "جارٍ الإضافة...",
  "expense.log": "تسجيل مصروف",
  "expense.edit": "تعديل المصروف",
  "toast.recordAdded.title": "تمت الإضافة",
  "toast.recordAdded.desc": "تم تسجيل مصروفك بنجاح.",
  "toast.recordUpdated.title": "تم التحديث",
  "toast.recordUpdated.desc": "تم تحديث مصروفك بنجاح.",
  "toast.addFailed.desc": "تعذّرت إضافة المصروف. حاول مرة أخرى.",
  "toast.updateFailed.desc": "تعذّر تحديث المصروف. حاول مرة أخرى.",
  "toast.error.title": "خطأ",

  // Dashboard
  "dashboard.title": "نظرة عامة",
  "dashboard.subtitle": "حرارة أموالك اليوم.",
  "dashboard.todaysBurn": "إنفاق اليوم",
  "dashboard.overLimit": "{amount} فوق حدّك",
  "dashboard.leftToSpend": "{amount} متبقية للإنفاق بأمان",
  "dashboard.categoriesToday": "فئات اليوم",
  "dashboard.transaction": "عملية",
  "dashboard.transactions": "عمليات",
  "dashboard.insights": "رؤى",
  "dashboard.quietTitle": "الأمور هادئة",
  "dashboard.quietDesc": "إنفاقك اليوم متوافق تمامًا مع أهدافك.",

  // Dashboard — payday prompt
  "dashboard.paydayPrompt.title": "ميزانية من راتب إلى راتب",
  "dashboard.paydayPrompt.desc":
    "أخبِر Ember بيوم وصول راتبك لتتبع الميزانيات دورة راتبك الفعلية بدلًا من الشهر الميلادي.",
  "dashboard.paydayPrompt.cta": "حدّد يوم راتبي",
  "dashboard.paydayPrompt.dismiss": "إغلاق",

  // Dashboard — salary cycle card
  "dashboard.cycle.thisCycle": "دورة الراتب الحالية",
  "dashboard.cycle.thisMonth": "هذا الشهر",
  "dashboard.cycle.daysToPayday": "{days} يوم حتى الراتب",
  "dashboard.cycle.daysToPaydayPlural": "{days} أيام حتى الراتب",
  "dashboard.cycle.spentSoFar": "المنفَق حتى الآن",
  "dashboard.cycle.percentOf": "{percent}% من {amount}",
  "dashboard.cycle.projected": "المتوقع",
  "dashboard.cycle.byPayday": "بحلول الراتب",
  "dashboard.cycle.byMonthEnd": "بحلول نهاية الشهر",
  "dashboard.cycle.stillCommitted": "التزامات متبقية",
  "dashboard.cycle.ofObligations": "من {amount} التزامات",
  "dashboard.cycle.salary": "الراتب",
  "dashboard.cycle.daysElapsed": "الأيام المنقضية",
  "dashboard.cycle.dayOf": "اليوم {current} من {total}",
  "dashboard.cycle.ofWindow": "من هذه الفترة",
  "dashboard.cycle.dueBeforePayday": "مستحق قبل الراتب",
  "dashboard.cycle.dueBeforeMonthEnd": "مستحق قبل نهاية الشهر",

  // Stat cards
  "stats.monthSoFar": "الشهر حتى الآن",
  "stats.ofCeiling": "{percent}% من سقفك",
  "stats.projectedMonthEnd": "المتوقع نهاية الشهر",
  "stats.onPaceExceed": "على وتيرة تتجاوز سقفك",
  "stats.onPaceUnder": "على وتيرة تبقيك تحت السقف",
  "stats.underBudgetStreak": "سلسلة الالتزام بالميزانية",
  "stats.day": "يوم",
  "stats.days": "أيام",
  "stats.atOrUnder": "عند حدّك اليومي أو أقل منه",
  "stats.avgPerDay": "المتوسط اليومي",
  "stats.acrossDays": "على مدى {days} {unit} هذا الشهر",

  // Expenses
  "expenses.title": "السجل",
  "expenses.subtitle": "كل جمرة مُتتبَّعة ومصنَّفة.",
  "expenses.searchPlaceholder": "ابحث بالوصف أو المبلغ...",
  "expenses.noRecords": "لا توجد سجلات",
  "expenses.emptyFiltered": "جرّب مسح البحث أو عوامل التصفية لعرض مصاريفك.",
  "expenses.emptyDefault": "سجلك فارغ. حان وقت إضافة أول مصروف.",
  "expenses.clearFilters": "مسح عوامل التصفية",
  "expenses.auto": "تلقائي",
  "expenses.confirmDelete": "هل أنت متأكد من حذف هذا المصروف؟",
  "toast.expenseDeleted.title": "تم حذف المصروف",
  "toast.expenseDeleted.desc": "تمت إزالة السجل.",

  // Budget
  "budget.title": "الحدود",
  "budget.subtitle": "اضبط حدودك لتمنع الحرائق.",
  "budget.spendingLimits": "حدود الإنفاق",
  "budget.spendingLimitsDesc": "حدّد كم من الأكسجين يحصل عليه إنفاقك قبل أن ننبّهك.",
  "budget.dailyTarget": "الهدف اليومي",
  "budget.dailyTargetDesc": "الحد الأقصى المثالي لإنفاقك في اليوم.",
  "budget.monthlyCeiling": "السقف الشهري",
  "budget.monthlyCeilingDesc": "أقصى مبلغ تريد إنفاقه في الشهر.",
  "budget.saveLimits": "حفظ الحدود",
  "budget.whyLimitsWork": "لماذا تنجح الحدود",
  "budget.whyLimits1":
    "يساعدك الحد اليومي على اتخاذ قرارات صغيرة. فبدلًا من القلق حيال رقم شهري ضخم، ما عليك سوى التفكير في يومك فقط.",
  "budget.whyLimits2":
    "سننبّهك عند اقترابك من حدّك اليومي كي تعدّل خططك قبل انتهاء اليوم.",
  "budget.salaryAnchoring": "ربط الراتب",
  "budget.salaryAnchoringDesc":
    "أخبِر Ember متى يصل راتبك لتسير الميزانيات من موعد راتب إلى آخر بدلًا من الشهر الميلادي.",
  "budget.salaryPerPayday": "الراتب لكل دورة",
  "budget.salaryOptional": "اختياري",
  "budget.dayItLands": "يوم وصوله",
  "budget.dayItLandsPlaceholder": "مثال: 25",
  "budget.dayItLandsDesc": "1–31 · اترك الحقلين فارغين لميزانية الشهر الميلادي.",
  "budget.salaryAmountInvalid": "أدخل مبلغ راتب صالحًا، أو اتركه فارغًا.",
  "budget.salaryDayInvalid": "اختر يومًا بين 1 و31، أو اتركه فارغًا.",
  "budget.alignmentCheck": "فحص التوافق",
  "budget.alignmentDesc": "هدفك اليومي يعادل {amount} خلال شهر نموذجي من 30 يومًا.",
  "budget.alignmentDescCycle":
    "هدفك اليومي يعادل {amount} خلال دورة راتب نموذجية من 30 يومًا.",
  "budget.ceiling": "السقف",
  "budget.cycleCeiling": "سقف الدورة",
  "budget.payday": "يوم الراتب",
  "budget.paydayDay": "اليوم {day}",
  "toast.settingsSaved.title": "تم حفظ الإعدادات",
  "toast.settingsSaved.desc": "تم تحديث حدود Ember بنجاح.",
  "toast.limitsError.desc": "تعذّر تحديث الحدود. حاول مرة أخرى.",

  // Preferences
  "prefs.title": "التفضيلات",
  "prefs.desc": "العملة التي يعرضها Ember ومدى تبكيره في تنبيهك.",
  "prefs.currency": "العملة",
  "prefs.currencyDesc": "كيفية عرض المبالغ في كل مكان.",
  "prefs.language": "اللغة",
  "prefs.languageDesc": "اللغة التي يتحدث بها Ember في التطبيق.",
  "prefs.alertThreshold": "حدّ التنبيه",
  "prefs.alertThresholdDesc": "نبّهني بمجرد أن أستنفد هذا القدر من الحد.",
  "prefs.save": "حفظ التفضيلات",
  "toast.invalidThreshold.title": "قيمة غير صالحة",
  "toast.invalidThreshold.desc": "اختر نسبة بين 50 و100.",
  "toast.prefsSaved.title": "تم حفظ التفضيلات",
  "toast.prefsSaved.desc": "يتحدث Ember الآن بعملتك وينبّهك على وتيرتك.",
  "toast.prefsError.desc": "تعذّر حفظ التفضيلات. حاول مرة أخرى.",

  // Recurring
  "recurring.title": "الطقوس",
  "recurring.subtitle": "مصاريف متكررة تُسجَّل لك تلقائيًا.",
  "recurring.add": "إضافة متكرر",
  "recurring.noRituals": "لا توجد طقوس بعد",
  "recurring.emptyDesc":
    "الإيجار والاشتراكات والنادي وقهوتك اليومية — أضِفها مرة واحدة ويسجّلها Ember في مواعيدها تلقائيًا.",
  "recurring.addFirst": "أضِف أول طقس",
  "recurring.next": "التالي: {date}",
  "recurring.paused": "متوقف",
  "recurring.committedMonthly": "الملتزم به شهريًا",
  "recurring.activeRituals": "الطقوس النشطة",
  "recurring.howItWorks": "كيف تعمل الطقوس",
  "recurring.how1":
    "يُسجَّل كل طقس في سجلك تلقائيًا وفق جدوله — يوميًا، أو أسبوعيًا في يوم تاريخ البدء، أو شهريًا، أو ربع سنوي (مثالي للإيجار المدفوع أربع مرات في السنة)، أو سنويًا في اليوم نفسه من الشهر.",
  "recurring.how2":
    "أوقِف طقسًا فيتوقف Ember عن تسجيله؛ واستأنفه فيتابع من اليوم. حذف الطقس لا يمسّ ما هو مُسجَّل بالفعل في السجل.",
  "recurring.editRitual": "تعديل الطقس",
  "recurring.newRitual": "طقس جديد",
  "recurring.name": "الاسم",
  "recurring.namePlaceholder": "نتفليكس، إيجار، نادي…",
  "recurring.repeats": "يتكرر",
  "recurring.startsOn": "يبدأ في",
  "recurring.startsOnDesc":
    "اختر تاريخًا سابقًا وسيسجّل Ember كل حدوث منذ ذلك الحين.",
  "recurring.lightIt": "أشعِلها",
  "recurring.confirmDelete":
    "حذف هذا المصروف المتكرر؟ ستبقى العناصر الموجودة في سجلك.",
  "toast.ritualUpdated.title": "تم تحديث الطقس",
  "toast.ritualLit.title": "تم إشعال الطقس",
  "toast.ritualBackfill.desc":
    "سجّل Ember كل حدوث منذ تاريخ البدء، وسيتابع تلقائيًا.",
  "toast.ritualGoing.desc": "سيسجّل Ember هذا المصروف تلقائيًا من الآن فصاعدًا.",
  "toast.ritualSaveError.desc": "تعذّر حفظ المصروف المتكرر. حاول مرة أخرى.",
  "toast.ritualResumed.title": "تم استئناف الطقس",
  "toast.ritualPaused.title": "تم إيقاف الطقس",
  "toast.ritualResumed.desc":
    "يبدأ التسجيل من اليوم — بلا إدخالات تعويضية عن فترة التوقف.",
  "toast.ritualPaused.desc": "سيتوقف Ember عن تسجيل هذا حتى تستأنفه.",
  "toast.ritualRemoved.title": "تمت إزالة الطقس",
  "toast.ritualRemoved.desc": "تبقى إدخالاته المُسجَّلة في سجلك.",

  // Goals
  "goals.title": "الأهداف",
  "goals.subtitle": "أهداف الادخار وتحديات الامتناع عن الإنفاق.",
  "goals.savingsGoals": "أهداف الادخار",
  "goals.newGoal": "هدف جديد",
  "goals.setGoal": "حدّد هدف ادخار",
  "goals.goalName": "اسم الهدف",
  "goals.goalNamePlaceholder": "صندوق الطوارئ",
  "goals.targetAmount": "المبلغ المستهدف",
  "goals.deadlineOptional": "الموعد النهائي (اختياري)",
  "goals.perPaydayOptional": "المبلغ المخصص كل راتب (اختياري)",
  "goals.perPaydayHint": "يُحجز من المبلغ الآمن للإنفاق في كل دورة راتب",
  "goals.perPaydayBadge": "{amount} / راتب",
  "goals.saveGoal": "حفظ الهدف",
  "goals.noGoals": "لا توجد أهداف بعد",
  "goals.noGoalsDesc": "حدّد هدفًا لتبقي إنفاقك واعيًا.",
  "goals.createFirst": "أنشئ أول هدف",
  "goals.by": "بحلول {date}",
  "goals.update": "تحديث {name}",
  "goals.action": "الإجراء",
  "goals.addFunds": "إضافة أموال",
  "goals.withdrawFunds": "سحب أموال",
  "goals.add": "إضافة",
  "goals.save": "حفظ",
  "toast.goalCreated.title": "تم إنشاء الهدف",
  "toast.goalCreated.desc": "تم تحديد هدف الادخار الخاص بك.",
  "toast.goalDeleted.title": "تم حذف الهدف",
  "toast.goalUpdated.title": "تم تحديث الهدف",
  "toast.contributionLogged.title": "تم تسجيل المساهمة",

  // Challenges
  "challenges.title": "التحديات",
  "challenges.new": "تحدٍّ جديد",
  "challenges.start": "ابدأ تحدي الامتناع عن الإنفاق",
  "challenges.name": "اسم التحدي",
  "challenges.namePlaceholder": "شهر بلا طلبات خارجية",
  "challenges.categoryToBlock": "الفئة المراد حظرها",
  "challenges.blockAll": "حظر كل الإنفاق",
  "challenges.duration": "المدة (أيام)",
  "challenges.startDate": "تاريخ البدء",
  "challenges.startChallenge": "ابدأ التحدي",
  "challenges.noActive": "لا توجد تحديات نشطة",
  "challenges.noActiveDesc": "اختبر انضباطك بفترة امتناع عن الإنفاق.",
  "challenges.startFirst": "ابدأ تحديًا",
  "challenges.failed": "فشل",
  "challenges.completed": "مكتمل",
  "challenges.active": "نشط",
  "challenges.noSpendingOn": "لا إنفاق على {category}",
  "challenges.noSpendingAtAll": "لا إنفاق على الإطلاق",
  "challenges.daysLabel": "{days} أيام",
  "challenges.dayN": "اليوم {n}",
  "challenges.brokenBy": "انكسر بسبب {count} {unit}. حاول مجددًا!",
  "challenges.expense": "مصروف",
  "challenges.expenses": "مصاريف",
  "challenges.madeIt": "لقد نجحت! اكتمل التحدي.",
  "toast.challengeStarted.title": "بدأ التحدي",
  "toast.challengeStarted.desc": "أنت قادر على هذا!",
  "toast.challengeEnded.title": "انتهى التحدي",

  // Coach
  "coach.title": "المرشد",
  "coach.subtitle": "مستشارك المالي الشخصي.",
  "coach.newConversation": "محادثة جديدة",
  "coach.conversation": "محادثة",
  "coach.noConversations": "لا توجد محادثات بعد. ابدأ واحدة للحصول على نصيحة!",
  "coach.askEmber": "اسأل Ember",
  "coach.askEmberDesc":
    "أعرف ميزانيتك وأهدافك وعاداتك في الإنفاق. اسألني أي شيء عن أموالك.",
  "coach.startChatting": "ابدأ المحادثة",
  "coach.inputPlaceholder": "اسأل عن ميزانيتك...",
  "toast.conversationDeleted.title": "تم حذف المحادثة",
};

const dictionaries: Record<Lang, Record<TranslationKey, string>> = { en, ar };

export type TFunction = (
  key: TranslationKey,
  vars?: Record<string, string | number>,
) => string;

type I18nContextValue = {
  lang: Lang;
  t: TFunction;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function interpolate(template: string, vars?: Record<string, string | number>) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, name) =>
    name in vars ? String(vars[name]) : `{${name}}`,
  );
}

export function I18nProvider({ children }: { children: ReactNode }) {
  // Default to English while loading or unauthenticated.
  const { data } = useGetPreferences({
    query: { queryKey: getGetPreferencesQueryKey(), staleTime: 60_000 },
  });
  const lang: Lang = data?.language === "ar" ? "ar" : "en";

  useEffect(() => {
    const el = document.documentElement;
    el.dir = lang === "ar" ? "rtl" : "ltr";
    el.lang = lang;
  }, [lang]);

  const value = useMemo<I18nContextValue>(() => {
    const dict = dictionaries[lang];
    const t: TFunction = (key, vars) =>
      interpolate(dict[key] ?? dictionaries.en[key] ?? String(key), vars);
    return { lang, t };
  }, [lang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Safe fallback so hooks never crash outside the provider.
    return {
      lang: "en",
      t: (key, vars) => interpolate(dictionaries.en[key] ?? String(key), vars),
    };
  }
  return ctx;
}

export function useT(): TFunction {
  return useI18n().t;
}

export function useLang(): Lang {
  return useI18n().lang;
}

/** Translate a canonical category name for display. */
export function categoryLabel(t: TFunction, category: string): string {
  const key = `category.${category}` as TranslationKey;
  return key in dictionaries.en ? t(key) : category;
}

// ---------------------------------------------------------------------------
// Compile-time i18n coverage guards (regression protection)
//
// These assertions have no runtime effect but make `tsc` (the `typecheck`
// script) fail if translation coverage regresses:
//   (a) Every canonical category id in lib/categories.ts must have both an
//       English and an Arabic label. Adding a category there without a
//       matching `category.<Name>` key here is a type error.
//   (b) EN and AR dictionaries share the same key set — enforced structurally
//       by `const ar: Record<TranslationKey, string>` above, and re-asserted
//       here so the guarantee is explicit and self-documenting.
// ---------------------------------------------------------------------------

// (a) Every canonical category must be a real translation key in EN and AR.
//     `CategoryKey` is `category.${Category}`; assigning it to `TranslationKey`
//     fails to compile if any category lacks a `category.<Name>` entry.
type _CategoryKeysExistInEn = CategoryKey extends TranslationKey ? true : never;
const _categoryKeysExistInEn: _CategoryKeysExistInEn = true;

// Runtime-shaped exhaustive maps: TypeScript requires an entry for EVERY
// canonical category id, so a missing Arabic (or English) label is a tsc error.
const _enCategoryLabels: Record<Category, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c, en[`category.${c}` as const]]),
) as Record<Category, string>;
const _arCategoryLabels: Record<Category, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c, ar[`category.${c}` as const]]),
) as Record<Category, string>;

// (b) EN and AR key sets are identical (both keyed by TranslationKey).
type _EnKeys = keyof typeof en;
type _ArKeys = keyof typeof ar;
type _KeysMatch = [_EnKeys] extends [_ArKeys]
  ? [_ArKeys] extends [_EnKeys]
    ? true
    : never
  : never;
const _keysMatch: _KeysMatch = true;

// Reference the guards so unused-var linting/TS can't strip them.
void _categoryKeysExistInEn;
void _enCategoryLabels;
void _arCategoryLabels;
void _keysMatch;
