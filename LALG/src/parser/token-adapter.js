(() => {
    const LALG = window.LALG = window.LALG || {};
    const { TOKENS } = LALG;

    const SINTATICO_TOKENS = Object.freeze({
        PROGRAM: TOKENS.PROGRAM,
        BEGIN: TOKENS.BEGIN,
        END: TOKENS.END,
        PROCEDURE: TOKENS.PROCEDURE,
        VAR: TOKENS.VAR,
        IF: TOKENS.IF,
        THEN: TOKENS.THEN,
        ELSE: TOKENS.ELSE,
        WHILE: TOKENS.WHILE,
        DO: TOKENS.DO,
        NOT: TOKENS.NOT,
        OR: TOKENS.OR,
        AND: TOKENS.AND,
        DIV: TOKENS.DIV,
        IDENTIFICADOR: TOKENS.IDENTIFICADOR,
        NUMERO: TOKENS.NUMERO,
        ATRIBUICAO: TOKENS.ATRIBUICAO,
        PONTO_E_VIRGULA: TOKENS.PONTO_VIRGULA,
        PONTO_FINAL: TOKENS.PONTO_FINAL,
        VIRGULA: TOKENS.VIRGULA,
        DOIS_PONTOS: TOKENS.DOIS_PONTOS,
        ABRE_PAR: TOKENS.ABRE_PAR,
        FECHA_PAR: TOKENS.FECHA_PAR,
        ABRE_COL: TOKENS.ABRE_COL,
        FECHA_COL: TOKENS.FECHA_COL,
        IGUAL: TOKENS.IGUAL,
        DIFERENTE: TOKENS.DIFERENTE,
        MENOR: TOKENS.MENOR,
        MENOR_IGUAL: TOKENS.MENOR_IGUAL,
        MAIOR: TOKENS.MAIOR,
        MAIOR_IGUAL: TOKENS.MAIOR_IGUAL,
        MAIS: TOKENS.MAIS,
        MENOS: TOKENS.MENOS,
        VEZES: TOKENS.VEZES,
        EOF: TOKENS.EOF,
    });

    function criarTokenEOF(tokens) {
        if (tokens?.eof?.cod === SINTATICO_TOKENS.EOF) {
            return tokens.eof;
        }

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

    function criarEntradaSintatica(tokensLexicos, eofExplicito = null) {
        const tokens = Array.isArray(tokensLexicos)
            ? tokensLexicos
            : (tokensLexicos?.tokens ?? []);
        const eofInformado = eofExplicito ?? tokensLexicos?.eof ?? tokens.eof;
        const ultimo = tokens[tokens.length - 1];

        if (ultimo?.cod === SINTATICO_TOKENS.EOF) {
            return [...tokens];
        }

        if (eofInformado?.cod === SINTATICO_TOKENS.EOF) {
            return [...tokens, eofInformado];
        }

        return [...tokens, criarTokenEOF(tokens)];
    }

    LALG.SINTATICO_TOKENS = SINTATICO_TOKENS;
    LALG.criarEntradaSintatica = criarEntradaSintatica;
})();
