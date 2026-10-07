// Cross platform icons: SF Symbols on iOS, Material Symbols on Android and web.
import { SymbolView } from 'expo-symbols';

const MAP = {
  play: { ios: 'play.fill', android: 'play_arrow', web: 'play_arrow' },
  fire: { ios: 'flame.fill', android: 'local_fire_department', web: 'local_fire_department' },
  down: { ios: 'hand.thumbsdown.fill', android: 'thumb_down', web: 'thumb_down' },
  save: { ios: 'bookmark', android: 'bookmark', web: 'bookmark' },
  saved: { ios: 'bookmark.fill', android: 'bookmark_added', web: 'bookmark_added' },
  share: { ios: 'arrowshape.turn.up.right.fill', android: 'share', web: 'share' },
  search: { ios: 'magnifyingglass', android: 'search', web: 'search' },
  sound: { ios: 'speaker.wave.2.fill', android: 'volume_up', web: 'volume_up' },
  mute: { ios: 'speaker.slash.fill', android: 'volume_off', web: 'volume_off' },
  link: { ios: 'arrow.up.right', android: 'arrow_outward', web: 'arrow_outward' },
  back: { ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' },
  check: { ios: 'checkmark.seal.fill', android: 'verified', web: 'verified' },
  chevrons: { ios: 'chevron.up.2', android: 'keyboard_double_arrow_up', web: 'keyboard_double_arrow_up' },
  more: { ios: 'ellipsis', android: 'more_horiz', web: 'more_horiz' },
  ticket: { ios: 'ticket.fill', android: 'confirmation_number', web: 'confirmation_number' },
} as const;
export type IconName = keyof typeof MAP;

export function Icon({ name, size = 22, color = '#fff' }: { name: IconName; size?: number; color?: string }) {
  return <SymbolView name={MAP[name] as any} tintColor={color} size={size} />;
}
