// Ponto único por onde passam os erros capturados pelas fronteiras de erro do
// React. Hoje só registra no console; se um dia entrar um serviço de telemetria
// (Sentry, Logtail, o que for), é aqui que ele se conecta, sem espalhar a
// chamada pelas páginas.
export function reportClientError(error: unknown, context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;

  // Loaders e server functions costumam lançar um Response cru, e String(ele)
  // vira o opaco "[object Response]". Melhor extrair status e URL.
  const message =
    error instanceof Response
      ? `Response ${error.status}${error.url ? ` em ${error.url}` : ""}`
      : error instanceof Error
        ? error.message
        : String(error);

  console.error("[erro de aplicação]", message, {
    route: window.location.pathname,
    ...context,
  });
}
