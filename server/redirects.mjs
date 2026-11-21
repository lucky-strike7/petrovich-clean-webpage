// Migration map from the legacy site. Keep specific project matches before the fallback.
const exact = new Map([
  ['/video-content', '/works/exhibitions/'],
  ['/videocontent', '/works/exhibitions/'],
  ['/projects', '/works/'],
  ['/blogs', '/'],
  ['/about-us', '/about/'],
  ['/testimonials', '/'],
  ['/contacts', '/#contact'],
  ['/contact', '/#contact'],
  ['/projects/khakasiya', '/works/khakasia/'],
  // Старый кейс стола сведен со страницей экспоната в новой структуре
  ['/cases/khakasia', '/works/khakasia/stol/'],
  ['/projects/hersones', '/works/khersones/'],
  // Кейс Херсонеса сведен со страницей проекта в новой структуре
  ['/cases/hersones', '/works/khersones/'],
  ['/projects/referus', '/works/referus/'],
  ['/projects/etalon', '/works/etalon/'],
  ['/projects/yantarny', '/works/yantarny/'],
  ['/projects/premiarb', '/works/premiarb/'],
  ['/projects/hbo', '/works/hbo/'],
  // Кейс HBO пересобран в новой структуре
  ['/cases/hbo', '/works/hbo/'],
  ['/projects/rosnano', '/works/rosnano/'],
  ['/projects/nanolek', '/works/nanolek/'],
  ['/projects/donstroy', '/works/donstroy/'],
  ['/projects/gorodobrazovaniyya', '/works/gorodobrazovaniya/'],
  ['/projects/rosatom', '/works/rosatom/'],
  ['/projects/artmonta', '/works/artmonta/'],
  ['/projects/zebralog', '/works/zebralog/'],
  ['/projects/carrera', '/works/carrera/'],
  ['/projects/amperka', '/works/cyberbug/'],
  ['/cyberbug', '/works/cyberbug/'],
  // Кейсы переехали из /cases/ в /works/ (картинки остались в /cases/<slug>/media/)
  ['/cases/artmonta', '/works/artmonta/'],
  ['/cases/carrera', '/works/carrera/'],
  ['/cases/cyberbug', '/works/cyberbug/'],
  ['/cases/donstroy', '/works/donstroy/'],
  ['/cases/etalon', '/works/etalon/'],
  ['/cases/gorodobrazovaniya', '/works/gorodobrazovaniya/'],
  ['/cases/nanolek', '/works/nanolek/'],
  ['/cases/premiarb', '/works/premiarb/'],
  ['/cases/referus', '/works/referus/'],
  ['/cases/rosatom', '/works/rosatom/'],
  ['/cases/rosnano', '/works/rosnano/'],
  ['/cases/yantarny', '/works/yantarny/'],
  ['/cases/zebralog', '/works/zebralog/'],
  // Теги получили английские адреса вместо транслита
  ['/works/eksponaty', '/works/interactive/'],
  ['/works/scena', '/works/event-graphics/'],
  ['/works/dizayn', '/works/product-design/'],
  ['/works/sayty', '/works/websites/'],
  ['/works/muzei', '/works/museums/'],
  ['/works/vystavki', '/works/exhibitions/'],
  ['/works/zastr', '/works/stand-builders/'],
  ['/works/kino', '/works/film/'],
  ['/works/regiony', '/works/regions/'],
  ['/works/meropr', '/works/events/'],
  ['/works/developery', '/works/developers/'],
  ['/works/prom', '/works/industry/'],
  ['/blog-list', '/'],
  ['/p', '/'],
]);

export function legacyRedirect(pathname, search = '') {
  const path = pathname.replace(/\/+$/, '') || '/';
  const target = exact.get(path);
  if (!target) return null;
  const [base, fragment] = target.split('#');
  // Keep the original query bytes, order and repeated parameters; fragment must follow them.
  return base + search + (fragment ? '#' + fragment : '');
}
