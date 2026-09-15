/** Dispara o download de um arquivo de texto gerado no navegador. */
export function downloadFile(fileName: string, content: string, mime = "text/csv;charset=utf-8") {
  const blob = new Blob([mime.startsWith("text/csv") ? "\uFEFF" + content : content], {
    type: mime,
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Abre a caixa de impressão do navegador para salvar a visão atual em PDF. */
export function printToPdf() {
  window.print();
}
