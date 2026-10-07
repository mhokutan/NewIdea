// Creator profile: banner, avatar, follow, links and the promo grid.
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api, type Perk, type Profile } from '@/lib/api';
import { t } from '@/lib/i18n';
import { C } from '@/lib/theme';
import { categoryLabel, ctaLabel, ctaVisible, linkName } from '@/lib/categories';
import { asMember } from '@/lib/gate';
import { useMe } from '@/lib/use-me';
import { setBlocked, setFollowing } from '@/lib/viewer-state';
import { PerkSheet } from '@/ui/PerkSheet';
import { ReportMenu } from '@/ui/ReportMenu';
import { Avatar } from '@/ui/Avatar';
import { Icon } from '@/ui/Icon';
import { Button } from '@/ui/Pill';

export default function CreatorScreen() {
  const { handle } = useLocalSearchParams<{ handle: string }>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { me } = useMe();
  const [p, setP] = useState<Profile | null>(null);
  const [error, setError] = useState(false);
  const [menu, setMenu] = useState(false);

  const [perk, setPerk] = useState<Perk | null>(null);
  const [gift, setGift] = useState(false);
  const load = useCallback(() => {
    api.profile(handle).then((r) => setP(r.profile)).catch(() => setError(true));
    api.creatorPerk(handle).then((r) => setPerk(r.perk)).catch(() => {});
  }, [handle]);
  useEffect(() => { load(); }, [load, me]);

  const toggleFollow = () => asMember(() => {
    const on = !p?.viewer?.following;
    setP((x) => x && { ...x, viewer: { isMe: false, following: on }, followers: x.followers != null ? x.followers + (on ? 1 : -1) : null });
    setFollowing(handle, on);
    api.follow(handle, on).catch(() => { setFollowing(handle, !on); load(); });
  });

  const share = () => {
    const url = `https://promovote.com/@${handle}`;
    Share.share(Platform.OS === 'ios' ? { message: p?.name || handle, url } : { message: `${p?.name || handle} ${url}` }).catch(() => {});
  };
  if (error) return <View style={styles.center}><Text style={styles.text}>{t('error')}</Text><View style={{ width: 200, marginTop: 16 }}><Button label={t('retry')} onPress={() => { setError(false); load(); }} /></View></View>;
  if (!p) return <View style={styles.center}><ActivityIndicator color={C.lime} /></View>;

  const tileW = (width - 32 - 16) / 3;
  const main = p.primaryCta?.url && ctaVisible(p.primaryCta.kind, Platform.OS) ? p.primaryCta : null;
  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ paddingBottom: 48 }}>
      <View style={{ height: 180 + insets.top }}>
        {p.banner ? <Image source={{ uri: p.banner }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <View style={[StyleSheet.absoluteFill, styles.noBanner]} />}
        <View style={[StyleSheet.absoluteFill, styles.bannerShade]} />
        <Pressable onPress={() => router.back()} style={[styles.back, { top: insets.top + 8 }]} accessibilityRole="button" accessibilityLabel={t('back')}>
          <Icon name="back" size={20} />
        </Pressable>
        <View style={[styles.topRight, { top: insets.top + 8 }]}>
          <Pressable onPress={share} style={styles.round} accessibilityRole="button" accessibilityLabel={t('share')}><Icon name="share" size={18} /></Pressable>
          {!p.viewer?.isMe ? <Pressable onPress={() => setMenu(true)} style={styles.round} accessibilityRole="button" accessibilityLabel={t('more_actions')}><Icon name="more" size={18} /></Pressable> : null}
        </View>
      </View>
      <View style={styles.pad}>
        <View style={styles.head}>
          <View style={styles.avatarWrap}><Avatar uri={p.avatar} mono={p.mono || p.name} size={96} radius={26} /></View>
          <View style={{ flex: 1, paddingBottom: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.name} numberOfLines={1}>{p.name}</Text>
              {p.verified ? <Icon name="check" size={18} color={C.lime} /> : null}
            </View>
            <Text style={styles.handle}>@{p.handle}{p.followers != null ? `  ·  ${p.followers} ${t('followers')}` : ''}</Text>
            {p.newCreator && !p.verified ? <Text style={styles.newChip}>{t('new_creator')}</Text> : null}
          </View>
        </View>
        {p.kind || p.category ? <Text style={styles.kind}>{p.founderOwned && p.kind ? p.kind : categoryLabel(p.category) ? t(categoryLabel(p.category)!) : p.kind}</Text> : null}
        {p.viewer?.isMe ? (
          <View style={styles.actions}>
            <View style={{ flex: 1 }}><Button label={t('edit_profile')} onPress={() => router.push('/edit-profile')} /></View>
            <View style={{ flex: 1 }}><Button label={t('share_page')} ghost onPress={share} /></View>
          </View>
        ) : (
          <View style={styles.actions}>
            <View style={{ flex: 1 }}><Button label={p.viewer?.following ? t('following') : t('follow')} ghost={!!p.viewer?.following} onPress={toggleFollow} /></View>
            {main ? <View style={{ flex: 1 }}><Button label={t(ctaLabel(main.kind))} ghost onPress={() => Linking.openURL(main.url!)} /></View> : null}
          </View>
        )}
        {p.bio ? <Text style={styles.bio}>{p.bio}</Text> : null}
        <View style={styles.links}>
          {(p.links || []).map((l) => (
            <Pressable key={l.url} onPress={() => Linking.openURL(l.url)} style={styles.link} accessibilityRole="link">
              <Text style={styles.linkText}>{linkName(l.platform, l.url, l.label)}</Text>
              <Icon name="link" size={14} />
            </Pressable>
          ))}
          {p.releaseStatus === 'soon' ? <Text style={[styles.link, styles.soon]}>{t('soon')}</Text> : null}
          {Platform.OS === 'android' && p.androidStatus === 'soon' ? <Text style={[styles.link, styles.soon]}>{t('android_soon')}</Text> : null}
        </View>
        {perk && !p.viewer?.isMe ? (
          <Pressable onPress={() => setGift(true)} style={styles.gift} accessibilityRole="button" accessibilityLabel={`${t('gift')}: ${perk.title}`}>
            <Icon name="gift" size={22} color={C.lime} />
            <View style={{ flex: 1 }}>
              <Text style={styles.giftKicker}>{t('gift')}</Text>
              <Text style={styles.linkText} numberOfLines={1}>{perk.title}</Text>
            </View>
            <Text style={styles.giftKicker}>{t('get_code')} ›</Text>
          </Pressable>
        ) : null}
        {p.founderOwned ? <Text style={styles.disc}>{t('founder_made')}</Text> : null}

        <Text style={styles.h2}>{t('promos')}</Text>
        <View style={styles.grid}>
          {!(p.promos || []).length ? <Text style={styles.text}>{p.viewer?.isMe ? t('no_promos_owner') : t('no_promos')}</Text> : null}
          {(p.promos || []).map((pr) => (
            <Pressable key={pr.id} onPress={() => router.push({ pathname: '/', params: { v: pr.slug } })} style={[styles.tile, { width: tileW, height: tileW * 16 / 9 }]} accessibilityRole="button" accessibilityLabel={pr.title}>
              {pr.video.poster ? <Image source={{ uri: pr.video.poster }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
              <Text style={styles.dur}>0:{String(Math.round(pr.video.durationMs / 1000)).padStart(2, '0')}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      {perk ? <PerkSheet handle={handle} name={p.name} visible={gift} onClose={() => setGift(false)} /> : null}
      <ReportMenu visible={menu} onClose={() => setMenu(false)} kind="profile" id={handle} handle={handle}
        onBlocked={() => { setBlocked(handle); router.back(); }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg },
  text: { color: C.text2 },
  pad: { paddingHorizontal: 16 },
  noBanner: { experimental_backgroundImage: 'linear-gradient(135deg, #1d1830, #0a0a0f)' } as any,
  bannerShade: { experimental_backgroundImage: 'linear-gradient(to bottom, rgba(10,10,15,0.35), rgba(10,10,15,0) 40%, rgba(10,10,15,0.6))' } as any,
  topRight: { position: 'absolute', right: 12, flexDirection: 'row', gap: 8 },
  round: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(20,20,31,0.72)', alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  newChip: { alignSelf: 'flex-start', marginTop: 6, color: C.lime, fontSize: 12, fontWeight: '700', borderWidth: 1, borderColor: 'rgba(198,255,61,0.45)', borderRadius: 99, paddingHorizontal: 8, paddingVertical: 2, overflow: 'hidden' },
  back: { position: 'absolute', left: 12, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(20,20,31,0.72)', alignItems: 'center', justifyContent: 'center' },
  head: { flexDirection: 'row', alignItems: 'flex-end', gap: 14, marginTop: -48 },
  avatarWrap: { borderWidth: 4, borderColor: C.bg, borderRadius: 30 },
  name: { color: C.text, fontSize: 26, fontWeight: '800', flexShrink: 1 },
  handle: { color: '#c9c6d8', fontSize: 14, marginTop: 2 },
  kind: { color: C.text2, fontSize: 13, fontWeight: '600', marginTop: 12, alignSelf: 'flex-start', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', borderRadius: 99, paddingVertical: 4, paddingHorizontal: 10 },
  bio: { color: C.text2, fontSize: 16, lineHeight: 23, marginTop: 18 },
  links: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: C.surface, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  linkText: { color: C.text, fontWeight: '600', fontSize: 14 },
  soon: { color: C.lime, borderColor: 'rgba(198,255,61,0.35)', fontWeight: '600', fontSize: 14 },
  gift: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16, padding: 14, minHeight: 56, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(198,255,61,0.55)', backgroundColor: 'rgba(198,255,61,0.06)' },
  giftKicker: { color: C.lime, fontSize: 12, fontWeight: '700' },
  disc: { color: C.muted, fontSize: 13, marginTop: 14 },
  h2: { color: C.text, fontSize: 18, fontWeight: '800', marginTop: 28, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: { borderRadius: 10, overflow: 'hidden', backgroundColor: C.surface },
  dur: { position: 'absolute', top: 6, right: 6, color: '#fff', fontSize: 11, fontWeight: '600', backgroundColor: 'rgba(8,8,12,0.7)', borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2, overflow: 'hidden' },
});
