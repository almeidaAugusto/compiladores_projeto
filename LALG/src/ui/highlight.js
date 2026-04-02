(() => {
    const LALG = window.LALG = window.LALG || {};
    const { escapeHtml } = LALG;

    function highlightCode(code, erros) {
        const PALAVRAS_RE = /\b(program|begin|end|procedure|var|if|then|else|while|do|not|or|and|div|read|write|true|false|int|boolean)\b/gi;
        const NUMERO_RE = /\b\d+\b/g;
        const COMENTARIO_BLOCO_RE = /\{[^}]*\}/g;
        const COMENTARIO_LINHA_RE = /\/\/[^\n]*/g;
        const OP_RE = /(:=|<>|<=|>=|[+\-*=<>])/g;
        const spans = [];

        function addSpans(regex, cls) {
            let match;
            while ((match = regex.exec(code)) !== null) {
                spans.push({
                    start: match.index,
                    end: match.index + match[0].length,
                    cls,
                    text: match[0],
                });
            }
        }

        addSpans(COMENTARIO_BLOCO_RE, "hl-comment");
        addSpans(COMENTARIO_LINHA_RE, "hl-comment");
        addSpans(PALAVRAS_RE, "hl-keyword");
        addSpans(NUMERO_RE, "hl-number");
        addSpans(OP_RE, "hl-operator");

        if (erros && erros.length > 0) {
            for (const e of erros) {
                if (e.index != null && e.index >= 0 && e.index < code.length) {
                    spans.push({
                        start: e.index,
                        end: e.index + 1,
                        cls: "hl-error",
                        text: code[e.index],
                    });
                }
            }
        }

        const comentarios = spans.filter((s) => s.cls === "hl-comment");
        const erroSpans = spans.filter((s) => s.cls === "hl-error");
        const filtrados = spans.filter((s) => {
            if (s.cls === "hl-error") return true;
            if (s.cls === "hl-comment") return !erroSpans.some((e) => s.start <= e.start && s.end >= e.end);
            return !comentarios.some((c) => s.start >= c.start && s.end <= c.end)
                && !erroSpans.some((e) => s.start <= e.start && s.end >= e.end);
        });

        filtrados.sort((a, b) => a.start - b.start || b.end - a.end);

        const final = [];
        let lastEnd = 0;
        for (const s of filtrados) {
            if (s.start >= lastEnd) {
                final.push(s);
                lastEnd = s.end;
            }
        }

        let result = "";
        let pos = 0;
        for (const s of final) {
            if (s.start > pos) {
                result += escapeHtml(code.substring(pos, s.start));
            }
            result += `<span class="${s.cls}">${escapeHtml(s.text)}</span>`;
            pos = s.end;
        }
        if (pos < code.length) {
            result += escapeHtml(code.substring(pos));
        }

        return result;
    }

    LALG.highlightCode = highlightCode;
})();
