// Armazenamento da sessão do Supabase no navegador.
//
// A versão anterior deste arquivo trocava a sessão com o editor da plataforma
// de origem por postMessage, o que só fazia sentido dentro do preview dela.
// Fora dali o comportamento correto é o padrão: localStorage no cliente, e
// nada no servidor (o SSR não guarda sessão).
export function brokeredPreviewStorage() {
  if (typeof window === "undefined") return undefined;
  return localStorage;
}
