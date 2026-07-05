/**
 * Rotas com barra de ação fixa própria no rodapé (treino/[id], atividades/[id]):
 * a bottom nav global fica escondida para não sobrepor esses botões, e o shell
 * não precisa reservar o espaço de 120px da nav — a própria página já reserva
 * o necessário para o seu rodapé fixo.
 */
export const HIDE_BOTTOM_NAV_ON = [/^\/treino\/[^/]+$/, /^\/atividades\/[^/]+$/];

export function isBottomNavHidden(pathname: string): boolean {
  return HIDE_BOTTOM_NAV_ON.some((re) => re.test(pathname));
}
