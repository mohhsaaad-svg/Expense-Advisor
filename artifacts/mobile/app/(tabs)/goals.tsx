import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState } from '@/components/ember/EmptyState';
import { ProgressBar } from '@/components/ember/ProgressBar';
import { Skeleton } from '@/components/ember/Skeleton';
import { CATEGORIES, currencySymbol, toDateKey } from '@/constants/categories';
import colorTokens from '@/constants/colors';
import { useColors } from '@/hooks/useColors';
import { useCurrency } from '@/hooks/useCurrency';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import type { Challenge, Goal } from '@workspace/api-client-react';
import {
  getListChallengesQueryKey,
  getListGoalsQueryKey,
  useContributeToGoal,
  useCreateChallenge,
  useCreateGoal,
  useDeleteChallenge,
  useDeleteGoal,
  useListChallenges,
  useListGoals,
  useUpdateGoal,
} from '@workspace/api-client-react';
import * as Haptics from 'expo-haptics';

const DEADLINE_CHOICES = [
  { label: 'No date', months: null },
  { label: '3 months', months: 3 },
  { label: '6 months', months: 6 },
  { label: '1 year', months: 12 },
] as const;

const DURATION_CHOICES = [7, 14, 21, 30] as const;
const QUICK_AMOUNTS = [10, 25, 50, 100] as const;

function addMonths(base: Date, months: number): Date {
  const d = new Date(base);
  d.setMonth(d.getMonth() + months);
  return d;
}

function formatDay(key: string): string {
  const d = new Date(`${key}T00:00:00`);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function confirmDelete(title: string, message: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    // RN's Alert is a no-op on web.
    // eslint-disable-next-line no-alert
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: onConfirm },
  ]);
}

export default function GoalsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { format, currency } = useCurrency();

  const todayKey = toDateKey(new Date());
  const goals = useListGoals({ query: { queryKey: getListGoalsQueryKey() } });
  const challenges = useListChallenges(
    { today: todayKey },
    { query: { queryKey: getListChallengesQueryKey({ today: todayKey }) } },
  );

  const deleteGoal = useDeleteGoal();
  const deleteChallenge = useDeleteChallenge();

  const [goalModal, setGoalModal] = useState<
    { mode: 'create' } | { mode: 'edit'; goal: Goal } | null
  >(null);
  const [contributeTo, setContributeTo] = useState<Goal | null>(null);
  const [challengeOpen, setChallengeOpen] = useState(false);

  const invalidateGoals = () =>
    queryClient.invalidateQueries({ queryKey: getListGoalsQueryKey() });
  const invalidateChallenges = () =>
    queryClient.invalidateQueries({ queryKey: getListChallengesQueryKey() });

  const removeGoal = (g: Goal) =>
    confirmDelete('Delete goal?', `"${g.name}" and its saved progress go away.`, () =>
      deleteGoal.mutate(
        { id: g.id },
        {
          onSuccess: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            invalidateGoals();
          },
        },
      ),
    );

  const removeChallenge = (c: Challenge) =>
    confirmDelete('Delete challenge?', `"${c.name}" will be removed.`, () =>
      deleteChallenge.mutate(
        { id: c.id },
        {
          onSuccess: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            invalidateChallenges();
          },
        },
      ),
    );

  const refreshing = goals.isRefetching || challenges.isRefetching;
  const onRefresh = () => {
    goals.refetch();
    challenges.refetch();
  };

  const topPad = Platform.OS === 'web' ? 67 + 12 : insets.top + 12;

  return (
    <>
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={[styles.content, { paddingTop: topPad }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        testID="screen-goals"
      >
        <Text style={[styles.screenTitle, { color: colors.foreground }]}>
          Goals
        </Text>

        {/* Savings goals */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Savings goals
            </Text>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setGoalModal({ mode: 'create' });
              }}
              style={({ pressed }) => [
                styles.newBtn,
                { backgroundColor: colors.accent, opacity: pressed ? 0.7 : 1 },
              ]}
              testID="button-new-goal"
            >
              <Ionicons name="add" size={15} color={colors.accentForeground} />
              <Text style={[styles.newBtnText, { color: colors.accentForeground }]}>
                New
              </Text>
            </Pressable>
          </View>

          {goals.isLoading ? (
            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderRadius: colorTokens.radius,
                },
              ]}
              testID="goals-loading"
            >
              <Skeleton width="55%" height={15} />
              <Skeleton width="40%" height={12} style={{ marginTop: 9 }} />
              <Skeleton height={10} radius={5} style={{ marginTop: 14 }} />
            </View>
          ) : goals.isError ? (
            <EmptyState
              icon="cloud-offline-outline"
              title="Couldn't load goals"
              actionLabel="Retry"
              onAction={() => goals.refetch()}
            />
          ) : (goals.data ?? []).length === 0 ? (
            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderRadius: colorTokens.radius,
                },
              ]}
            >
              <EmptyState
                icon="flag-outline"
                title="Nothing you're saving for yet"
                message="Give your money a destination — a trip, an emergency fund, a new bike. Ember tracks the progress and the coach keeps it in mind."
                actionLabel="Start a goal"
                onAction={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setGoalModal({ mode: 'create' });
                }}
              />
            </View>
          ) : (
            (goals.data ?? []).map((g) => {
              const pct =
                g.targetAmount > 0
                  ? Math.min(100, Math.round((g.savedAmount / g.targetAmount) * 100))
                  : 0;
              const reached = g.savedAmount >= g.targetAmount;
              return (
                <View
                  key={g.id}
                  style={[
                    styles.card,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      borderRadius: colorTokens.radius,
                    },
                  ]}
                  testID={`goal-card-${g.id}`}
                >
                  <View style={styles.cardTopRow}>
                    <Text
                      style={[styles.goalName, { color: colors.foreground }]}
                      numberOfLines={1}
                    >
                      {g.name}
                    </Text>
                    {reached ? (
                      <View
                        style={[styles.badge, { backgroundColor: colors.accent }]}
                      >
                        <Ionicons name="flame" size={11} color={colors.primary} />
                        <Text
                          style={[
                            styles.badgeText,
                            { color: colors.accentForeground },
                          ]}
                        >
                          Reached
                        </Text>
                      </View>
                    ) : null}
                    <Pressable
                      onPress={() => removeGoal(g)}
                      style={({ pressed }) => ({
                        opacity: pressed ? 0.5 : 1,
                        padding: 4,
                      })}
                      testID={`button-delete-goal-${g.id}`}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={17}
                        color={colors.mutedForeground}
                      />
                    </Pressable>
                  </View>
                  <Text style={[styles.goalMeta, { color: colors.mutedForeground }]}>
                    {format(g.savedAmount)} of {format(g.targetAmount)} · {pct}%
                    {g.deadline ? ` · by ${formatDay(g.deadline)}` : ''}
                  </Text>
                  <View style={{ marginTop: 10 }}>
                    <ProgressBar percent={pct} height={10} />
                  </View>
                  <View style={styles.goalActions}>
                    <Pressable
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setContributeTo(g);
                      }}
                      style={({ pressed }) => [
                        styles.actionBtn,
                        {
                          backgroundColor: colors.primary,
                          opacity: pressed ? 0.85 : 1,
                        },
                      ]}
                      testID={`button-contribute-${g.id}`}
                    >
                      <Ionicons
                        name="wallet-outline"
                        size={15}
                        color={colors.primaryForeground}
                      />
                      <Text
                        style={[
                          styles.actionBtnText,
                          { color: colors.primaryForeground },
                        ]}
                      >
                        Add money
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        Haptics.selectionAsync();
                        setGoalModal({ mode: 'edit', goal: g });
                      }}
                      style={({ pressed }) => [
                        styles.actionBtn,
                        {
                          backgroundColor: colors.secondary,
                          opacity: pressed ? 0.7 : 1,
                        },
                      ]}
                      testID={`button-edit-goal-${g.id}`}
                    >
                      <Ionicons
                        name="pencil-outline"
                        size={15}
                        color={colors.secondaryForeground}
                      />
                      <Text
                        style={[
                          styles.actionBtnText,
                          { color: colors.secondaryForeground },
                        ]}
                      >
                        Edit
                      </Text>
                    </Pressable>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* No-spend challenges */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              No-spend challenges
            </Text>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setChallengeOpen(true);
              }}
              style={({ pressed }) => [
                styles.newBtn,
                { backgroundColor: colors.accent, opacity: pressed ? 0.7 : 1 },
              ]}
              testID="button-new-challenge"
            >
              <Ionicons name="add" size={15} color={colors.accentForeground} />
              <Text style={[styles.newBtnText, { color: colors.accentForeground }]}>
                New
              </Text>
            </Pressable>
          </View>

          {challenges.isLoading ? (
            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderRadius: colorTokens.radius,
                },
              ]}
              testID="challenges-loading"
            >
              <Skeleton width="55%" height={15} />
              <Skeleton width="40%" height={12} style={{ marginTop: 9 }} />
              <Skeleton height={10} radius={5} style={{ marginTop: 14 }} />
            </View>
          ) : challenges.isError ? (
            <EmptyState
              icon="cloud-offline-outline"
              title="Couldn't load challenges"
              actionLabel="Retry"
              onAction={() => challenges.refetch()}
            />
          ) : (challenges.data ?? []).length === 0 ? (
            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderRadius: colorTokens.radius,
                },
              ]}
            >
              <EmptyState
                icon="trophy-outline"
                title="No challenges running"
                message="Try a week without takeout or a no-shopping month. Log an expense in that category and the streak breaks — honest accountability."
                actionLabel="Start a challenge"
                onAction={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setChallengeOpen(true);
                }}
              />
            </View>
          ) : (
            (challenges.data ?? []).map((c) => {
              const pct =
                c.durationDays > 0
                  ? Math.min(100, Math.round((c.daysElapsed / c.durationDays) * 100))
                  : 0;
              const statusStyle =
                c.status === 'active'
                  ? { bg: colors.accent, fg: colors.accentForeground, label: 'Active' }
                  : c.status === 'completed'
                    ? { bg: `${colors.success}1A`, fg: colors.success, label: 'Done' }
                    : { bg: `${colors.destructive}14`, fg: colors.destructive, label: 'Broken' };
              const notStarted = c.startDate > todayKey;
              return (
                <View
                  key={c.id}
                  style={[
                    styles.card,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      borderRadius: colorTokens.radius,
                    },
                  ]}
                  testID={`challenge-card-${c.id}`}
                >
                  <View style={styles.cardTopRow}>
                    <Text
                      style={[styles.goalName, { color: colors.foreground }]}
                      numberOfLines={1}
                    >
                      {c.name}
                    </Text>
                    <View style={[styles.badge, { backgroundColor: statusStyle.bg }]}>
                      <Text style={[styles.badgeText, { color: statusStyle.fg }]}>
                        {statusStyle.label}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => removeChallenge(c)}
                      style={({ pressed }) => ({
                        opacity: pressed ? 0.5 : 1,
                        padding: 4,
                      })}
                      testID={`button-delete-challenge-${c.id}`}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={17}
                        color={colors.mutedForeground}
                      />
                    </Pressable>
                  </View>
                  <Text style={[styles.goalMeta, { color: colors.mutedForeground }]}>
                    {c.category ?? 'All spending'} · {c.durationDays} days · from{' '}
                    {formatDay(c.startDate)}
                  </Text>
                  {c.status === 'active' ? (
                    <>
                      <View style={{ marginTop: 10 }}>
                        <ProgressBar percent={pct} height={10} />
                      </View>
                      <Text
                        style={[styles.challengeState, { color: colors.success }]}
                      >
                        {notStarted
                          ? `Starts ${formatDay(c.startDate)}`
                          : `Day ${Math.max(1, c.daysElapsed)} of ${c.durationDays} — clean so far`}
                      </Text>
                    </>
                  ) : c.status === 'completed' ? (
                    <Text
                      style={[styles.challengeState, { color: colors.success }]}
                    >
                      Finished clean — {c.durationDays} days without a slip
                    </Text>
                  ) : (
                    <Text
                      style={[styles.challengeState, { color: colors.destructive }]}
                    >
                      {c.violations} slip{c.violations === 1 ? '' : 's'} logged —
                      delete it and go again
                    </Text>
                  )}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {goalModal ? (
        <GoalFormModal
          goal={goalModal.mode === 'edit' ? goalModal.goal : null}
          currency={currency}
          onClose={() => setGoalModal(null)}
          onSaved={() => {
            setGoalModal(null);
            invalidateGoals();
          }}
        />
      ) : null}

      {contributeTo ? (
        <ContributeModal
          goal={contributeTo}
          currency={currency}
          format={format}
          onClose={() => setContributeTo(null)}
          onSaved={() => {
            setContributeTo(null);
            invalidateGoals();
          }}
        />
      ) : null}

      {challengeOpen ? (
        <ChallengeFormModal
          todayKey={todayKey}
          onClose={() => setChallengeOpen(false)}
          onSaved={() => {
            setChallengeOpen(false);
            invalidateChallenges();
          }}
        />
      ) : null}
    </>
  );
}

// ---------------------------------------------------------------------------
// Modals
// ---------------------------------------------------------------------------

function SheetShell({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior="padding" style={styles.sheetFlex}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.background,
              paddingBottom: insets.bottom + 20,
            },
          ]}
        >
          <View style={styles.sheetHandleWrap}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
          </View>
          <Text style={[styles.sheetTitle, { color: colors.foreground }]}>
            {title}
          </Text>
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function GoalFormModal({
  goal,
  currency,
  onClose,
  onSaved,
}: {
  goal: Goal | null;
  currency: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const colors = useColors();
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();

  const [name, setName] = useState(goal?.name ?? '');
  const [target, setTarget] = useState(goal ? String(goal.targetAmount) : '');
  // undefined = untouched (keep existing on edit); null = no date; string = new date
  const [deadline, setDeadline] = useState<string | null | undefined>(undefined);

  const parsedTarget = parseFloat(target.replace(',', '.'));
  const valid = name.trim().length > 0 && !Number.isNaN(parsedTarget) && parsedTarget > 0;
  const pending = createGoal.isPending || updateGoal.isPending;
  const failed = createGoal.isError || updateGoal.isError;

  const save = () => {
    if (!valid || pending) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (goal) {
      updateGoal.mutate(
        {
          id: goal.id,
          data: {
            name: name.trim(),
            targetAmount: parsedTarget,
            ...(deadline !== undefined ? { deadline } : {}),
          },
        },
        { onSuccess: onSaved },
      );
    } else {
      createGoal.mutate(
        {
          data: {
            name: name.trim(),
            targetAmount: parsedTarget,
            deadline: deadline ?? null,
          },
        },
        { onSuccess: onSaved },
      );
    }
  };

  const selectedDeadlineLabel = (months: number | null) => {
    if (deadline === undefined) return false;
    if (months === null) return deadline === null;
    return deadline === toDateKey(addMonths(new Date(), months));
  };

  return (
    <SheetShell title={goal ? 'Edit goal' : 'New goal'} onClose={onClose}>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>Name</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Emergency fund"
        placeholderTextColor={colors.mutedForeground}
        style={[
          styles.sheetInput,
          {
            color: colors.foreground,
            borderColor: colors.input,
            backgroundColor: colors.card,
            borderRadius: colorTokens.radius - 4,
          },
        ]}
        testID="input-goal-name"
      />

      <Text style={[styles.label, { color: colors.mutedForeground, marginTop: 14 }]}>
        Target amount
      </Text>
      <View
        style={[
          styles.amountWrap,
          {
            borderColor: colors.input,
            backgroundColor: colors.card,
            borderRadius: colorTokens.radius - 4,
          },
        ]}
      >
        <Text style={[styles.amountSymbol, { color: colors.mutedForeground }]}>
          {currencySymbol(currency)}
        </Text>
        <TextInput
          value={target}
          onChangeText={setTarget}
          keyboardType="decimal-pad"
          placeholder="500"
          placeholderTextColor={colors.mutedForeground}
          style={[styles.amountInput, { color: colors.foreground }]}
          testID="input-goal-target"
        />
      </View>

      <Text style={[styles.label, { color: colors.mutedForeground, marginTop: 14 }]}>
        Target date{goal?.deadline ? ` — currently ${formatDay(goal.deadline)}` : ''}
      </Text>
      <View style={styles.chipRow}>
        {DEADLINE_CHOICES.map((c) => {
          const active = selectedDeadlineLabel(c.months);
          return (
            <Pressable
              key={c.label}
              onPress={() => {
                Haptics.selectionAsync();
                setDeadline(
                  c.months === null ? null : toDateKey(addMonths(new Date(), c.months)),
                );
              }}
              style={[
                styles.choiceChip,
                { backgroundColor: active ? colors.primary : colors.secondary },
              ]}
              testID={`chip-deadline-${c.label.replace(/\s/g, '-')}`}
            >
              <Text
                style={[
                  styles.choiceChipText,
                  {
                    color: active
                      ? colors.primaryForeground
                      : colors.secondaryForeground,
                  },
                ]}
              >
                {c.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        onPress={save}
        disabled={!valid || pending}
        style={({ pressed }) => [
          styles.saveBtn,
          {
            backgroundColor: colors.primary,
            opacity: !valid || pending ? 0.45 : pressed ? 0.85 : 1,
          },
        ]}
        testID="button-save-goal"
      >
        {pending ? (
          <ActivityIndicator color={colors.primaryForeground} />
        ) : (
          <Text style={[styles.saveText, { color: colors.primaryForeground }]}>
            {goal ? 'Save changes' : 'Start saving'}
          </Text>
        )}
      </Pressable>
      {failed ? (
        <Text style={[styles.errorText, { color: colors.destructive }]}>
          Couldn't save — please try again.
        </Text>
      ) : null}
    </SheetShell>
  );
}

function ContributeModal({
  goal,
  currency,
  format,
  onClose,
  onSaved,
}: {
  goal: Goal;
  currency: string;
  format: (n: number) => string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const colors = useColors();
  const contribute = useContributeToGoal();
  const [amount, setAmount] = useState('');
  const [direction, setDirection] = useState<'add' | 'withdraw'>('add');

  const parsed = parseFloat(amount.replace(',', '.'));
  const valid = !Number.isNaN(parsed) && parsed > 0;
  const canWithdraw = goal.savedAmount > 0;

  const save = () => {
    if (!valid || contribute.isPending) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    contribute.mutate(
      {
        id: goal.id,
        data: { amount: direction === 'add' ? parsed : -parsed },
      },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          onSaved();
        },
      },
    );
  };

  return (
    <SheetShell title={goal.name} onClose={onClose}>
      <Text style={[styles.contributeMeta, { color: colors.mutedForeground }]}>
        {format(goal.savedAmount)} saved of {format(goal.targetAmount)}
      </Text>

      <View style={[styles.segmentWrap, { backgroundColor: colors.secondary }]}>
        {(['add', 'withdraw'] as const).map((d) => {
          const active = direction === d;
          const disabled = d === 'withdraw' && !canWithdraw;
          return (
            <Pressable
              key={d}
              disabled={disabled}
              onPress={() => {
                Haptics.selectionAsync();
                setDirection(d);
              }}
              style={[
                styles.segment,
                active && {
                  backgroundColor: colors.card,
                  borderRadius: colorTokens.radius - 6,
                },
                disabled && { opacity: 0.4 },
              ]}
              testID={`segment-${d}`}
            >
              <Text
                style={[
                  styles.segmentText,
                  {
                    color: active ? colors.foreground : colors.mutedForeground,
                  },
                ]}
              >
                {d === 'add' ? 'Add money' : 'Withdraw'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View
        style={[
          styles.amountWrap,
          {
            borderColor: colors.input,
            backgroundColor: colors.card,
            borderRadius: colorTokens.radius - 4,
            marginTop: 12,
          },
        ]}
      >
        <Text style={[styles.amountSymbol, { color: colors.mutedForeground }]}>
          {currencySymbol(currency)}
        </Text>
        <TextInput
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder="25"
          placeholderTextColor={colors.mutedForeground}
          autoFocus
          style={[styles.amountInput, { color: colors.foreground }]}
          testID="input-contribute-amount"
        />
      </View>

      <View style={styles.chipRow}>
        {QUICK_AMOUNTS.map((a) => (
          <Pressable
            key={a}
            onPress={() => {
              Haptics.selectionAsync();
              setAmount(String(a));
            }}
            style={[styles.choiceChip, { backgroundColor: colors.secondary }]}
            testID={`chip-amount-${a}`}
          >
            <Text
              style={[styles.choiceChipText, { color: colors.secondaryForeground }]}
            >
              {currencySymbol(currency)}
              {a}
            </Text>
          </Pressable>
        ))}
      </View>

      <Pressable
        onPress={save}
        disabled={!valid || contribute.isPending}
        style={({ pressed }) => [
          styles.saveBtn,
          {
            backgroundColor:
              direction === 'add' ? colors.primary : colors.secondary,
            opacity: !valid || contribute.isPending ? 0.45 : pressed ? 0.85 : 1,
          },
        ]}
        testID="button-confirm-contribute"
      >
        {contribute.isPending ? (
          <ActivityIndicator
            color={
              direction === 'add'
                ? colors.primaryForeground
                : colors.secondaryForeground
            }
          />
        ) : (
          <Text
            style={[
              styles.saveText,
              {
                color:
                  direction === 'add'
                    ? colors.primaryForeground
                    : colors.secondaryForeground,
              },
            ]}
          >
            {direction === 'add' ? 'Add to goal' : 'Withdraw'}
          </Text>
        )}
      </Pressable>
      {contribute.isError ? (
        <Text style={[styles.errorText, { color: colors.destructive }]}>
          Couldn't update — please try again.
        </Text>
      ) : null}
    </SheetShell>
  );
}

function ChallengeFormModal({
  todayKey,
  onClose,
  onSaved,
}: {
  todayKey: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const colors = useColors();
  const createChallenge = useCreateChallenge();
  const [name, setName] = useState('');
  const [durationDays, setDurationDays] = useState<number>(7);
  const [category, setCategory] = useState<string | null>(null);

  const valid = name.trim().length > 0;

  const save = () => {
    if (!valid || createChallenge.isPending) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    createChallenge.mutate(
      {
        data: {
          name: name.trim(),
          durationDays,
          category,
          startDate: todayKey,
        },
      },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          onSaved();
        },
      },
    );
  };

  return (
    <SheetShell title="New challenge" onClose={onClose}>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>Name</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="No takeout week"
        placeholderTextColor={colors.mutedForeground}
        style={[
          styles.sheetInput,
          {
            color: colors.foreground,
            borderColor: colors.input,
            backgroundColor: colors.card,
            borderRadius: colorTokens.radius - 4,
          },
        ]}
        testID="input-challenge-name"
      />

      <Text style={[styles.label, { color: colors.mutedForeground, marginTop: 14 }]}>
        Length
      </Text>
      <View style={styles.chipRow}>
        {DURATION_CHOICES.map((d) => {
          const active = durationDays === d;
          return (
            <Pressable
              key={d}
              onPress={() => {
                Haptics.selectionAsync();
                setDurationDays(d);
              }}
              style={[
                styles.choiceChip,
                { backgroundColor: active ? colors.primary : colors.secondary },
              ]}
              testID={`chip-duration-${d}`}
            >
              <Text
                style={[
                  styles.choiceChipText,
                  {
                    color: active
                      ? colors.primaryForeground
                      : colors.secondaryForeground,
                  },
                ]}
              >
                {d} days
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.label, { color: colors.mutedForeground, marginTop: 14 }]}>
        What's off limits
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryRow}
      >
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            setCategory(null);
          }}
          style={[
            styles.choiceChip,
            {
              backgroundColor:
                category === null ? colors.primary : colors.secondary,
            },
          ]}
          testID="chip-category-all"
        >
          <Text
            style={[
              styles.choiceChipText,
              {
                color:
                  category === null
                    ? colors.primaryForeground
                    : colors.secondaryForeground,
              },
            ]}
          >
            Everything
          </Text>
        </Pressable>
        {CATEGORIES.map((c) => {
          const active = category === c.name;
          return (
            <Pressable
              key={c.name}
              onPress={() => {
                Haptics.selectionAsync();
                setCategory(c.name);
              }}
              style={[
                styles.choiceChip,
                { backgroundColor: active ? colors.primary : colors.secondary },
              ]}
              testID={`chip-category-${c.name.replace(/[^a-zA-Z]/g, '')}`}
            >
              <Text
                style={[
                  styles.choiceChipText,
                  {
                    color: active
                      ? colors.primaryForeground
                      : colors.secondaryForeground,
                  },
                ]}
              >
                {c.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Pressable
        onPress={save}
        disabled={!valid || createChallenge.isPending}
        style={({ pressed }) => [
          styles.saveBtn,
          {
            backgroundColor: colors.primary,
            opacity: !valid || createChallenge.isPending ? 0.45 : pressed ? 0.85 : 1,
          },
        ]}
        testID="button-save-challenge"
      >
        {createChallenge.isPending ? (
          <ActivityIndicator color={colors.primaryForeground} />
        ) : (
          <Text style={[styles.saveText, { color: colors.primaryForeground }]}>
            Start challenge
          </Text>
        )}
      </Pressable>
      {createChallenge.isError ? (
        <Text style={[styles.errorText, { color: colors.destructive }]}>
          Couldn't create — please try again.
        </Text>
      ) : null}
    </SheetShell>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingBottom: 130,
    gap: 20,
  },
  screenTitle: {
    fontSize: 28,
    fontFamily: 'PlayfairDisplay_700Bold',
  },
  section: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Outfit_600SemiBold',
  },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  newBtnText: {
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
  },
  card: {
    padding: 16,
    borderWidth: 1,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  goalName: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Outfit_600SemiBold',
  },
  goalMeta: {
    fontSize: 12.5,
    fontFamily: 'Outfit_400Regular',
    marginTop: 3,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: 'Outfit_600SemiBold',
  },
  goalActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
  },
  actionBtnText: {
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
  },
  challengeState: {
    fontSize: 12.5,
    fontFamily: 'Outfit_500Medium',
    marginTop: 8,
  },
  sheetFlex: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(46,36,31,0.35)',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  sheetHandleWrap: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  sheetTitle: {
    fontSize: 19,
    fontFamily: 'Outfit_600SemiBold',
    marginBottom: 14,
  },
  label: {
    fontSize: 12.5,
    fontFamily: 'Outfit_500Medium',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  sheetInput: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15.5,
    fontFamily: 'Outfit_500Medium',
  },
  amountWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  amountSymbol: {
    fontSize: 16,
    fontFamily: 'Outfit_500Medium',
    marginRight: 4,
  },
  amountInput: {
    flex: 1,
    fontSize: 17,
    fontFamily: 'Outfit_600SemiBold',
    paddingVertical: 12,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  categoryRow: {
    gap: 8,
    paddingVertical: 4,
  },
  choiceChip: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 999,
  },
  choiceChipText: {
    fontSize: 13,
    fontFamily: 'Outfit_500Medium',
  },
  contributeMeta: {
    fontSize: 13.5,
    fontFamily: 'Outfit_400Regular',
    marginBottom: 12,
  },
  segmentWrap: {
    flexDirection: 'row',
    borderRadius: colorTokens.radius - 4,
    padding: 3,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
  },
  segmentText: {
    fontSize: 13.5,
    fontFamily: 'Outfit_600SemiBold',
  },
  saveBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    paddingVertical: 14,
    borderRadius: 999,
  },
  saveText: {
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
  },
  errorText: {
    marginTop: 8,
    fontSize: 13,
    fontFamily: 'Outfit_500Medium',
    textAlign: 'center',
  },
});
