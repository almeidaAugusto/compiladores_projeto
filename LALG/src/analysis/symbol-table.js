(() => {
    const LALG = window.LALG = window.LALG || {};
    const { TOKENS } = LALG;

    function buildTabelaSimbolos(tokens) {
        const tabela = new Map();
        for (const t of tokens) {
            if (t.cod === TOKENS.IDENTIFICADOR) {
                const nome = t.lexema;
                if (!tabela.has(nome)) {
                    tabela.set(nome, { nome, linhas: [], ocorrencias: 0 });
                }
                const entry = tabela.get(nome);
                entry.ocorrencias++;
                if (!entry.linhas.includes(t.startLine)) {
                    entry.linhas.push(t.startLine);
                }
            }
        }
        return tabela;
    }

    LALG.buildTabelaSimbolos = buildTabelaSimbolos;
})();
