// 서식(HTML)과 일반 텍스트를 함께 복사한다. 워드프로세서는 HTML을, 메모장은 텍스트를 쓴다.
// HTML 복사를 지원하지 않는 브라우저에서는 텍스트만 복사한다.
export async function copyRich(html: string, plain: string) {
  if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([plain], { type: "text/plain" }),
        }),
      ]);
      return true;
    } catch {
      // 아래 텍스트 복사로 넘어간다
    }
  }
  try {
    await navigator.clipboard.writeText(plain);
    return true;
  } catch {
    return false;
  }
}
