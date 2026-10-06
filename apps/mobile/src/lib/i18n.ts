// App strings in English, Spanish and Turkish. Device language first, English fallback.
import { getLocales } from 'expo-localization';

const en = {
  tab_feed: 'Feed', tab_explore: 'Explore', tab_me: 'Profile',
  will_blow_up: 'Will blow up', not_for_me: 'Not for me', save: 'Save', share: 'Share',
  soon: 'Coming soon', android_soon: 'Google Play coming soon', founder_made: 'Made by the PromoVote founder',
  cta_app_store: 'Download on the App Store', cta_shop: 'Visit the shop', cta_etsy: 'View on Etsy', cta_notify: 'Notify me at launch', cta_website: 'Open website', cta_watch: 'Watch',
  search: 'Search games, apps, shops or #hashtags', all: 'All', games: 'Games', apps: 'Apps', shops: 'Shops',
  creators: 'Creators', hashtags: 'Hashtags', promos: 'Promos', nothing: 'Nothing matches yet.',
  charts: 'Charts', charts_soon: 'Charts open when voting starts. Paid boosts never buy a spot.',
  follow: 'Follow', following: 'Following', followers: 'followers',
  sign_in: 'Sign in', sign_in_t: 'Join PromoVote', sign_in_p: 'Watch free. Sign in to vote, save, follow and unlock perks.',
  email: 'Email', send_code: 'Send code', code: '6 digit code', verify: 'Sign in', code_sent: 'We sent a code to',
  scout: 'Scout', scout_p: 'Discover, vote and save. You cannot post promos.', creator: 'Creator', creator_p: 'Post promos for your game, app, shop or channel. You cannot vote.',
  handle: 'Username', name: 'Display name', birth: 'Date of birth', terms: 'I am 18 or older and accept the Terms and Community Guidelines.',
  create: 'Create profile', category: 'Category', sign_out: 'Sign out', delete_account: 'Delete account',
  delete_q: 'Delete your account? You have 30 days to change your mind by signing in again.', cancel: 'Cancel', ok: 'OK',
  guest_t: 'You are watching as a guest', guest_p: 'Guests can watch everything. Sign in to vote, save and follow.',
  error: 'Something went wrong. Try again.', retry: 'Try again', report: 'Report', block: 'Block',
};
type Key = keyof typeof en;
const es: Partial<Record<Key, string>> = {
  tab_feed: 'Feed', tab_explore: 'Explorar', tab_me: 'Perfil',
  will_blow_up: 'Va a explotar', not_for_me: 'No es para mí', save: 'Guardar', share: 'Compartir',
  soon: 'Muy pronto', android_soon: 'Pronto en Google Play', founder_made: 'Hecho por el fundador de PromoVote',
  cta_app_store: 'Descargar en App Store', cta_shop: 'Visitar la tienda', cta_etsy: 'Ver en Etsy', cta_notify: 'Avísame al lanzar', cta_website: 'Abrir sitio web', cta_watch: 'Ver',
  search: 'Busca juegos, apps, tiendas o #hashtags', all: 'Todo', games: 'Juegos', apps: 'Apps', shops: 'Tiendas',
  creators: 'Creadores', hashtags: 'Hashtags', promos: 'Promos', nothing: 'Nada coincide todavía.',
  charts: 'Rankings', charts_soon: 'Los rankings abren cuando empiece la votación. Pagar nunca compra un puesto.',
  follow: 'Seguir', following: 'Siguiendo', followers: 'seguidores',
  sign_in: 'Entrar', sign_in_t: 'Únete a PromoVote', sign_in_p: 'Mira gratis. Entra para votar, guardar, seguir y desbloquear ventajas.',
  email: 'Email', send_code: 'Enviar código', code: 'Código de 6 dígitos', verify: 'Entrar', code_sent: 'Enviamos un código a',
  scout: 'Explorador', scout_p: 'Descubre, vota y guarda. No puedes publicar promos.', creator: 'Creador', creator_p: 'Publica promos de tu juego, app, tienda o canal. No puedes votar.',
  handle: 'Usuario', name: 'Nombre visible', birth: 'Fecha de nacimiento', terms: 'Tengo 18 años o más y acepto los Términos y las Normas de la comunidad.',
  create: 'Crear perfil', category: 'Categoría', sign_out: 'Salir', delete_account: 'Eliminar cuenta',
  delete_q: '¿Eliminar tu cuenta? Tienes 30 días para cambiar de opinión entrando de nuevo.', cancel: 'Cancelar', ok: 'OK',
  guest_t: 'Estás mirando como invitado', guest_p: 'Los invitados pueden ver todo. Entra para votar, guardar y seguir.',
  error: 'Algo salió mal. Inténtalo de nuevo.', retry: 'Reintentar', report: 'Reportar', block: 'Bloquear',
};
const tr: Partial<Record<Key, string>> = {
  tab_feed: 'Akış', tab_explore: 'Keşfet', tab_me: 'Profil',
  will_blow_up: 'Patlayacak', not_for_me: 'Bana göre değil', save: 'Kaydet', share: 'Paylaş',
  soon: 'Yakında', android_soon: "Yakında Google Play'de", founder_made: 'PromoVote kurucusunun yapımı',
  cta_app_store: "App Store'dan indir", cta_shop: 'Mağazaya git', cta_etsy: "Etsy'de gör", cta_notify: 'Çıkınca haber ver', cta_website: 'Siteyi aç', cta_watch: 'İzle',
  search: 'Oyun, uygulama, mağaza veya #hashtag ara', all: 'Tümü', games: 'Oyunlar', apps: 'Uygulamalar', shops: 'Mağazalar',
  creators: 'Firmalar', hashtags: 'Hashtagler', promos: 'Videolar', nothing: 'Henüz eşleşen yok.',
  charts: 'Sıralamalar', charts_soon: 'Sıralamalar oylama başlayınca açılacak. Para verip sıralamaya girilemez.',
  follow: 'Takip et', following: 'Takiptesin', followers: 'takipçi',
  sign_in: 'Giriş yap', sign_in_t: "PromoVote'a katıl", sign_in_p: 'Ücretsiz izle. Oy vermek, kaydetmek, takip etmek ve hediyeler için giriş yap.',
  email: 'Email', send_code: 'Kod gönder', code: '6 haneli kod', verify: 'Giriş yap', code_sent: 'Kodu şu adrese gönderdik:',
  scout: 'Kaşif', scout_p: 'Keşfet, oy ver, kaydet. Video paylaşamazsın.', creator: 'Firma / içerik üreticisi', creator_p: 'Oyunun, uygulaman, mağazan veya kanalın için video paylaş. Oy veremezsin.',
  handle: 'Kullanıcı adı', name: 'Görünen ad', birth: 'Doğum tarihi', terms: '18 yaşından büyüğüm, Kullanım Şartları ve Topluluk Kuralları’nı kabul ediyorum.',
  create: 'Profili oluştur', category: 'Kategori', sign_out: 'Çıkış yap', delete_account: 'Hesabı sil',
  delete_q: 'Hesabın silinsin mi? 30 gün içinde tekrar giriş yaparsan geri alabilirsin.', cancel: 'Vazgeç', ok: 'Tamam',
  guest_t: 'Misafir olarak izliyorsun', guest_p: 'Misafirler her şeyi izleyebilir. Oy vermek, kaydetmek ve takip etmek için giriş yap.',
  error: 'Bir şeyler ters gitti. Tekrar dene.', retry: 'Tekrar dene', report: 'Şikayet et', block: 'Engelle',
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
