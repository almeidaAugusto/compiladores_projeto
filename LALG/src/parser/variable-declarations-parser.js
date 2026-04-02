(() => {
    const LALG = window.LALG = window.LALG || {};
    const { TokenStream, criarEntradaSintatica, SINTATICO_TOKENS, criarErroEsperado } = LALG;

    function ehTipo(token) {
        return token.cod === SINTATICO_TOKENS.INT || token.cod === SINTATICO_TOKENS.BOOLEAN;
    }

    function lexemaTipo(tokenTipo) {
        return tokenTipo.cod === SINTATICO_TOKENS.INT ? "int" : "boolean";
    }

    class ParserDeclaracoesVariaveis {
        constructor(tokensLexicos) {
            this.stream = new TokenStream(criarEntradaSintatica(tokensLexicos));
        }

        tokenAtual() {
            return this.stream.lookahead(0);
        }

        avancar() {
            return this.stream.advance();
        }

        casar(codEsperado, contexto = "") {
            const atual = this.tokenAtual();
            if (atual.cod !== codEsperado) {
                throw criarErroEsperado(atual, [codEsperado], contexto);
            }
            return this.avancar();
        }

        parseParteDeclaracoesVariaveis() {
            const declaracoes = [];

            declaracoes.push(this.parseDeclaracaoVariaveis());
            this.casar(SINTATICO_TOKENS.PONTO_E_VIRGULA, "<parte de declaracoes de variaveis>");

            while (ehTipo(this.tokenAtual())) {
                declaracoes.push(this.parseDeclaracaoVariaveis());
                this.casar(SINTATICO_TOKENS.PONTO_E_VIRGULA, "<parte de declaracoes de variaveis>");
            }

            this.casar(SINTATICO_TOKENS.EOF, "fim da entrada");

            return {
                tipoNo: "ParteDeclaracoesVariaveis",
                declaracoes,
            };
        }

        parseDeclaracaoVariaveis() {
            const tipo = this.parseTipo();
            const identificadores = this.parseListaIdentificadores();

            return {
                tipoNo: "DeclaracaoVariaveis",
                tipo,
                identificadores,
            };
        }

        parseTipo() {
            const atual = this.tokenAtual();
            if (!ehTipo(atual)) {
                throw criarErroEsperado(atual, [SINTATICO_TOKENS.INT, SINTATICO_TOKENS.BOOLEAN], "<tipo>");
            }

            const tokenTipo = this.avancar();
            return {
                token: tokenTipo.token,
                lexema: tokenTipo.lexema,
                nome: lexemaTipo(tokenTipo),
                posicao: {
                    linha: tokenTipo.startLine,
                    coluna: tokenTipo.startCol,
                },
            };
        }

        parseListaIdentificadores() {
            const ids = [];
            const primeiro = this.casar(SINTATICO_TOKENS.IDENTIFICADOR, "<lista de identificadores>");
            ids.push(this.criarNoIdentificador(primeiro));

            while (this.tokenAtual().cod === SINTATICO_TOKENS.VIRGULA) {
                this.avancar();
                const id = this.casar(SINTATICO_TOKENS.IDENTIFICADOR, "<lista de identificadores>");
                ids.push(this.criarNoIdentificador(id));
            }

            return ids;
        }

        criarNoIdentificador(tokenId) {
            return {
                token: tokenId.token,
                lexema: tokenId.lexema,
                posicao: {
                    linha: tokenId.startLine,
                    coluna: tokenId.startCol,
                },
            };
        }
    }

    function parseParteDeclaracoesVariaveis(tokensLexicos) {
        const parser = new ParserDeclaracoesVariaveis(tokensLexicos);
        return parser.parseParteDeclaracoesVariaveis();
    }

    LALG.ParserDeclaracoesVariaveis = ParserDeclaracoesVariaveis;
    LALG.parseParteDeclaracoesVariaveis = parseParteDeclaracoesVariaveis;
})();
