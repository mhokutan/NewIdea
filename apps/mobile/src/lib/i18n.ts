// App strings in English, Spanish and Turkish. Device language first, English fallback.
import { getLocales } from 'expo-localization';

const en = {
  tab_feed: 'Feed', tab_explore: 'Explore', tab_me: 'Profile',
  home_drop: "Today's Drop", home_new: 'New', home_picks: 'Team picks', home_top: 'Charts',
  drop_done_t: "That's today's drop", drop_done_calls: 'You made {n} of {size} calls.', drop_done_p: 'Results come in 7 days. A new drop lands tomorrow.', keep_watching: 'Keep watching',
  charts_progress: 'Charts open when {goal} scouts call promos this week. So far: {n}.',
  top_empty: 'Top opens when real people start watching and voting. Paying never buys a spot.', featured_note: 'Picked by the PromoVote team. Never paid. The founder makes some of these promos.', featured_empty: 'No picks yet.', new_empty: 'No promos yet.',
  will_blow_up: 'Will blow up', not_for_me: 'Not for me', save: 'Save', share: 'Share',
  soon: 'Coming soon', android_soon: 'Google Play coming soon', founder_made: 'Made by the PromoVote founder',
  cta_app_store: 'Open in App Store', cta_shop: 'Visit the shop', cta_etsy: 'View on Etsy', cta_notify: 'Notify me at launch', cta_website: 'Open website', cta_watch: 'Watch',
  search: 'Search games, apps, shops or #hashtags', all: 'All', games: 'Games', apps: 'Apps', shops: 'Shops',
  creators: 'Creators', hashtags: 'Hashtags', promos: 'Promos', nothing: 'Nothing matches yet.',
  charts: 'Charts', charts_soon: 'Charts open when voting starts. Paid boosts never buy a spot.',
  follow: 'Follow', following: 'Following', followers: 'followers',
  sign_in: 'Sign in', sign_in_t: 'Join PromoVote', sign_in_p: 'Watch free. Sign in to call promos, save them and follow creators.',
  email: 'Email', send_code: 'Send code', code: '6 digit code', verify: 'Sign in', code_sent: 'We sent a code to',
  scout: 'Scout', scout_p: 'Discover, vote and save. You cannot post promos.', creator: 'Creator', creator_p: 'Post promos for your game, app, shop or channel. You cannot vote.',
  handle: 'Username', name: 'Display name', birth: 'Date of birth', terms: 'I am 18 or older and accept the Terms and Community Guidelines.',
  create: 'Create profile', category: 'Category', sign_out: 'Sign out', delete_account: 'Delete account',
  delete_q: 'Delete your account? You have 30 days to change your mind by signing in again.', cancel: 'Cancel', ok: 'OK',
  guest_t: 'You are watching as a guest', guest_p: 'Guests can watch everything. Sign in to vote, save and follow.',
  error: 'Something went wrong. Try again.', retry: 'Try again', report: 'Report', block: 'Block',
  more: 'more', less: 'less',
  help_title: 'Help and legal', help_contact: 'Contact support', help_terms: 'Terms of Use', help_privacy: 'Privacy Policy', help_guidelines: 'Community Guidelines',
  delete_failed: 'Could not delete the account. Try again or email support@promovote.com.', delete_done: 'Your account will be deleted in 30 days. Sign in again before then to keep it.',
  gate_guest_t: 'Sign in to make your call', gate_guest_p: 'Your call locks in and the result comes in 7 days. Watching stays free, no sign in needed.',
  gate_onb_t: 'Finish your profile', gate_onb_p: 'One more step and your call counts.', finish_profile: 'Finish profile', not_now: 'Not now',
  gate_creator_t: "Creators can't vote", gate_creator_p: 'Only scouts call promos, so the results stay fair. You can still watch and share.',
  called: 'Called', result_on: 'Result', scout_n: 'Scout #', say_blow_up: 'say blow up', already_called: 'You already called this one.',
  saved: 'Saved', saved_toast: 'Saved to your profile', unsaved_toast: 'Removed from saved', more_actions: 'More', blocked_toast: "Blocked. You won't see this creator anymore.",
  report_t: "What's wrong?", report_thanks_t: 'Thanks for telling us', report_thanks_p: 'Our team reviews reports within 24 hours.',
  r_spam: 'Spam or scam', r_hate: 'Hate or harassment', r_violence: 'Violence', r_sexual: 'Sexual content', r_copyright: 'Copyright', r_minor: 'Someone under 18', r_other: 'Something else',
  with_email: 'Continue with email', email_soon: 'Email sign in is not open yet. Please continue with Apple or Google.',
  with_google: 'Continue with Google', soon_login: 'Sign in is opening soon. You can watch everything as a guest.', legal_note: 'By continuing you agree to the Terms and Privacy Policy. 18+ only.',
};
type Key = keyof typeof en;
const es: Partial<Record<Key, string>> = {
  tab_feed: 'Feed', tab_explore: 'Explorar', tab_me: 'Perfil',
  home_drop: 'Drop de hoy', home_new: 'Nuevo', home_picks: 'Elegidos', home_top: 'Rankings',
  drop_done_t: 'Ese fue el drop de hoy', drop_done_calls: 'Hiciste {n} de {size} predicciones.', drop_done_p: 'Los resultados llegan en 7 días. Mañana hay un drop nuevo.', keep_watching: 'Seguir mirando',
  charts_progress: 'Los rankings abren cuando {goal} exploradores hagan predicciones esta semana. Por ahora: {n}.',
  top_empty: 'El Top abre cuando personas reales empiecen a ver y votar. Pagar nunca compra un puesto.', featured_note: 'Elegido por el equipo de PromoVote. Nunca pagado. Algunas promos son del fundador.', featured_empty: 'Todavía no hay destacados.', new_empty: 'Todavía no hay promos.',
  will_blow_up: 'Va a explotar', not_for_me: 'No es para mí', save: 'Guardar', share: 'Compartir',
  soon: 'Muy pronto', android_soon: 'Pronto en Google Play', founder_made: 'Hecho por el fundador de PromoVote',
  cta_app_store: 'Abrir en App Store', cta_shop: 'Visitar la tienda', cta_etsy: 'Ver en Etsy', cta_notify: 'Avísame al lanzar', cta_website: 'Abrir sitio web', cta_watch: 'Ver',
  search: 'Busca juegos, apps, tiendas o #hashtags', all: 'Todo', games: 'Juegos', apps: 'Apps', shops: 'Tiendas',
  creators: 'Creadores', hashtags: 'Hashtags', promos: 'Promos', nothing: 'Nada coincide todavía.',
  charts: 'Rankings', charts_soon: 'Los rankings abren cuando empiece la votación. Pagar nunca compra un puesto.',
  follow: 'Seguir', following: 'Siguiendo', followers: 'seguidores',
  sign_in: 'Entrar', sign_in_t: 'Únete a PromoVote', sign_in_p: 'Mira gratis. Entra para hacer predicciones, guardar y seguir creadores.',
  email: 'Email', send_code: 'Enviar código', code: 'Código de 6 dígitos', verify: 'Entrar', code_sent: 'Enviamos un código a',
  scout: 'Explorador', scout_p: 'Descubre, vota y guarda. No puedes publicar promos.', creator: 'Creador', creator_p: 'Publica promos de tu juego, app, tienda o canal. No puedes votar.',
  handle: 'Usuario', name: 'Nombre visible', birth: 'Fecha de nacimiento', terms: 'Tengo 18 años o más y acepto los Términos y las Normas de la comunidad.',
  create: 'Crear perfil', category: 'Categoría', sign_out: 'Salir', delete_account: 'Eliminar cuenta',
  delete_q: '¿Eliminar tu cuenta? Tienes 30 días para cambiar de opinión entrando de nuevo.', cancel: 'Cancelar', ok: 'OK',
  guest_t: 'Estás mirando como invitado', guest_p: 'Los invitados pueden ver todo. Entra para votar, guardar y seguir.',
  error: 'Algo salió mal. Inténtalo de nuevo.', retry: 'Reintentar', report: 'Reportar', block: 'Bloquear',
  more: 'más', less: 'menos',
  help_title: 'Ayuda y legal', help_contact: 'Contactar soporte', help_terms: 'Términos de uso', help_privacy: 'Política de privacidad', help_guidelines: 'Normas de la comunidad',
  delete_failed: 'No se pudo eliminar la cuenta. Inténtalo de nuevo o escribe a support@promovote.com.', delete_done: 'Tu cuenta se eliminará en 30 días. Entra antes de esa fecha para conservarla.',
  gate_guest_t: 'Entra para hacer tu predicción', gate_guest_p: 'Tu predicción queda fijada y el resultado llega en 7 días. Mirar sigue siendo gratis, sin registro.',
  gate_onb_t: 'Completa tu perfil', gate_onb_p: 'Un paso más y tu predicción cuenta.', finish_profile: 'Completar perfil', not_now: 'Ahora no',
  gate_creator_t: 'Los creadores no pueden votar', gate_creator_p: 'Solo los exploradores votan, así los resultados son justos. Puedes seguir mirando y compartiendo.',
  called: 'Predicho', result_on: 'Resultado', scout_n: 'Explorador #', say_blow_up: 'dicen que va a explotar', already_called: 'Ya hiciste tu predicción aquí.',
  saved: 'Guardado', saved_toast: 'Guardado en tu perfil', unsaved_toast: 'Quitado de guardados', more_actions: 'Más', blocked_toast: 'Bloqueado. Ya no verás a este creador.',
  report_t: '¿Qué pasa?', report_thanks_t: 'Gracias por avisarnos', report_thanks_p: 'Nuestro equipo revisa los reportes en 24 horas.',
  r_spam: 'Spam o estafa', r_hate: 'Odio o acoso', r_violence: 'Violencia', r_sexual: 'Contenido sexual', r_copyright: 'Derechos de autor', r_minor: 'Alguien menor de 18', r_other: 'Otra cosa',
  with_email: 'Continuar con email', email_soon: 'El inicio con email todavía no está abierto. Continúa con Apple o Google.',
  with_google: 'Continuar con Google', soon_login: 'El inicio de sesión abre pronto. Puedes ver todo como invitado.', legal_note: 'Al continuar aceptas los Términos y la Política de privacidad. Solo mayores de 18.',
};
const tr: Partial<Record<Key, string>> = {
  tab_feed: 'Akış', tab_explore: 'Keşfet', tab_me: 'Profil',
  home_drop: 'Bugünün seçkisi', home_new: 'Yeni', home_picks: 'Ekibin seçimi', home_top: 'Listeler',
  drop_done_t: 'Bugünün seçkisi bitti', drop_done_calls: '{size} videodan {n} tanesine tahmin yaptın.', drop_done_p: 'Sonuçlar 7 gün sonra. Yarın yeni seçki geliyor.', keep_watching: 'İzlemeye devam et',
  charts_progress: 'Listeler bu hafta {goal} kaşif tahmin yapınca açılır. Şu an: {n}.',
  top_empty: 'Popüler listesi gerçek insanlar izleyip oy vermeye başlayınca açılır. Para verip listeye girilemez.', featured_note: 'PromoVote ekibinin seçimi. Ücretli değil. Bazı videolar kurucunun kendi firmalarına ait.', featured_empty: 'Henüz seçim yok.', new_empty: 'Henüz video yok.',
  will_blow_up: 'Patlayacak', not_for_me: 'Bana göre değil', save: 'Kaydet', share: 'Paylaş',
  soon: 'Yakında', android_soon: "Yakında Google Play'de", founder_made: 'PromoVote kurucusunun yapımı',
  cta_app_store: "App Store'da aç", cta_shop: 'Mağazaya git', cta_etsy: "Etsy'de gör", cta_notify: 'Çıkınca haber ver', cta_website: 'Siteyi aç', cta_watch: 'İzle',
  search: 'Oyun, uygulama, mağaza veya #hashtag ara', all: 'Tümü', games: 'Oyunlar', apps: 'Uygulamalar', shops: 'Mağazalar',
  creators: 'Firmalar', hashtags: 'Hashtagler', promos: 'Videolar', nothing: 'Henüz eşleşen yok.',
  charts: 'Sıralamalar', charts_soon: 'Sıralamalar oylama başlayınca açılacak. Para verip sıralamaya girilemez.',
  follow: 'Takip et', following: 'Takiptesin', followers: 'takipçi',
  sign_in: 'Giriş yap', sign_in_t: "PromoVote'a katıl", sign_in_p: 'Ücretsiz izle. Tahmin yapmak, kaydetmek ve firmaları takip etmek için giriş yap.',
  email: 'Email', send_code: 'Kod gönder', code: '6 haneli kod', verify: 'Giriş yap', code_sent: 'Kodu şu adrese gönderdik:',
  scout: 'Kaşif', scout_p: 'Keşfet, oy ver, kaydet. Video paylaşamazsın.', creator: 'Firma / içerik üreticisi', creator_p: 'Oyunun, uygulaman, mağazan veya kanalın için video paylaş. Oy veremezsin.',
  handle: 'Kullanıcı adı', name: 'Görünen ad', birth: 'Doğum tarihi', terms: '18 yaşından büyüğüm, Kullanım Şartları ve Topluluk Kuralları’nı kabul ediyorum.',
  create: 'Profili oluştur', category: 'Kategori', sign_out: 'Çıkış yap', delete_account: 'Hesabı sil',
  delete_q: 'Hesabın silinsin mi? 30 gün içinde tekrar giriş yaparsan geri alabilirsin.', cancel: 'Vazgeç', ok: 'Tamam',
  guest_t: 'Misafir olarak izliyorsun', guest_p: 'Misafirler her şeyi izleyebilir. Oy vermek, kaydetmek ve takip etmek için giriş yap.',
  error: 'Bir şeyler ters gitti. Tekrar dene.', retry: 'Tekrar dene', report: 'Şikayet et', block: 'Engelle',
  more: 'daha fazla', less: 'daha az',
  help_title: 'Yardım ve yasal', help_contact: 'Destekle iletişim', help_terms: 'Kullanım Şartları', help_privacy: 'Gizlilik Politikası', help_guidelines: 'Topluluk Kuralları',
  delete_failed: 'Hesap silinemedi. Tekrar dene veya support@promovote.com adresine yaz.', delete_done: 'Hesabın 30 gün sonra silinecek. Bu süre içinde tekrar giriş yaparsan hesabın kalır.',
  gate_guest_t: 'Tahminini yapmak için giriş yap', gate_guest_p: 'Tahminin kilitlenir, sonucu 7 gün sonra gelir. İzlemek ücretsiz, giriş gerekmez.',
  gate_onb_t: 'Profilini tamamla', gate_onb_p: 'Bir adım kaldı, sonra tahminin sayılır.', finish_profile: 'Profili tamamla', not_now: 'Şimdi değil',
  gate_creator_t: 'Firmalar oy veremez', gate_creator_p: 'Sonuçlar adil kalsın diye sadece kaşifler tahmin yapar. İzlemeye ve paylaşmaya devam edebilirsin.',
  called: 'Tahmin edildi', result_on: 'Sonuç', scout_n: 'Kaşif #', say_blow_up: 'patlayacak diyor', already_called: 'Bu video için zaten tahmin yaptın.',
  saved: 'Kaydedildi', saved_toast: 'Profiline kaydedildi', unsaved_toast: 'Kaydedilenlerden çıkarıldı', more_actions: 'Diğer', blocked_toast: 'Engellendi. Bu firmayı artık görmeyeceksin.',
  report_t: 'Sorun ne?', report_thanks_t: 'Bildirdiğin için teşekkürler', report_thanks_p: 'Ekibimiz şikayetleri 24 saat içinde inceler.',
  r_spam: 'Spam veya dolandırıcılık', r_hate: 'Nefret veya taciz', r_violence: 'Şiddet', r_sexual: 'Cinsel içerik', r_copyright: 'Telif hakkı', r_minor: '18 yaşından küçük biri', r_other: 'Başka bir şey',
  with_email: 'Email ile devam et', email_soon: 'Email ile giriş henüz açık değil. Apple veya Google ile devam et.',
  with_google: 'Google ile devam et', soon_login: 'Giriş yakında açılıyor. Misafir olarak her şeyi izleyebilirsin.', legal_note: 'Devam ederek Kullanım Şartları ve Gizlilik Politikası’nı kabul edersin. Sadece 18 yaş üstü.',
};

const DICTS = { en, es, tr } as const;
export type Lang = keyof typeof DICTS;
export const LANGS: Lang[] = ['en', 'es', 'tr'];

export function deviceLang(): Lang {
  for (const l of getLocales()) {
    const code = (l.languageCode || '').toLowerCase();
    if ((LANGS as string[]).includes(code)) return code as Lang;
  }
  return 'en';
}

export const lang: Lang = deviceLang();
export const t = (key: Key): string => DICTS[lang][key] || en[key];
