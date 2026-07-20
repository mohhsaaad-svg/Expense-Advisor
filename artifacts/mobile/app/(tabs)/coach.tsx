import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState } from '@/components/ember/EmptyState';
import { Skeleton } from '@/components/ember/Skeleton';
import colorTokens from '@/constants/colors';
import { useColors } from '@/hooks/useColors';
import { streamAdvisorReply } from '@/lib/sse';
import { useLang, useT } from '@/lib/i18n';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import {
  getGetAnthropicConversationQueryKey,
  getListAnthropicConversationsQueryKey,
  useCreateAnthropicConversation,
  useDeleteAnthropicConversation,
  useGetAnthropicConversation,
  useListAnthropicConversations,
} from '@workspace/api-client-react';
import * as Haptics from 'expo-haptics';

/** Ember replies in markdown; keep mobile bubbles clean without a renderer. */
function cleanMarkdown(s: string): string {
  return s
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/^\s*[-*]\s+/gm, '• ');
}

function conversationDate(iso: string, lang: 'en' | 'ar'): string {
  const d = new Date(iso);
  try {
    return d.toLocaleDateString(lang === 'ar' ? 'ar-u-nu-latn' : 'en-US', {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}

export default function CoachScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const scrollRef = useRef<ScrollView>(null);
  const t = useT();
  const { lang, isRTL } = useLang();
  const rtlText = isRTL
    ? ({ writingDirection: 'rtl', textAlign: 'right' } as const)
    : undefined;
  const rowReverse = isRTL ? ({ flexDirection: 'row-reverse' } as const) : undefined;

  const SUGGESTIONS = [
    t('coach.suggestion1'),
    t('coach.suggestion2'),
    t('coach.suggestion3'),
  ];

  // null = not decided yet (auto-pick latest); 'new' = explicit fresh chat
  const [activeId, setActiveId] = useState<number | 'new' | null>(null);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState<{ user: string; reply: string } | null>(
    null,
  );
  const [isStreaming, setIsStreaming] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const conversations = useListAnthropicConversations({
    query: { queryKey: getListAnthropicConversationsQueryKey() },
  });
  const createConversation = useCreateAnthropicConversation();
  const deleteConversation = useDeleteAnthropicConversation();

  // Resume the most recent conversation on first load.
  useEffect(() => {
    if (activeId === null && conversations.data) {
      setActiveId(conversations.data[0]?.id ?? 'new');
    }
  }, [activeId, conversations.data]);

  const convoId = typeof activeId === 'number' ? activeId : 0;
  const convo = useGetAnthropicConversation(convoId, {
    query: {
      queryKey: getGetAnthropicConversationQueryKey(convoId),
      enabled: typeof activeId === 'number',
    },
  });

  const serverMessages = typeof activeId === 'number' ? (convo.data?.messages ?? []) : [];
  const convoFailed = convo.isError && typeof activeId === 'number';
  const showEmpty =
    !pending && serverMessages.length === 0 && !convo.isLoading && !convoFailed;

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || isStreaming) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDraft('');
    setErrorText(null);
    setIsStreaming(true);
    setPending({ user: content, reply: '' });
    try {
      let id = typeof activeId === 'number' ? activeId : null;
      if (id === null) {
        const created = await createConversation.mutateAsync({
          data: { title: 'New chat' },
        });
        id = created.id;
        setActiveId(id);
      }
      const { error } = await streamAdvisorReply({
        conversationId: id,
        content,
        onDelta: (d) =>
          setPending((p) => (p ? { ...p, reply: p.reply + d } : p)),
      });
      if (error) setErrorText(error);
      // Refetch persisted messages before dropping the local bubbles.
      await queryClient.invalidateQueries({
        queryKey: getGetAnthropicConversationQueryKey(id),
      });
      await queryClient.invalidateQueries({
        queryKey: getListAnthropicConversationsQueryKey(),
      });
    } catch {
      setErrorText(t('coach.somethingWrong'));
    } finally {
      setIsStreaming(false);
      setPending(null);
    }
  };

  const startNewChat = () => {
    Haptics.selectionAsync();
    setActiveId('new');
    setErrorText(null);
    setHistoryOpen(false);
  };

  const openConversation = (id: number) => {
    Haptics.selectionAsync();
    setActiveId(id);
    setErrorText(null);
    setHistoryOpen(false);
  };

  const removeConversation = (id: number) => {
    deleteConversation.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getListAnthropicConversationsQueryKey(),
          });
          if (activeId === id) setActiveId('new');
        },
      },
    );
  };

  const topPad = Platform.OS === 'web' ? 67 + 12 : insets.top + 12;
  const bottomPad = Platform.OS === 'web' ? 96 : insets.bottom + 62;

  return (
    <View
      style={{ flex: 1, backgroundColor: colors.background }}
      testID="screen-coach"
    >
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        {/* Header */}
        <View style={[styles.header, rowReverse, { paddingTop: topPad }]}>
          <View style={{ flex: 1 }}>
            <Text
              style={[styles.screenTitle, { color: colors.foreground }, rtlText]}
            >
              {t('coach.title')}
            </Text>
            <Text
              style={[styles.subtitle, { color: colors.mutedForeground }, rtlText]}
            >
              {t('coach.subtitle')}
            </Text>
          </View>
          <Pressable
            onPress={startNewChat}
            style={({ pressed }) => [
              styles.headerBtn,
              { backgroundColor: colors.secondary, opacity: pressed ? 0.6 : 1 },
            ]}
            testID="button-new-chat"
          >
            <Ionicons name="create-outline" size={19} color={colors.foreground} />
          </Pressable>
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              setHistoryOpen(true);
            }}
            style={({ pressed }) => [
              styles.headerBtn,
              { backgroundColor: colors.secondary, opacity: pressed ? 0.6 : 1 },
            ]}
            testID="button-history"
          >
            <Ionicons name="time-outline" size={19} color={colors.foreground} />
          </Pressable>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={styles.messages}
          onContentSizeChange={() =>
            scrollRef.current?.scrollToEnd({ animated: true })
          }
          keyboardShouldPersistTaps="handled"
        >
          {convo.isLoading && typeof activeId === 'number' ? (
            <View style={{ gap: 10, marginTop: 8 }} testID="coach-loading">
              <Skeleton
                width="64%"
                height={44}
                radius={colorTokens.radius}
                style={{ alignSelf: 'flex-end' }}
              />
              <Skeleton width="82%" height={72} radius={colorTokens.radius} />
              <Skeleton
                width="52%"
                height={44}
                radius={colorTokens.radius}
                style={{ alignSelf: 'flex-end' }}
              />
            </View>
          ) : null}

          {convoFailed ? (
            <EmptyState
              icon="cloud-offline-outline"
              title={t('coach.couldntLoadChat')}
              actionLabel={t('common.retry')}
              onAction={() => convo.refetch()}
            />
          ) : null}

          {showEmpty ? (
            <View style={styles.emptyWrap}>
              <View
                style={[
                  styles.emptyCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderRadius: colorTokens.radius + 6,
                  },
                ]}
              >
                <View
                  style={[styles.emptyIcon, { backgroundColor: colors.accent }]}
                >
                  <Ionicons name="flame" size={22} color={colors.primary} />
                </View>
                <Text
                  style={[styles.emptyTitle, { color: colors.foreground }, rtlText]}
                >
                  {t('coach.askEmber')}
                </Text>
                <Text
                  style={[styles.emptyText, { color: colors.mutedForeground }, rtlText]}
                >
                  {t('coach.askEmberBody')}
                </Text>
              </View>
              <View style={styles.chips}>
                {SUGGESTIONS.map((s, i) => (
                  <Pressable
                    key={s}
                    onPress={() => send(s)}
                    style={({ pressed }) => [
                      styles.chip,
                      isRTL && { alignSelf: 'flex-end' },
                      {
                        backgroundColor: colors.accent,
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}
                    testID={`chip-prompt-${i}`}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: colors.accentForeground },
                        rtlText,
                      ]}
                    >
                      {s}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          {serverMessages.map((m) => {
            const isUser = m.role === 'user';
            // Mirror bubble sides in RTL: user on the left, assistant on the right.
            const align = isUser
              ? isRTL
                ? 'flex-start'
                : 'flex-end'
              : isRTL
                ? 'flex-end'
                : 'flex-start';
            return (
              <View
                key={m.id}
                style={[
                  styles.bubble,
                  { alignSelf: align },
                  isUser
                    ? [styles.userBubble, { backgroundColor: colors.primary }]
                    : [
                        styles.assistantBubble,
                        {
                          backgroundColor: colors.card,
                          borderColor: colors.border,
                        },
                      ],
                ]}
                testID={`message-${m.role}-${m.id}`}
              >
                <Text
                  style={[
                    styles.bubbleText,
                    {
                      color: isUser
                        ? colors.primaryForeground
                        : colors.foreground,
                    },
                    rtlText,
                  ]}
                >
                  {isUser ? m.content : cleanMarkdown(m.content)}
                </Text>
              </View>
            );
          })}

          {pending ? (
            <>
              <View
                style={[
                  styles.bubble,
                  styles.userBubble,
                  { alignSelf: isRTL ? 'flex-start' : 'flex-end' },
                  { backgroundColor: colors.primary },
                ]}
              >
                <Text
                  style={[
                    styles.bubbleText,
                    { color: colors.primaryForeground },
                    rtlText,
                  ]}
                >
                  {pending.user}
                </Text>
              </View>
              <View
                style={[
                  styles.bubble,
                  styles.assistantBubble,
                  { alignSelf: isRTL ? 'flex-end' : 'flex-start' },
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
                testID="bubble-streaming"
              >
                {pending.reply === '' ? (
                  <View style={[styles.thinkingRow, rowReverse]}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text
                      style={[
                        styles.thinkingText,
                        { color: colors.mutedForeground },
                        rtlText,
                      ]}
                    >
                      {t('coach.thinking')}
                    </Text>
                  </View>
                ) : (
                  <Text
                    style={[
                      styles.bubbleText,
                      { color: colors.foreground },
                      rtlText,
                    ]}
                  >
                    {cleanMarkdown(pending.reply)}
                  </Text>
                )}
              </View>
            </>
          ) : null}

          {errorText ? (
            <Text style={[styles.errorText, { color: colors.destructive }]}>
              {errorText}
            </Text>
          ) : null}
        </ScrollView>

        {/* Input bar */}
        <View
          style={[
            styles.inputBar,
            {
              paddingBottom: bottomPad,
              borderTopColor: colors.border,
              backgroundColor: colors.background,
            },
          ]}
        >
          <View
            style={[
              styles.inputWrap,
              rowReverse,
              {
                backgroundColor: colors.card,
                borderColor: colors.input,
                borderRadius: colorTokens.radius + 6,
              },
            ]}
          >
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder={t('coach.inputPlaceholder')}
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, { color: colors.foreground }, rtlText]}
              multiline
              editable={!isStreaming}
              testID="input-chat"
            />
            <Pressable
              onPress={() => send(draft)}
              disabled={isStreaming || draft.trim() === ''}
              style={({ pressed }) => [
                styles.sendBtn,
                {
                  backgroundColor: colors.primary,
                  opacity:
                    isStreaming || draft.trim() === '' ? 0.35 : pressed ? 0.8 : 1,
                },
              ]}
              testID="button-send"
            >
              {isStreaming ? (
                <ActivityIndicator size="small" color={colors.primaryForeground} />
              ) : (
                <Ionicons
                  name="arrow-up"
                  size={18}
                  color={colors.primaryForeground}
                />
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* History modal */}
      <Modal
        visible={historyOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setHistoryOpen(false)}
      >
        <Pressable
          style={styles.backdrop}
          onPress={() => setHistoryOpen(false)}
        />
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
            <View
              style={[styles.sheetHandle, { backgroundColor: colors.border }]}
            />
          </View>
          <Text
            style={[styles.sheetTitle, { color: colors.foreground }, rtlText]}
          >
            {t('coach.conversations')}
          </Text>
          <Pressable
            onPress={startNewChat}
            style={({ pressed }) => [
              styles.newChatRow,
              rowReverse,
              {
                backgroundColor: colors.accent,
                borderRadius: colorTokens.radius,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
            testID="button-new-chat-sheet"
          >
            <Ionicons name="add" size={18} color={colors.accentForeground} />
            <Text style={[styles.newChatText, { color: colors.accentForeground }]}>
              {t('coach.newChat')}
            </Text>
          </Pressable>
          <ScrollView style={{ maxHeight: 380 }}>
            {(conversations.data ?? []).length === 0 ? (
              <Text
                style={[styles.sheetEmpty, { color: colors.mutedForeground }, rtlText]}
              >
                {t('coach.historyEmpty')}
              </Text>
            ) : (
              (conversations.data ?? []).map((c) => (
                <View
                  key={c.id}
                  style={[
                    styles.convoRow,
                    rowReverse,
                    { borderBottomColor: colors.border },
                  ]}
                >
                  <Pressable
                    onPress={() => openConversation(c.id)}
                    style={({ pressed }) => [
                      styles.convoPressable,
                      rowReverse,
                      { opacity: pressed ? 0.6 : 1 },
                    ]}
                    testID={`conversation-${c.id}`}
                  >
                    <Ionicons
                      name={
                        activeId === c.id
                          ? 'chatbubble'
                          : 'chatbubble-outline'
                      }
                      size={17}
                      color={
                        activeId === c.id
                          ? colors.primary
                          : colors.mutedForeground
                      }
                    />
                    <Text
                      style={[styles.convoTitle, { color: colors.foreground }, rtlText]}
                      numberOfLines={1}
                    >
                      {c.title}
                    </Text>
                    <Text
                      style={[styles.convoDate, { color: colors.mutedForeground }]}
                    >
                      {conversationDate(c.createdAt, lang)}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => removeConversation(c.id)}
                    style={({ pressed }) => ({
                      opacity: pressed ? 0.5 : 1,
                      padding: 6,
                    })}
                    testID={`button-delete-conversation-${c.id}`}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={17}
                      color={colors.destructive}
                    />
                  </Pressable>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  screenTitle: {
    fontSize: 28,
    fontFamily: 'PlayfairDisplay_700Bold',
  },
  subtitle: {
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
    marginTop: 2,
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messages: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 10,
  },
  emptyWrap: {
    gap: 14,
    marginTop: 8,
  },
  emptyCard: {
    padding: 22,
    borderWidth: 1,
    alignItems: 'flex-start',
    gap: 8,
  },
  emptyIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Outfit_600SemiBold',
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Outfit_400Regular',
  },
  chips: {
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  chipText: {
    fontSize: 14,
    fontFamily: 'Outfit_500Medium',
  },
  bubble: {
    maxWidth: '86%',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: colorTokens.radius,
  },
  userBubble: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  bubbleText: {
    fontSize: 14.5,
    lineHeight: 21,
    fontFamily: 'Outfit_400Regular',
  },
  thinkingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  thinkingText: {
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
  },
  errorText: {
    fontSize: 13,
    fontFamily: 'Outfit_500Medium',
    textAlign: 'center',
    marginTop: 4,
  },
  inputBar: {
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderWidth: 1,
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 6,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Outfit_400Regular',
    maxHeight: 110,
    paddingTop: 8,
    paddingBottom: 8,
  },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
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
    marginBottom: 12,
  },
  newChatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginBottom: 8,
  },
  newChatText: {
    fontSize: 14.5,
    fontFamily: 'Outfit_600SemiBold',
  },
  sheetEmpty: {
    fontSize: 13.5,
    fontFamily: 'Outfit_400Regular',
    paddingVertical: 16,
    textAlign: 'center',
  },
  convoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderBottomWidth: 1,
    paddingVertical: 4,
  },
  convoPressable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  convoTitle: {
    flex: 1,
    fontSize: 14.5,
    fontFamily: 'Outfit_500Medium',
  },
  convoDate: {
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
  },
});
