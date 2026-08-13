(() => {
    const LALG = window.LALG = window.LALG || {};
    const { TOKENS } = LALG;

    function normalizarChaveLexica(nome) {
        return String(nome ?? "").toLowerCase();
    }

    // Este mapa é apenas um índice léxico de ocorrências para a interface.
    // Declarações, categorias, tipos e escopos pertencem à tabela semântica.
    function buildTabelaSimbolos(tokens) {
        const tabela = new Map();
        for (const t of tokens) {
            if (t.cod === TOKENS.IDENTIFICADOR) {
                const nome = t.lexema;
                const chave = normalizarChaveLexica(nome);
                if (!tabela.has(chave)) {
                    tabela.set(chave, { nome, chave, linhas: [], ocorrencias: 0 });
                }
                const entry = tabela.get(chave);
                entry.ocorrencias++;
                if (!entry.linhas.includes(t.startLine)) {
                    entry.linhas.push(t.startLine);
                }
            }
        }
        return tabela;
    }

    LALG.normalizarChaveLexica = normalizarChaveLexica;
    LALG.buildIndiceOcorrenciasLexicas = buildTabelaSimbolos;
    LALG.buildTabelaSimbolos = buildTabelaSimbolos;
})();
