// Migration map from the legacy site. Keep specific project matches before the fallback.
const exact = new Map([
  ['/video-content', '/'],
  ['/videocontent', '/'],
  ['/about-us', '/#process'],
  ['/testimonials', '/'],
  ['/contacts', '/#contact'],
  ['/contact', '/#contact'],
  ['/projects/khakasiya', '/works/khakasia/'],
  // Старый кейс стола сведен со страницей экспоната в новой структуре
  ['/cases/khakasia', '/works/khakasia/stol/'],
  ['/projects/hersones', '/works/khersones/'],
  // Кейс Херсонеса сведен со страницей проекта в новой структуре
  ['/cases/hersones', '/works/khersones/'],
  ['/projects/referus', '/cases/referus/'],
  ['/projects/etalon', '/cases/etalon/'],
  ['/projects/yantarny', '/cases/yantarny/'],
  ['/projects/premiarb', '/cases/premiarb/'],
  ['/projects/hbo', '/cases/hbo/'],
  ['/projects/rosnano', '/cases/rosnano/'],
  ['/projects/nanolek', '/cases/nanolek/'],
  ['/projects/donstroy', '/cases/donstroy/'],
  ['/projects/gorodobrazovaniyya', '/cases/gorodobrazovaniya/'],
  ['/projects/rosatom', '/cases/rosatom/'],
  ['/projects/artmonta', '/cases/artmonta/'],
  ['/projects/zebralog', '/cases/zebralog/'],
  ['/projects/carrera', '/cases/carrera/'],
  ['/projects/amperka', '/cases/cyberbug/'],
  ['/cyberbug', '/cases/cyberbug/'],
  ['/blog-list', '/'],
  ['/p', '/'],
]);

export function legacyRedirect(pathname, search = '') {
  const path = pathname.replace(/\/+$/, '') || '/';
  let target = exact.get(path);
  if (!target && (path === '/projects' || path.startsWith('/projects/'))) target = '/#projects';
  if (!target && (path === '/blogs' || path.startsWith('/blogs/'))) target = '/';
  if (!target) return null;
  const [base, fragment] = target.split('#');
  // Keep the original query bytes, order and repeated parameters; fragment must follow them.
  return base + search + (fragment ? '#' + fragment : '');
}
