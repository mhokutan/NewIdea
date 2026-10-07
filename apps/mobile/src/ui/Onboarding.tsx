// Profile setup in short steps. Everything a public page needs is asked here, so a new account never lands on an
// empty profile. Scouts: basics, then what they like to discover. Creators: basics, about the business, then links
// and the main button. One request creates the whole profile (POST /v1/onboarding).
import DateTimePicker from '@react-native-community/datetimepicker';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, Text, TextInput, View } from 'react-native';

import { api, ApiError } from '@/lib/api';
import { CATEGORIES, CTA_OPTIONS, ctaVisible } from '@/lib/categories';
import { lang, t } from '@/lib/i18n';
import { C, F, themed } from '@/lib/theme';
import { useMe } from '@/lib/use-me';
import { Icon } from './Icon';
import { Button, Pill } from './Pill';

type Kind = 'scout' | 'creator';
type Step = 'type' | 'basics' | 'about' | 'links' | 'interests';
const STEPS: Record<Kind, Step[]> = { scout: ['type', 'basics', 'interests'], creator: ['type', 'basics', 'about', 'links'] };
const fmt = (s: string, vars: Record<string, string | number>) => Object.entries(vars).reduce((a, [k, v]) => a.replace(`{${k}}`, String(v)), s);
// Handles start with a letter (server rule), so leading digits and symbols are dropped.
const handleFrom = (v: string) => v.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g, '').replace(/^[^a-z]+/, '').slice(0, 20);
// Suggest the main button from the first link the creator adds.
const ctaFor = (url: string) => {
  const h = (() => { try { return new URL(url).hostname; } catch { return ''; } })();
  if (/apps\.apple\.com$/.test(h)) return 'app_store';
  if (/play\.google\.com$/.test(h)) return Platform.OS === 'ios' ? 'website' : 'google_play';
  if (/steampowered\.com$/.test(h)) return 'steam';
  if (/(etsy\.com|myshopify\.com|amazon\.)/.test(h)) return 'shop';
  if (/(twitch\.tv|kick\.com)$/.test(h)) return 'watch_live';
  if (/(youtube\.com|youtu\.be|tiktok\.com|instagram\.com)$/.test(h)) return 'watch';
  return 'website';
};
const fixUrl = (v: string) => { const s = v.trim(); return s && !/^https?:\/\//i.test(s) ? `https://${s}` : s; };

export function Onboarding({ onDone }: { onDone: () => void }) {
  const { me } = useMe();
  // Apple and Google give the name on first sign in; it is only a suggestion.
  const given = (me?.user.name || '').trim().slice(0, 80);
  const [kind, setKind] = useState<Kind | null>(null);
  const [step, setStep] = useState<Step>('type');
  const [name, setName] = useState(given);
  const [handle, setHandle] = useState(() => handleFrom(given));
  const [handleState, setHandleState] = useState<'idle' | 'ok' | 'bad'>('idle');
  const [handleEdited, setHandleEdited] = useState(false);
  const [dob, setDob] = useState<Date | null>(null);
  const [d, setD] = useState({ day: '', month: '', year: '' });
  const [category, setCategory] = useState('');
  const [secondary, setSecondary] = useState<string[]>([]);
  const [bio, setBio] = useState('');
  const [soon, setSoon] = useState(false);
  const [links, setLinks] = useState<string[]>(['']);
  const [cta, setCta] = useState<string | null>(null);
  const [ctaPicked, setCtaPicked] = useState(false);
  const [interests, setInterests] = useState<string[]>([]);
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  // Handle check: the clean name first, then a short number if it is taken.
  const base = useRef(handleFrom(given));
  const tries = useRef(0);
  useEffect(() => {
    if (handle.length < 3) return;
    const id = setTimeout(() => api.handle(handle).then((r) => {
      if (!r.available && !handleEdited && base.current.length >= 3 && tries.current < 4) {
        tries.current += 1;
        setHandle(`${base.current.slice(0, 20)}${10 + Math.floor(Math.random() * 90)}`);
        return;
      }
      setHandleState(r.available ? 'ok' : 'bad');
    }).catch(() => {}), 300);
    return () => clearTimeout(id);
  }, [handle, handleEdited]);
  const handleStatus = handle.length < 3 ? 'idle' : handleState;
  const onName = (v: string) => {
    setName(v);
    if (handleEdited) return;
    base.current = handleFrom(v);
    tries.current = 0;
    setHandle(base.current);
  };

  const web = Platform.OS === 'web';
  const birth = web ? { day: +d.day, month: +d.month, year: +d.year } : dob ? { day: dob.getDate(), month: dob.getMonth() + 1, year: dob.getFullYear() } : null;
  const birthOk = !!birth && birth.year > 1900 && birth.month >= 1 && birth.month <= 12 && birth.day >= 1 && birth.day <= 31;
  const cleanLinks = links.map(fixUrl).filter(Boolean);
  const linkOk = (u: string) => /^https:\/\/[^\s/]+\.[^\s]{2,}/i.test(u);

  const steps = kind ? STEPS[kind] : STEPS.scout;
  const index = steps.indexOf(step);
  const last = index === steps.length - 1;
  const ready: Record<Step, boolean> = {
    type: !!kind,
    basics: !!name.trim() && handleStatus === 'ok' && birthOk,
    about: !!category && bio.trim().length >= 20,
    links: cleanLinks.length > 0 && cleanLinks.every(linkOk),
    interests: interests.length > 0,
  };
  const go = (to: number) => { setErr(''); setStep(steps[to]); };
  const toggle = (list: string[], id: string, max: number) => (list.includes(id) ? list.filter((x) => x !== id) : list.length < max ? [...list, id] : list);

  const submit = async () => {
    setBusy(true); setErr('');
    try {
      await api.onboarding({
        accountType: kind, handle, displayName: name.trim(), birthDay: birth!.day, birthMonth: birth!.month, birthYear: birth!.year,
        acceptTerms: terms, language: lang, bio: bio.trim(),
        ...(kind === 'creator'
          ? { category, secondaryCategories: secondary, releaseStatus: soon ? 'soon' : 'live', links: cleanLinks.map((url) => ({ url })), primaryCta: cta }
          : { interests }),
      });
      api.event('onboarding_done');
      onDone();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : t('error'));
    } finally { setBusy(false); }
  };

  const header = (title: string, sub?: string) => (
    <View style={{ gap: 6 }}>
      <Text style={styles.small}>{fmt(t('onb_step'), { n: index + 1, total: steps.length })}</Text>
      <View style={styles.progress}>{steps.map((s, i) => <View key={s} style={[styles.seg, i <= index && styles.segOn]} />)}</View>
      <Text style={styles.h1} accessibilityRole="header">{title}</Text>
      {sub ? <Text style={styles.text}>{sub}</Text> : null}
    </View>
  );

  if (step === 'type') return (
    <View style={{ gap: 14 }}>
      {header(t('onb_type_t'))}
      <TypeCard title={t('scout')} text={t('scout_p')} icon="chevrons" onPress={() => { setKind('scout'); setStep('basics'); }} />
      <TypeCard title={t('creator')} text={t('creator_p')} icon="ticket" onPress={() => { setKind('creator'); setStep('basics'); }} />
    </View>
  );

  const maxDate = new Date(); maxDate.setFullYear(maxDate.getFullYear() - 18);
  return (
    <View style={{ gap: 16 }}>
      {step === 'basics' ? (
        <>
          {header(kind === 'creator' ? t('onb_basics_creator_t') : t('onb_basics_t'), kind === 'creator' ? t('onb_basics_creator_p') : t('onb_basics_p'))}
          <Field label={kind === 'creator' ? t('onb_business_name') : t('name')}>
            <TextInput value={name} onChangeText={onName} style={styles.input} maxLength={80} accessibilityLabel={t('name')}
              placeholder={kind === 'creator' ? t('onb_business_ph') : t('onb_name_ph')} placeholderTextColor={C.muted} />
          </Field>
          <Field label={t('handle')}>
            <TextInput value={handle} onChangeText={(v) => { setHandleEdited(true); setHandle(v.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 24)); }} style={styles.input}
              autoCapitalize="none" autoCorrect={false} placeholder="yourname" placeholderTextColor={C.muted} accessibilityLabel={t('handle')} />
            <Text style={{ color: handleStatus === 'ok' ? C.lime : handleStatus === 'bad' ? C.danger : C.muted }}>
              {handleStatus === 'bad' ? t('handle_taken') : `${t('handle_hint')}${handle || 'yourname'}`}
            </Text>
          </Field>
          <Field label={kind === 'creator' ? t('onb_owner_birth') : t('birth')}>
            {web ? (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput value={d.day} onChangeText={(v) => setD({ ...d, day: v })} placeholder="DD" placeholderTextColor={C.muted} keyboardType="number-pad" maxLength={2} style={[styles.input, styles.dateField]} accessibilityLabel={t('day')} />
                <TextInput value={d.month} onChangeText={(v) => setD({ ...d, month: v })} placeholder="MM" placeholderTextColor={C.muted} keyboardType="number-pad" maxLength={2} style={[styles.input, styles.dateField]} accessibilityLabel={t('month')} />
                <TextInput value={d.year} onChangeText={(v) => setD({ ...d, year: v })} placeholder="YYYY" placeholderTextColor={C.muted} keyboardType="number-pad" maxLength={4} style={[styles.input, styles.dateField, { flex: 1.5 }]} accessibilityLabel={t('year')} />
              </View>
            ) : (
              <View style={styles.dateBox}>
                <DateTimePicker value={dob || maxDate} maximumDate={maxDate} minimumDate={new Date(1920, 0, 1)} mode="date"
                  display={Platform.OS === 'ios' ? 'compact' : 'default'} themeVariant="dark" onChange={(_, v) => v && setDob(v)} accessibilityLabel={t('birth')} />
              </View>
            )}
            <Text style={styles.small}>{t('onb_birth_note')}</Text>
          </Field>
        </>
      ) : null}

      {step === 'about' ? (
        <>
          {header(t('onb_about_t'), t('onb_about_p'))}
          <Field label={t('onb_category_q')}>
            <View style={styles.wrap}>{CATEGORIES.map((k) => <Pill key={k.id} label={t(k.label)} active={category === k.id} onPress={() => { setCategory(k.id); setSecondary((s) => s.filter((x) => x !== k.id)); }} />)}</View>
          </Field>
          {category ? (
            <Field label={t('cats_more')}>
              <View style={styles.wrap}>{CATEGORIES.filter((k) => k.id !== category).map((k) => <Pill key={k.id} label={t(k.label)} active={secondary.includes(k.id)} onPress={() => setSecondary((s) => toggle(s, k.id, 2))} />)}</View>
            </Field>
          ) : null}
          <Field label={t('onb_bio_creator')}>
            <TextInput value={bio} onChangeText={setBio} maxLength={300} multiline style={[styles.input, { minHeight: 110, textAlignVertical: 'top' }]}
              placeholder={t('onb_bio_creator_ph')} placeholderTextColor={C.muted} accessibilityLabel={t('onb_bio_creator')} />
            <Text style={[styles.small, { alignSelf: 'flex-end', color: bio.trim().length < 20 ? C.muted : C.lime }]}>{bio.trim().length < 20 ? fmt(t('onb_bio_min'), { n: 20 - bio.trim().length }) : `${bio.length} / 300`}</Text>
          </Field>
          <Pressable onPress={() => setSoon(!soon)} style={styles.check} accessibilityRole="checkbox" accessibilityState={{ checked: soon }}>
            <View style={[styles.box, soon && styles.boxOn]}>{soon ? <Text style={styles.tick}>✓</Text> : null}</View>
            <Text style={[styles.text, { flex: 1 }]}>{t('release_soon')}</Text>
          </Pressable>
        </>
      ) : null}

      {step === 'links' ? (
        <>
          {header(t('onb_links_t'), t('onb_links_p'))}
          {links.map((l, i) => (
            <Field key={i} label={i === 0 ? t('onb_main_link') : `${t('links')} ${i + 1}`}>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <TextInput value={l} onChangeText={(v) => {
                  setLinks((x) => x.map((y, k) => (k === i ? v : y)));
                  if (i === 0 && !ctaPicked) setCta(ctaFor(fixUrl(v)));
                }} style={[styles.input, { flex: 1, minWidth: 0, width: 0 }]} autoCapitalize="none" autoCorrect={false} keyboardType="url"
                  placeholder={i === 0 ? t('onb_main_link_ph') : 'https://'} placeholderTextColor={C.muted} accessibilityLabel={`${t('links')} ${i + 1}`} />
                {i > 0 ? <Pressable onPress={() => setLinks((x) => x.filter((_, k) => k !== i))} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('remove')} style={styles.remove}><Text style={{ color: C.muted, fontSize: 20 }}>×</Text></Pressable> : null}
              </View>
              {l && !linkOk(fixUrl(l)) ? <Text style={{ color: C.danger }}>{t('onb_link_bad')}</Text> : null}
            </Field>
          ))}
          {links.length < 8 ? <Button label={`+ ${t('add_link')}`} ghost onPress={() => setLinks((x) => [...x, ''])} /> : null}
          <Field label={t('main_button')}>
            <Text style={styles.small}>{t('onb_cta_p')}</Text>
            <View style={styles.wrap}>{CTA_OPTIONS.filter((k) => ctaVisible(k.id, Platform.OS)).map((k) => (
              <Pill key={k.id} label={t(k.label)} active={cta === k.id} onPress={() => { setCtaPicked(true); setCta(cta === k.id ? null : k.id); }} />
            ))}</View>
          </Field>
          <Text style={styles.small}>{t('onb_photo_later')}</Text>
        </>
      ) : null}

      {step === 'interests' ? (
        <>
          {header(t('onb_interests_t'), t('onb_interests_p'))}
          <View style={styles.wrap}>{CATEGORIES.map((k) => <Pill key={k.id} label={t(k.label)} active={interests.includes(k.id)} onPress={() => setInterests((s) => toggle(s, k.id, 7))} />)}</View>
          <Field label={t('onb_bio_scout')}>
            <TextInput value={bio} onChangeText={setBio} maxLength={160} multiline style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
              placeholder={t('onb_bio_scout_ph')} placeholderTextColor={C.muted} accessibilityLabel={t('onb_bio_scout')} />
          </Field>
        </>
      ) : null}

      {last ? (
        <Pressable onPress={() => setTerms(!terms)} style={styles.check} accessibilityRole="checkbox" accessibilityState={{ checked: terms }}>
          <View style={[styles.box, terms && styles.boxOn]}>{terms ? <Text style={styles.tick}>✓</Text> : null}</View>
          <Text style={[styles.text, { flex: 1 }]}>{t('terms')}</Text>
        </Pressable>
      ) : null}
      {err ? <Text style={{ color: C.danger }} accessibilityLiveRegion="polite">{err}</Text> : null}
      {last
        ? <Button label={busy ? '...' : t('create')} onPress={submit} disabled={busy || !ready[step] || !terms} />
        : <Button label={t('next')} onPress={() => go(index + 1)} disabled={!ready[step]} />}
      <Pressable onPress={() => (index <= 1 ? (setKind(null), setStep('type')) : go(index - 1))} style={{ minHeight: 44, justifyContent: 'center' }} accessibilityRole="button">
        <Text style={{ color: C.muted, textAlign: 'center' }}>{t('back')}</Text>
      </Pressable>
    </View>
  );
}

function TypeCard({ title, text, icon, onPress }: { title: string; text: string; icon: 'chevrons' | 'ticket'; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.8 }]} accessibilityRole="button">
      <View style={styles.typeIcon}><Icon name={icon} size={22} color={C.accent} /></View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={styles.h2}>{title}</Text>
        <Text style={styles.text}>{text}</Text>
      </View>
      <Text style={{ color: C.muted, fontSize: 22 }}>›</Text>
    </Pressable>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <View style={{ gap: 8 }}><Text style={styles.label}>{label}</Text>{children}</View>;
}

const styles = themed(() => ({
  h1: { color: C.text, fontSize: 26, ...F.display },
  h2: { color: C.text, fontSize: 18, ...F.display },
  text: { color: C.text2, fontSize: 15, lineHeight: 21 },
  small: { color: C.muted, fontSize: 13 },
  label: { color: C.text2, fontSize: 14, fontWeight: '600' },
  input: { backgroundColor: C.surface, color: C.text, fontSize: 16, borderRadius: 12, borderWidth: 1, borderColor: C.line, paddingHorizontal: 14, paddingVertical: 12 },
  dateField: { flex: 1, minWidth: 0, width: 0, textAlign: 'center' },
  dateBox: { alignSelf: 'flex-start' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  progress: { flexDirection: 'row', gap: 4 },
  seg: { flex: 1, height: 4, borderRadius: 2, backgroundColor: C.surface2 },
  segOn: { backgroundColor: C.lime },
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.line },
  typeIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(198,255,61,0.12)', alignItems: 'center', justifyContent: 'center' },
  check: { flexDirection: 'row', gap: 12, alignItems: 'center', minHeight: 44 },
  box: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: C.muted, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: C.lime, borderColor: C.lime },
  tick: { color: C.ink, fontWeight: '800' },
  remove: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
}));
