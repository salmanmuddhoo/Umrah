import { Pressable, Text, View } from 'react-native';

import { colors } from '@/theme';

/** Up/down arrows with the score between them. `myVote` is 1, -1 or 0. */
export function VoteButtons({ score, myVote, onVote }: { score: number; myVote: number; onVote: (value: 1 | -1) => void }) {
  return (
    <View style={{ alignItems: 'center', width: 40 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Upvote" accessibilityState={{ selected: myVote === 1 }} hitSlop={8} onPress={() => onVote(1)}>
        <Text style={{ fontSize: 18, color: myVote === 1 ? colors.brand600 : '#94a3b8' }}>▲</Text>
      </Pressable>
      <Text accessibilityLabel={`Score ${score}`} style={{ fontWeight: '700', color: colors.text }}>
        {score}
      </Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Downvote" accessibilityState={{ selected: myVote === -1 }} hitSlop={8} onPress={() => onVote(-1)}>
        <Text style={{ fontSize: 18, color: myVote === -1 ? colors.danger : '#94a3b8' }}>▼</Text>
      </Pressable>
    </View>
  );
}
