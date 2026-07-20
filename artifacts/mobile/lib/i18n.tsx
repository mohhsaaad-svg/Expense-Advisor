import React, {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import {
  getGetPreferencesQueryKey,
  useGetPreferences,
} from '@workspace/api-client-react';
import type { CategoryName } from '@/constants/categories';

// ---------------------------------------------------------------------------
// Supported languages
// ---------------------------------------------------------------------------

export type Lang = 'en' | 'ar';

/**
 * The dictionary shape is derived from the English dictionary below, so the
 * Arabic dictionary is forced by the type system to have identical keys.
 */
export type Dict = typeof en;
export type TKey = keyof Dict;

// ---------------------------------------------------------------------------
// English dictionary (source of truth for keys)
// ---------------------------------------------------------------------------

const en = {
  // Tabs
  'tab.today': 'Today',
  'tab.expenses': 'Expenses',
  'tab.coach': 'Coach',
  'tab.goals': 'Goals',
  'tab.budget': 'Budget',

  // Common
  'common.back': 'Back',
  'common.retry': 'Retry',
  'common.cancel': 'Cancel',
  'common.delete': 'Delete',
  'common.keepIt': 'Keep it',
  'common.saved': 'Saved',
  'common.new': 'New',
  'common.edit': 'Edit',
  'common.saveChanges': 'Save changes',
  'common.saveErrorRetry': "Couldn't save — please try again.",

  // Categories (must match constants/categories.ts English names)
  'cat.Food & Drink': 'Food & Drink',
  'cat.Transport': 'Transport',
  'cat.Shopping': 'Shopping',
  'cat.Health': 'Health',
  'cat.Entertainment': 'Entertainment',
  'cat.Housing': 'Housing',
  'cat.Utilities': 'Utilities',
  'cat.Remittances': 'Remittances',
  'cat.Family support': 'Family support',
  'cat.Installments': 'Installments',
  'cat.Other': 'Other',

  // Date labels
  'date.today': 'Today',
  'date.yesterday': 'Yesterday',

  // Today screen
  'today.morning': 'Good morning',
  'today.afternoon': 'Good afternoon',
  'today.evening': 'Good evening',
  'today.title': "Today's burn",
  'today.couldntLoad': "Couldn't load today",
  'today.streak': '{n}-day streak',
  'today.ofDailyBudget': 'of {amount} daily budget',
  'today.expenseOne': 'expense',
  'today.expenseOther': 'expenses',
  'today.overBudget': '{amount} over budget',
  'today.stillGlowing': '{amount} still glowing',
  'today.thisMonth': 'This month',
  'today.thisSalaryCycle': 'This salary cycle',
  'today.daysToPaydayOne': '{n} day to payday',
  'today.daysToPaydayOther': '{n} days to payday',
  'today.paydayPromptTitle': 'Budget payday to payday',
  'today.paydayPromptText':
    'Set the day your salary lands and Ember budgets follow your real salary cycle instead of the calendar month.',
  'today.paydayPromptCta': 'Set my payday',
  'today.avgDayOf': 'day {day} of {total}',
  'today.committedBeforePayday': '{amount} still committed before payday',
  'today.committedBeforePaydayNext':
    '{amount} still committed before payday — next: {next}',
  'today.committedBeforeMonthEnd': '{amount} still committed before month end',
  'today.committedBeforeMonthEndNext':
    '{amount} still committed before month end — next: {next}',
  'today.spentSoFar': 'Spent so far',
  'today.percentOf': '{pct}% of {amount}',
  'today.projected': 'Projected',
  'today.pastCeiling': 'past your ceiling',
  'today.underCeiling': 'under your ceiling',
  'today.avgPerDay': 'Average / day',
  'today.overDaysOne': 'over {n} day',
  'today.overDaysOther': 'over {n} days',
  'today.streakLabel': 'Streak',
  'today.daysUnderBudget': 'days under budget',
  'today.ritualsHintOne': '{n} ritual auto-logging ≈ {amount}/mo',
  'today.ritualsHintOther': '{n} rituals auto-logging ≈ {amount}/mo',
  'today.headsUp': 'Heads up',
  'today.whereItWent': 'Where it went',
  'today.pctOfToday': '{pct}% of today',
  'today.thisWeek': 'This week',
  'today.weekTotal': 'Week total',
  'today.dailyAverage': 'Daily average',
  'today.topCategory': 'Top category',

  // Expenses screen
  'expenses.title': 'Expenses',
  'expenses.all': 'All',
  'expenses.couldntLoad': "Couldn't load expenses",
  'expenses.noCategory': 'No {category} expenses',
  'expenses.nothingLogged': 'Nothing logged yet',
  'expenses.filterHint': 'Try a different category or clear the filter.',
  'expenses.firstHint':
    'Log your first expense and Ember will start watching the embers for you.',
  'expenses.addExpense': 'Add an expense',
  'expenses.auto': 'Auto',

  // Coach screen
  'coach.title': 'Coach',
  'coach.subtitle': 'Ember knows your numbers — ask away',
  'coach.suggestion1': 'How am I doing this month?',
  'coach.suggestion2': 'Where can I cut back?',
  'coach.suggestion3': 'Help me plan the rest of this week',
  'coach.couldntLoadChat': "Couldn't load this chat",
  'coach.askEmber': 'Ask Ember',
  'coach.askEmberBody':
    'Your coach sees your budget, spending and goals — answers are about your actual numbers, not generic advice.',
  'coach.thinking': 'Ember is looking at your numbers…',
  'coach.somethingWrong': 'Something went wrong — try again.',
  'coach.inputPlaceholder': 'Ask about your spending…',
  'coach.conversations': 'Conversations',
  'coach.newChat': 'New chat',
  'coach.historyEmpty': 'Nothing yet — your chats will show up here.',

  // Goals screen
  'goals.title': 'Goals',
  'goals.savingsGoals': 'Savings goals',
  'goals.couldntLoadGoals': "Couldn't load goals",
  'goals.nothingSaving': "Nothing you're saving for yet",
  'goals.nothingSavingBody':
    'Give your money a destination — a trip, an emergency fund, a new bike. Ember tracks the progress and the coach keeps it in mind.',
  'goals.startGoal': 'Start a goal',
  'goals.reached': 'Reached',
  'goals.goalMeta': '{saved} of {target} · {pct}%',
  'goals.goalMetaBy': '{saved} of {target} · {pct}% · by {date}',
  'goals.addMoney': 'Add money',
  'goals.noSpendChallenges': 'No-spend challenges',
  'goals.couldntLoadChallenges': "Couldn't load challenges",
  'goals.noChallenges': 'No challenges running',
  'goals.noChallengesBody':
    'Try a week without takeout or a no-shopping month. Log an expense in that category and the streak breaks — honest accountability.',
  'goals.startChallenge': 'Start a challenge',
  'goals.statusActive': 'Active',
  'goals.statusDone': 'Done',
  'goals.statusBroken': 'Broken',
  'goals.allSpending': 'All spending',
  'goals.challengeMeta': '{category} · {days} days · from {date}',
  'goals.startsOn': 'Starts {date}',
  'goals.dayOfClean': 'Day {day} of {total} — clean so far',
  'goals.finishedClean': 'Finished clean — {days} days without a slip',
  'goals.slipsOne': '{n} slip logged — delete it and go again',
  'goals.slipsOther': '{n} slips logged — delete it and go again',
  'goals.deleteGoalTitle': 'Delete goal?',
  'goals.deleteGoalBody': '"{name}" and its saved progress go away.',
  'goals.deleteChallengeTitle': 'Delete challenge?',
  'goals.deleteChallengeBody': '"{name}" will be removed.',

  // Goal form
  'goalForm.editGoal': 'Edit goal',
  'goalForm.newGoal': 'New goal',
  'goalForm.name': 'Name',
  'goalForm.namePlaceholder': 'Emergency fund',
  'goalForm.targetAmount': 'Target amount',
  'goalForm.targetPlaceholder': '500',
  'goalForm.perPayday': 'Set aside per payday (optional)',
  'goalForm.perPaydayHint': 'Reserved from safe-to-spend each pay cycle',
  'goals.perPaydayBadge': '{amount} / payday',
  'goalForm.targetDate': 'Target date',
  'goalForm.targetDateCurrent': 'Target date — currently {date}',
  'goalForm.noDate': 'No date',
  'goalForm.months3': '3 months',
  'goalForm.months6': '6 months',
  'goalForm.year1': '1 year',
  'goalForm.startSaving': 'Start saving',

  // Contribute
  'contribute.savedOf': '{saved} saved of {target}',
  'contribute.add': 'Add money',
  'contribute.withdraw': 'Withdraw',
  'contribute.amountPlaceholder': '25',
  'contribute.addToGoal': 'Add to goal',
  'contribute.updateErrorRetry': "Couldn't update — please try again.",

  // Challenge form
  'challengeForm.title': 'New challenge',
  'challengeForm.name': 'Name',
  'challengeForm.namePlaceholder': 'No takeout week',
  'challengeForm.length': 'Length',
  'challengeForm.daysN': '{n} days',
  'challengeForm.offLimits': "What's off limits",
  'challengeForm.everything': 'Everything',
  'challengeForm.startChallenge': 'Start challenge',
  'challengeForm.createErrorRetry': "Couldn't create — please try again.",

  // Budget screen
  'budget.title': 'Budget',
  'budget.couldntLoad': "Couldn't load budget",
  'budget.spendingLimits': 'Spending limits',
  'budget.spendingLimitsSub':
    'Ember watches these and nudges you before things flare up.',
  'budget.dailyLimit': 'Daily limit',
  'budget.perDay': '/ day',
  'budget.monthlyLimit': 'Monthly limit',
  'budget.perMonth': '/ month',
  'budget.saveLimits': 'Save limits',
  'budget.dailyMonthlyHint':
    '{daily} a day adds up to about {monthly} a month — your monthly cap is {cap}.',
  'budget.rituals': 'Rituals',
  'budget.ritualsAutoSub': 'Auto-logged on schedule — about {amount} a month right now.',
  'budget.ritualsSub': 'Repeating expenses Ember logs for you automatically.',
  'budget.ritualsEmpty':
    'Nothing repeats yet. Add rent, subscriptions or your daily coffee — set it once and forget it.',
  'budget.freqDaily': 'Daily',
  'budget.freqWeekly': 'Weekly',
  'budget.freqMonthly': 'Monthly',
  'budget.freqQuarterly': 'Quarterly',
  'budget.freqYearly': 'Yearly',
  'budget.paused': 'paused',
  'budget.salaryLabel': 'Salary — payday to payday',
  'budget.salarySub':
    'Set the day your salary lands and Ember budgets from payday to payday instead of the calendar month.',
  'budget.salaryAmountPlaceholder': 'Salary',
  'budget.salaryDayPlaceholder': 'Day (1–31)',
  'budget.preferences': 'Preferences',
  'budget.preferencesSub': 'The currency Ember shows and how early it warns you.',
  'budget.currency': 'Currency',
  'budget.language': 'Language',
  'budget.alertThreshold': 'Alert threshold',
  'budget.ofALimit': 'of a limit',
  'budget.thresholdHint':
    "Ember raises a warning once you've burned this share of your daily or monthly limit.",
  'budget.savePreferences': 'Save preferences',
  'budget.account': 'Account',
  'budget.myAccount': 'My account',

  // Expense form
  'expenseForm.edit': 'Edit expense',
  'expenseForm.new': 'New expense',
  'expenseForm.category': 'Category',
  'expenseForm.description': 'Description',
  'expenseForm.descriptionPlaceholder': 'Flat white, bus ticket, groceries…',
  'expenseForm.date': 'Date',
  'expenseForm.saveErrorFields': "Couldn't save — check the fields and try again.",
  'expenseForm.logExpense': 'Log expense',
  'expenseForm.deleteTitle': 'Delete expense',
  'expenseForm.deleteBody': 'This ember goes out for good. Delete it?',

  // Recurring form
  'recurringForm.edit': 'Edit ritual',
  'recurringForm.new': 'New ritual',
  'recurringForm.name': 'Name',
  'recurringForm.namePlaceholder': 'Netflix, rent, gym…',
  'recurringForm.repeats': 'Repeats',
  'recurringForm.daily': 'Daily',
  'recurringForm.dailyHint': 'every day',
  'recurringForm.weekly': 'Weekly',
  'recurringForm.weeklyHint': 'same weekday',
  'recurringForm.monthly': 'Monthly',
  'recurringForm.monthlyHint': 'same day each month',
  'recurringForm.quarterly': 'Quarterly',
  'recurringForm.quarterlyHint': 'every 3 months',
  'recurringForm.yearly': 'Yearly',
  'recurringForm.yearlyHint': 'once a year',
  'recurringForm.category': 'Category',
  'recurringForm.startsOn': 'Starts on',
  'recurringForm.backfillHint':
    'Ember will log every occurrence since {date} the moment you save.',
  'recurringForm.startRitual': 'Start the ritual',
  'recurringForm.deleteTitle': 'Delete ritual',
  'recurringForm.deleteBody':
    'Ember stops logging it. Entries already in your logbook stay.',

  // Amount placeholder
  'form.amountPlaceholder': '0.00',

  // Login
  'login.headline': 'Keep your spending\nfrom catching fire.',
  'login.sub':
    "Small daily expenses are like embers — harmless while you keep an eye on them, costly when you don't.",
  'login.signIn': 'Sign in to continue',

  // Not found
  'notFound.title': 'Nothing burning here',
  'notFound.body': "This screen doesn't exist — the embers must have drifted.",
  'notFound.back': 'Back to Today',
};

// ---------------------------------------------------------------------------
// Arabic dictionary (Modern Standard Arabic, GCC-friendly)
// ---------------------------------------------------------------------------

const ar: Dict = {
  // Tabs
  'tab.today': 'اليوم',
  'tab.expenses': 'المصروفات',
  'tab.coach': 'المدرّب',
  'tab.goals': 'الأهداف',
  'tab.budget': 'الميزانية',

  // Common
  'common.back': 'رجوع',
  'common.retry': 'إعادة المحاولة',
  'common.cancel': 'إلغاء',
  'common.delete': 'حذف',
  'common.keepIt': 'الإبقاء عليه',
  'common.saved': 'تم الحفظ',
  'common.new': 'جديد',
  'common.edit': 'تعديل',
  'common.saveChanges': 'حفظ التغييرات',
  'common.saveErrorRetry': 'تعذّر الحفظ — يُرجى المحاولة مرة أخرى.',

  // Categories
  'cat.Food & Drink': 'المأكولات والمشروبات',
  'cat.Transport': 'المواصلات',
  'cat.Shopping': 'التسوّق',
  'cat.Health': 'الصحة',
  'cat.Entertainment': 'الترفيه',
  'cat.Housing': 'السكن',
  'cat.Utilities': 'الخدمات',
  'cat.Remittances': 'الحوالات',
  'cat.Family support': 'إعالة الأسرة',
  'cat.Installments': 'الأقساط',
  'cat.Other': 'أخرى',

  // Date labels
  'date.today': 'اليوم',
  'date.yesterday': 'أمس',

  // Today screen
  'today.morning': 'صباح الخير',
  'today.afternoon': 'مساء الخير',
  'today.evening': 'مساء الخير',
  'today.title': 'إنفاق اليوم',
  'today.couldntLoad': 'تعذّر تحميل بيانات اليوم',
  'today.streak': 'سلسلة {n} يوم',
  'today.ofDailyBudget': 'من ميزانية {amount} اليومية',
  'today.expenseOne': 'مصروف',
  'today.expenseOther': 'مصروفات',
  'today.overBudget': '{amount} فوق الميزانية',
  'today.stillGlowing': '{amount} لا تزال متاحة',
  'today.thisMonth': 'هذا الشهر',
  'today.thisSalaryCycle': 'دورة الراتب الحالية',
  'today.daysToPaydayOne': '{n} يوم على الراتب',
  'today.daysToPaydayOther': '{n} يوم على الراتب',
  'today.paydayPromptTitle': 'ميزانية من راتب إلى راتب',
  'today.paydayPromptText':
    'حدّد يوم نزول راتبك لتتبع ميزانية Ember دورة راتبك الفعلية بدلاً من الشهر الميلادي.',
  'today.paydayPromptCta': 'حدّد يوم راتبي',
  'today.avgDayOf': 'اليوم {day} من {total}',
  'today.committedBeforePayday': '{amount} ما زالت مرتبطة قبل الراتب',
  'today.committedBeforePaydayNext':
    '{amount} ما زالت مرتبطة قبل الراتب — التالي: {next}',
  'today.committedBeforeMonthEnd': '{amount} ما زالت مرتبطة قبل نهاية الشهر',
  'today.committedBeforeMonthEndNext':
    '{amount} ما زالت مرتبطة قبل نهاية الشهر — التالي: {next}',
  'today.spentSoFar': 'المصروف حتى الآن',
  'today.percentOf': '{pct}٪ من {amount}',
  'today.projected': 'المتوقّع',
  'today.pastCeiling': 'تجاوزت الحد',
  'today.underCeiling': 'ضمن الحد',
  'today.avgPerDay': 'المتوسط / يوم',
  'today.overDaysOne': 'خلال {n} يوم',
  'today.overDaysOther': 'خلال {n} يوم',
  'today.streakLabel': 'السلسلة',
  'today.daysUnderBudget': 'أيام ضمن الميزانية',
  'today.ritualsHintOne': '{n} عادة تُسجَّل تلقائياً ≈ {amount}/شهر',
  'today.ritualsHintOther': '{n} عادات تُسجَّل تلقائياً ≈ {amount}/شهر',
  'today.headsUp': 'تنبيه',
  'today.whereItWent': 'أين ذهبت',
  'today.pctOfToday': '{pct}٪ من اليوم',
  'today.thisWeek': 'هذا الأسبوع',
  'today.weekTotal': 'إجمالي الأسبوع',
  'today.dailyAverage': 'المتوسط اليومي',
  'today.topCategory': 'أكثر فئة',

  // Expenses screen
  'expenses.title': 'المصروفات',
  'expenses.all': 'الكل',
  'expenses.couldntLoad': 'تعذّر تحميل المصروفات',
  'expenses.noCategory': 'لا توجد مصروفات في {category}',
  'expenses.nothingLogged': 'لم يُسجَّل شيء بعد',
  'expenses.filterHint': 'جرّب فئة أخرى أو امسح عامل التصفية.',
  'expenses.firstHint':
    'سجّل أول مصروف وسيبدأ Ember بمراقبة إنفاقك من أجلك.',
  'expenses.addExpense': 'إضافة مصروف',
  'expenses.auto': 'تلقائي',

  // Coach screen
  'coach.title': 'المدرّب',
  'coach.subtitle': 'يعرف Ember أرقامك — اسأل بلا تردّد',
  'coach.suggestion1': 'كيف حال إنفاقي هذا الشهر؟',
  'coach.suggestion2': 'أين يمكنني التوفير؟',
  'coach.suggestion3': 'ساعدني في التخطيط لبقية هذا الأسبوع',
  'coach.couldntLoadChat': 'تعذّر تحميل هذه المحادثة',
  'coach.askEmber': 'اسأل Ember',
  'coach.askEmberBody':
    'يطّلع مدرّبك على ميزانيتك وإنفاقك وأهدافك — الإجابات مبنية على أرقامك الفعلية لا على نصائح عامة.',
  'coach.thinking': 'يطّلع Ember على أرقامك…',
  'coach.somethingWrong': 'حدث خطأ ما — حاول مرة أخرى.',
  'coach.inputPlaceholder': 'اسأل عن إنفاقك…',
  'coach.conversations': 'المحادثات',
  'coach.newChat': 'محادثة جديدة',
  'coach.historyEmpty': 'لا شيء بعد — ستظهر محادثاتك هنا.',

  // Goals screen
  'goals.title': 'الأهداف',
  'goals.savingsGoals': 'أهداف الادّخار',
  'goals.couldntLoadGoals': 'تعذّر تحميل الأهداف',
  'goals.nothingSaving': 'لا شيء تدّخر من أجله بعد',
  'goals.nothingSavingBody':
    'امنح مالك وجهة — رحلة، أو صندوق طوارئ، أو دراجة جديدة. يتابع Ember تقدّمك ويأخذه المدرّب في الحسبان.',
  'goals.startGoal': 'ابدأ هدفاً',
  'goals.reached': 'تحقّق',
  'goals.goalMeta': '{saved} من {target} · {pct}٪',
  'goals.goalMetaBy': '{saved} من {target} · {pct}٪ · بحلول {date}',
  'goals.addMoney': 'إضافة مبلغ',
  'goals.noSpendChallenges': 'تحدّيات عدم الإنفاق',
  'goals.couldntLoadChallenges': 'تعذّر تحميل التحدّيات',
  'goals.noChallenges': 'لا توجد تحدّيات جارية',
  'goals.noChallengesBody':
    'جرّب أسبوعاً دون طلبات خارجية أو شهراً دون تسوّق. سجّل مصروفاً في تلك الفئة فتنكسر السلسلة — مساءلة صادقة.',
  'goals.startChallenge': 'ابدأ تحدّياً',
  'goals.statusActive': 'جارٍ',
  'goals.statusDone': 'مكتمل',
  'goals.statusBroken': 'مكسور',
  'goals.allSpending': 'كل الإنفاق',
  'goals.challengeMeta': '{category} · {days} يوم · من {date}',
  'goals.startsOn': 'يبدأ {date}',
  'goals.dayOfClean': 'اليوم {day} من {total} — نظيف حتى الآن',
  'goals.finishedClean': 'اكتمل بنجاح — {days} يوم دون أي تجاوز',
  'goals.slipsOne': 'سُجّل {n} تجاوز — احذفه وابدأ من جديد',
  'goals.slipsOther': 'سُجّل {n} تجاوزات — احذفه وابدأ من جديد',
  'goals.deleteGoalTitle': 'حذف الهدف؟',
  'goals.deleteGoalBody': 'سيختفي «{name}» مع تقدّمه المدّخر.',
  'goals.deleteChallengeTitle': 'حذف التحدّي؟',
  'goals.deleteChallengeBody': 'سيُزال «{name}».',

  // Goal form
  'goalForm.editGoal': 'تعديل الهدف',
  'goalForm.newGoal': 'هدف جديد',
  'goalForm.name': 'الاسم',
  'goalForm.namePlaceholder': 'صندوق الطوارئ',
  'goalForm.targetAmount': 'المبلغ المستهدف',
  'goalForm.targetPlaceholder': '500',
  'goalForm.perPayday': 'المبلغ المخصص كل راتب (اختياري)',
  'goalForm.perPaydayHint': 'يُحجز من المبلغ الآمن للإنفاق في كل دورة راتب',
  'goals.perPaydayBadge': '{amount} / راتب',
  'goalForm.targetDate': 'التاريخ المستهدف',
  'goalForm.targetDateCurrent': 'التاريخ المستهدف — حالياً {date}',
  'goalForm.noDate': 'بلا تاريخ',
  'goalForm.months3': '٣ أشهر',
  'goalForm.months6': '٦ أشهر',
  'goalForm.year1': 'سنة',
  'goalForm.startSaving': 'ابدأ الادّخار',

  // Contribute
  'contribute.savedOf': '{saved} مدّخر من {target}',
  'contribute.add': 'إضافة مبلغ',
  'contribute.withdraw': 'سحب',
  'contribute.amountPlaceholder': '25',
  'contribute.addToGoal': 'أضف إلى الهدف',
  'contribute.updateErrorRetry': 'تعذّر التحديث — يُرجى المحاولة مرة أخرى.',

  // Challenge form
  'challengeForm.title': 'تحدٍّ جديد',
  'challengeForm.name': 'الاسم',
  'challengeForm.namePlaceholder': 'أسبوع دون طلبات خارجية',
  'challengeForm.length': 'المدة',
  'challengeForm.daysN': '{n} يوم',
  'challengeForm.offLimits': 'الممنوع',
  'challengeForm.everything': 'كل شيء',
  'challengeForm.startChallenge': 'ابدأ التحدّي',
  'challengeForm.createErrorRetry': 'تعذّر الإنشاء — يُرجى المحاولة مرة أخرى.',

  // Budget screen
  'budget.title': 'الميزانية',
  'budget.couldntLoad': 'تعذّر تحميل الميزانية',
  'budget.spendingLimits': 'حدود الإنفاق',
  'budget.spendingLimitsSub':
    'يراقب Ember هذه الحدود وينبّهك قبل أن تتجاوزها.',
  'budget.dailyLimit': 'الحد اليومي',
  'budget.perDay': '/ يوم',
  'budget.monthlyLimit': 'الحد الشهري',
  'budget.perMonth': '/ شهر',
  'budget.saveLimits': 'حفظ الحدود',
  'budget.dailyMonthlyHint':
    '{daily} يومياً تعادل نحو {monthly} شهرياً — حدّك الشهري هو {cap}.',
  'budget.rituals': 'العادات',
  'budget.ritualsAutoSub': 'تُسجَّل تلقائياً وفق الجدول — نحو {amount} شهرياً حالياً.',
  'budget.ritualsSub': 'مصروفات متكرّرة يسجّلها Ember نيابةً عنك تلقائياً.',
  'budget.ritualsEmpty':
    'لا شيء يتكرّر بعد. أضف الإيجار أو الاشتراكات أو قهوتك اليومية — اضبطها مرة وانسَها.',
  'budget.freqDaily': 'يومي',
  'budget.freqWeekly': 'أسبوعي',
  'budget.freqMonthly': 'شهري',
  'budget.freqQuarterly': 'ربع سنوي',
  'budget.freqYearly': 'سنوي',
  'budget.paused': 'متوقّف',
  'budget.salaryLabel': 'الراتب — من راتب إلى راتب',
  'budget.salarySub':
    'حدّد يوم نزول راتبك ليضع Ember الميزانية من راتب إلى راتب بدلاً من الشهر الميلادي.',
  'budget.salaryAmountPlaceholder': 'الراتب',
  'budget.salaryDayPlaceholder': 'اليوم (1–31)',
  'budget.preferences': 'التفضيلات',
  'budget.preferencesSub': 'العملة التي يعرضها Ember ومدى تبكيره في التنبيه.',
  'budget.currency': 'العملة',
  'budget.language': 'اللغة',
  'budget.alertThreshold': 'حدّ التنبيه',
  'budget.ofALimit': 'من الحد',
  'budget.thresholdHint':
    'يرفع Ember تنبيهاً بمجرّد أن تستهلك هذه النسبة من حدّك اليومي أو الشهري.',
  'budget.savePreferences': 'حفظ التفضيلات',
  'budget.account': 'الحساب',
  'budget.myAccount': 'حسابي',

  // Expense form
  'expenseForm.edit': 'تعديل المصروف',
  'expenseForm.new': 'مصروف جديد',
  'expenseForm.category': 'الفئة',
  'expenseForm.description': 'الوصف',
  'expenseForm.descriptionPlaceholder': 'قهوة، تذكرة حافلة، بقالة…',
  'expenseForm.date': 'التاريخ',
  'expenseForm.saveErrorFields': 'تعذّر الحفظ — راجع الحقول وحاول مرة أخرى.',
  'expenseForm.logExpense': 'تسجيل المصروف',
  'expenseForm.deleteTitle': 'حذف المصروف',
  'expenseForm.deleteBody': 'سيختفي هذا المصروف نهائياً. هل تريد حذفه؟',

  // Recurring form
  'recurringForm.edit': 'تعديل العادة',
  'recurringForm.new': 'عادة جديدة',
  'recurringForm.name': 'الاسم',
  'recurringForm.namePlaceholder': 'نتفليكس، إيجار، نادٍ رياضي…',
  'recurringForm.repeats': 'التكرار',
  'recurringForm.daily': 'يومي',
  'recurringForm.dailyHint': 'كل يوم',
  'recurringForm.weekly': 'أسبوعي',
  'recurringForm.weeklyHint': 'نفس يوم الأسبوع',
  'recurringForm.monthly': 'شهري',
  'recurringForm.monthlyHint': 'نفس اليوم كل شهر',
  'recurringForm.quarterly': 'ربع سنوي',
  'recurringForm.quarterlyHint': 'كل ٣ أشهر',
  'recurringForm.yearly': 'سنوي',
  'recurringForm.yearlyHint': 'مرة في السنة',
  'recurringForm.category': 'الفئة',
  'recurringForm.startsOn': 'يبدأ في',
  'recurringForm.backfillHint':
    'سيسجّل Ember كل تكرار منذ {date} فور الحفظ.',
  'recurringForm.startRitual': 'ابدأ العادة',
  'recurringForm.deleteTitle': 'حذف العادة',
  'recurringForm.deleteBody':
    'سيتوقّف Ember عن تسجيلها. تبقى الإدخالات الموجودة في سجلّك.',

  // Amount placeholder
  'form.amountPlaceholder': '0.00',

  // Login
  'login.headline': 'أبقِ إنفاقك\nتحت السيطرة.',
  'login.sub':
    'المصروفات اليومية الصغيرة كالجمر — لا ضرر منها ما دمت تراقبها، ومكلفة حين تُهملها.',
  'login.signIn': 'سجّل الدخول للمتابعة',

  // Not found
  'notFound.title': 'لا شيء هنا',
  'notFound.body': 'هذه الشاشة غير موجودة — لا بد أن الجمر قد تناثر.',
  'notFound.back': 'العودة إلى اليوم',
};

const DICTS: Record<Lang, Dict> = { en, ar };

// ---------------------------------------------------------------------------
// Category display names
//
// Typed as an EXHAUSTIVE Record over the canonical category id union. Adding a
// new category to constants/categories.ts (CATEGORY_NAMES) without an Arabic
// label here is a compile error, so translations can never silently drift.
// ---------------------------------------------------------------------------

const AR_CATEGORY_NAMES: Record<CategoryName, string> = {
  'Food & Drink': 'المأكولات والمشروبات',
  Transport: 'المواصلات',
  Shopping: 'التسوّق',
  Health: 'الصحة',
  Entertainment: 'الترفيه',
  Housing: 'السكن',
  Utilities: 'الخدمات',
  Remittances: 'الحوالات',
  'Family support': 'إعالة الأسرة',
  Installments: 'الأقساط',
  Other: 'أخرى',
};

// ---------------------------------------------------------------------------
// Translation function with {placeholder} interpolation
// ---------------------------------------------------------------------------

export type TFunc = (
  key: TKey,
  vars?: Record<string, string | number>,
) => string;

function makeT(lang: Lang): TFunc {
  const dict = DICTS[lang] ?? en;
  return (key, vars) => {
    let out = (dict[key] ?? en[key] ?? key) as string;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        out = out.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      }
    }
    return out;
  };
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface I18nValue {
  lang: Lang;
  isRTL: boolean;
  t: TFunc;
}

const I18nContext = createContext<I18nValue>({
  lang: 'en',
  isRTL: false,
  t: makeT('en'),
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const prefs = useGetPreferences({
    query: { queryKey: getGetPreferencesQueryKey(), staleTime: 60_000 },
  });
  const lang: Lang = prefs.data?.language === 'ar' ? 'ar' : 'en';

  const value = useMemo<I18nValue>(
    () => ({ lang, isRTL: lang === 'ar', t: makeT(lang) }),
    [lang],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  return useContext(I18nContext);
}

/** Convenience: just the translate function. */
export function useT(): TFunc {
  return useContext(I18nContext).t;
}

/** Convenience: the active language + RTL flag. */
export function useLang(): { lang: Lang; isRTL: boolean } {
  const { lang, isRTL } = useContext(I18nContext);
  return { lang, isRTL };
}

/**
 * Returns a function that maps a canonical category name (English, as stored
 * in constants/categories.ts and the API) to its localized display name.
 * Falls back to the raw name for user-defined / unknown categories.
 */
export function useCategoryName(): (name: string) => string {
  const { lang } = useContext(I18nContext);
  return (name: string) => {
    if (lang === 'ar') {
      // Canonical categories get their exhaustive Arabic label; user-defined /
      // unknown categories fall back to the raw stored name.
      return AR_CATEGORY_NAMES[name as CategoryName] ?? name;
    }
    return name;
  };
}
