(() => {
    const LALG = window.LALG = window.LALG || {};
    const { Buffer, isDigito, isLetra, isWhitespace, PALAVRAS_RESERVADAS, TOKEN_NOMES, TOKENS } = LALG;

    const ESTADO = {
        INICIO: "INICIO",
        IDENT: "IDENT",
        NUMERO: "NUMERO",
        DOIS_PTS: "DOIS_PTS",
        MENOR_Q: "MENOR_Q",
        MAIOR_Q: "MAIOR_Q",
        BARRA_Q: "BARRA_Q",
        COMENT_BLOCO: "COMENT_BLOCO",
        COMENT_LINHA: "COMENT_LINHA",
    };

    const SIMPLES_MAP = {
        "=": TOKENS.IGUAL,
        "+": TOKENS.MAIS,
        "-": TOKENS.MENOS,
        "*": TOKENS.VEZES,
        ";": TOKENS.PONTO_VIRGULA,
        ".": TOKENS.PONTO_FINAL,
        ",": TOKENS.VIRGULA,
        "(": TOKENS.ABRE_PAR,
        ")": TOKENS.FECHA_PAR,
        "[": TOKENS.ABRE_COL,
        "]": TOKENS.FECHA_COL,
    };

    function scanner(entrada) {
        const buf = new Buffer(entrada);
        const tokens = [];
        const erros = [];

        function retornar(cod, lexema, startLine, startCol, endLine, endCol, startIndex, endIndex) {
            tokens.push({
                cod,
                token: TOKEN_NOMES[cod],
                lexema,
                startLine,
                startCol,
                endLine,
                endCol,
                startIndex,
                endIndex,
            });
        }

        function erro(mensagem, startLine, startCol, endCol, index) {
            erros.push({ mensagem, line: startLine, col: startCol, endCol, index });
        }

        while (!buf.eof()) {
            let estado = ESTADO.INICIO;
            let lexema = "";
            let startLine;
            let startCol;
            let startIndex;

            const c = buf.ler();
            if (c === null) break;

            if (isWhitespace(c)) continue;

            const posInfo = buf.getInfoLeitura();
            startLine = posInfo.line;
            startCol = posInfo.col;
            startIndex = posInfo.pos;

            if (isLetra(c)) {
                estado = ESTADO.IDENT;
                lexema = c;

                while (!buf.eof()) {
                    const next = buf.ler();
                    if (next !== null && (isLetra(next) || isDigito(next))) {
                        lexema += next;
                    } else {
                        if (next !== null) buf.retroceder();
                        break;
                    }
                }

                const lower = lexema.toLowerCase();
                const cod = PALAVRAS_RESERVADAS.has(lower) ? PALAVRAS_RESERVADAS.get(lower) : TOKENS.IDENTIFICADOR;
                retornar(cod, lexema, startLine, startCol, buf.line, buf.col - 1, startIndex, buf.pos - 1);
                continue;
            }

            if (isDigito(c)) {
                estado = ESTADO.NUMERO;
                lexema = c;

                while (!buf.eof()) {
                    const next = buf.ler();
                    if (next !== null && isDigito(next)) {
                        lexema += next;
                    } else {
                        if (next !== null) buf.retroceder();
                        break;
                    }
                }

                retornar(TOKENS.NUMERO, lexema, startLine, startCol, buf.line, buf.col - 1, startIndex, buf.pos - 1);
                continue;
            }

            if (c === ":") {
                estado = ESTADO.DOIS_PTS;
                const next = buf.lookahead();

                if (next === "=") {
                    buf.ler();
                    retornar(TOKENS.ATRIBUICAO, ":=", startLine, startCol, buf.line, buf.col - 1, startIndex, buf.pos - 1);
                } else {
                    retornar(TOKENS.DOIS_PONTOS, ":", startLine, startCol, startLine, startCol, startIndex, startIndex);
                }
                continue;
            }

            if (c === "<") {
                estado = ESTADO.MENOR_Q;
                const next = buf.lookahead();

                if (next === ">") {
                    buf.ler();
                    retornar(TOKENS.DIFERENTE, "<>", startLine, startCol, buf.line, buf.col - 1, startIndex, buf.pos - 1);
                } else if (next === "=") {
                    buf.ler();
                    retornar(TOKENS.MENOR_IGUAL, "<=", startLine, startCol, buf.line, buf.col - 1, startIndex, buf.pos - 1);
                } else {
                    retornar(TOKENS.MENOR, "<", startLine, startCol, startLine, startCol, startIndex, startIndex);
                }
                continue;
            }

            if (c === ">") {
                estado = ESTADO.MAIOR_Q;
                const next = buf.lookahead();

                if (next === "=") {
                    buf.ler();
                    retornar(TOKENS.MAIOR_IGUAL, ">=", startLine, startCol, buf.line, buf.col - 1, startIndex, buf.pos - 1);
                } else {
                    retornar(TOKENS.MAIOR, ">", startLine, startCol, startLine, startCol, startIndex, startIndex);
                }
                continue;
            }

            if (c === "/") {
                estado = ESTADO.BARRA_Q;
                const next = buf.lookahead();

                if (next === "/") {
                    buf.ler();
                    estado = ESTADO.COMENT_LINHA;
                    while (!buf.eof()) {
                        const ch = buf.ler();
                        if (ch === "\n") break;
                    }
                } else {
                    erro("caractere inv\u00e1lido '/'", startLine, startCol, startCol, startIndex);
                }
                continue;
            }

            if (c === "{") {
                estado = ESTADO.COMENT_BLOCO;
                let fechou = false;

                while (!buf.eof()) {
                    const ch = buf.ler();
                    if (ch === "}") {
                        fechou = true;
                        break;
                    }
                }

                if (!fechou) {
                    erro("coment\u00e1rio de bloco '{' n\u00e3o fechado", startLine, startCol, startCol, startIndex);
                }
                continue;
            }

            if (c === "}") {
                erro("'}' sem '{' correspondente", startLine, startCol, startCol, startIndex);
                continue;
            }

            if (c in SIMPLES_MAP) {
                const cod = SIMPLES_MAP[c];
                retornar(cod, c, startLine, startCol, startLine, startCol, startIndex, startIndex);
                continue;
            }

            erro(`caractere inv\u00e1lido '${c}'`, startLine, startCol, startCol, startIndex);
        }

        return {
            tokens: tokens.map((t) => ({
                token: t.token,
                lexema: t.lexema,
                cod: t.cod,
                startLine: t.startLine,
                startCol: t.startCol,
                endLine: t.endLine,
                endCol: t.endCol,
                startIndex: t.startIndex,
                endIndex: t.endIndex,
            })),
            erros,
        };
    }

    LALG.scanner = scanner;
})();
