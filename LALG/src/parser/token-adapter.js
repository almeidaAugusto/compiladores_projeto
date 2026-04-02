(() => {
    const LALG = window.LALG = window.LALG || {};
    const { TOKENS } = LALG;

    const SINTATICO_TOKENS = Object.freeze({
        IDENTIFICADOR: TOKENS.IDENTIFICADOR,
        INT: TOKENS.INT,
        BOOLEAN: TOKENS.BOOLEAN,
        VIRGULA: TOKENS.VIRGULA,
        PONTO_E_VIRGULA: TOKENS.PONTO_VIRGULA,
        EOF: "EOF",
    });

    function nomeTerminal(cod) {
        if (cod === SINTATICO_TOKENS.IDENTIFICADOR) return "IDENTIFICADOR";
        if (cod === SINTATICO_TOKENS.INT) return "int";
        if (cod === SINTATICO_TOKENS.BOOLEAN) return "boolean";
        if (cod === SINTATICO_TOKENS.VIRGULA) return "','";
        if (cod === SINTATICO_TOKENS.PONTO_E_VIRGULA) return "';'";
        if (cod === SINTATICO_TOKENS.EOF) return "EOF";
        return String(cod);
    }

    function criarTokenEOF(tokens) {
        if (!tokens || tokens.length === 0) {
            return {
                cod: SINTATICO_TOKENS.EOF,
                token: "EOF",
                lexema: "<EOF>",
                startLine: 1,
                startCol: 1,
                endLine: 1,
                endCol: 1,
                startIndex: 0,
                endIndex: 0,
            };
        }

        const ultimo = tokens[tokens.length - 1];
        const startLine = ultimo.endLine ?? ultimo.startLine ?? null;
        const startColBase = ultimo.endCol ?? ultimo.startCol ?? 0;
        const startCol = startLine == null ? null : startColBase + 1;
        const startIndexBase = ultimo.endIndex ?? ultimo.startIndex ?? -1;
        const startIndex = startIndexBase + 1;

        return {
            cod: SINTATICO_TOKENS.EOF,
            token: "EOF",
            lexema: "<EOF>",
            startLine,
            startCol,
            endLine: startLine,
            endCol: startCol,
            startIndex,
            endIndex: startIndex,
        };
    }

    function criarEntradaSintatica(tokensLexicos) {
        return [...tokensLexicos, criarTokenEOF(tokensLexicos)];
    }

    LALG.SINTATICO_TOKENS = SINTATICO_TOKENS;
    LALG.nomeTerminal = nomeTerminal;
    LALG.criarEntradaSintatica = criarEntradaSintatica;
})();
