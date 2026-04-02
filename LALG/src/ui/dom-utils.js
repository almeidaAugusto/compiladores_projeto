(() => {
    const LALG = window.LALG = window.LALG || {};

    function escapeHtml(text) {
        const div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
    }

    function getErrorContext(entrada, index) {
        if (index == null || index < 0 || index >= entrada.length) return null;
        const lineStart = entrada.lastIndexOf("\n", index - 1) + 1;
        let lineEnd = entrada.indexOf("\n", index);
        if (lineEnd === -1) lineEnd = entrada.length;
        const lineText = entrada.substring(lineStart, lineEnd);
        const colInLine = index - lineStart;
        return { lineText, colInLine };
    }

    LALG.escapeHtml = escapeHtml;
    LALG.getErrorContext = getErrorContext;
})();
