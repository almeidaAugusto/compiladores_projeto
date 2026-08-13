(() => {
    const LALG = window.LALG = window.LALG || {};
    const { TokenStream, criarEntradaSintatica, SINTATICO_TOKENS, ErroSintatico } = LALG;
    const T = SINTATICO_TOKENS;

    function conjunto(...entradas) {
        const resultado = new Set();
        entradas.forEach((entrada) => {
            if (entrada instanceof Set) {
                entrada.forEach((item) => resultado.add(item));
                return;
            }
            resultado.add(entrada);
        });
        return resultado;
    }

    const RELACOES = conjunto(T.IGUAL, T.DIFERENTE, T.MENOR, T.MENOR_IGUAL, T.MAIOR, T.MAIOR_IGUAL);
    const OPERADORES_ADITIVOS = conjunto(T.MAIS, T.MENOS, T.OR);
    const OPERADORES_MULTIPLICATIVOS = conjunto(T.VEZES, T.DIV, T.AND);
    const INICIO_COMANDO = conjunto(T.IDENTIFICADOR, T.BEGIN, T.IF, T.WHILE);
    const INICIO_FATOR = conjunto(T.IDENTIFICADOR, T.NUMERO, T.ABRE_PAR, T.NOT);
    const INICIO_EXPRESSAO = conjunto(INICIO_FATOR, T.MAIS, T.MENOS);
    const FIM_EXPRESSAO = conjunto(
        T.FECHA_PAR,
        T.FECHA_COL,
        T.VIRGULA,
        T.PONTO_E_VIRGULA,
        T.THEN,
        T.DO,
        T.END,
        T.ELSE,
        T.PONTO_FINAL,
        T.EOF
    );
    const FIM_COMANDO = conjunto(T.PONTO_E_VIRGULA, T.END, T.ELSE, T.PONTO_FINAL, T.EOF);

    function ehNomeTipo(token) {
        return token.cod === T.IDENTIFICADOR;
    }

    function ehNomeProcedimento(token) {
        return token.cod === T.IDENTIFICADOR;
    }

    class ParserPrograma {
        constructor(tokensLexicos, eof = null) {
            this.stream = new TokenStream(criarEntradaSintatica(tokensLexicos, eof));
            this.erros = [];
            this.regras = [];
            this.tokensConsumidos = [];
            this.declaracoes = [];
        }

        parse() {
            const arvore = this.programa() ?? { tipoNo: "Programa", nome: null, bloco: null };

            return {
                ...arvore,
                declaracoes: this.declaracoes,
                erros: this.erros,
                regras: this.regras,
                tokensConsumidos: this.tokensConsumidos,
            };
        }

        tokenAtual() {
            return this.stream.lookahead(0);
        }

        proximoToken() {
            return this.stream.lookahead(1);
        }

        avancar() {
            const token = this.stream.advance();
            if (token.cod !== T.EOF) {
                this.tokensConsumidos.push(token);
            }
            return token;
        }

        registrarRegra(nome) {
            this.regras.push(nome);
        }

        registrarErro(mensagem, token = this.tokenAtual(), esperados = [], contexto = "") {
            const erro = new ErroSintatico(mensagem, {
                esperados,
                encontrado: token,
                contexto,
            });
            this.erros.push(erro);
            return erro;
        }

        sincronizar(tokensSincronizacao) {
            while (this.tokenAtual().cod !== T.EOF && !tokensSincronizacao.has(this.tokenAtual().cod)) {
                this.avancar();
            }
        }

        casar(codEsperado, mensagem, tokensSincronizacao = conjunto()) {
            if (this.tokenAtual().cod === codEsperado) {
                return this.avancar();
            }

            this.registrarErro(mensagem, this.tokenAtual(), [codEsperado]);
            const recuperacao = conjunto(tokensSincronizacao, codEsperado, T.EOF);

            if (!recuperacao.has(this.tokenAtual().cod)) {
                this.sincronizar(recuperacao);
            }

            if (this.tokenAtual().cod === codEsperado) {
                return this.avancar();
            }

            return null;
        }

        programa() {
            this.registrarRegra("<programa> ::= program <identificador> ; <bloco> .");
            const tokenProgram = this.casar(T.PROGRAM, "Erro sintático: esperado 'program'.", conjunto(T.IDENTIFICADOR, T.PONTO_E_VIRGULA, T.BEGIN, T.EOF));
            const identificador = this.casar(T.IDENTIFICADOR, "Erro sintático: identificador esperado.", conjunto(T.PONTO_E_VIRGULA, T.BEGIN, T.EOF));
            this.casar(T.PONTO_E_VIRGULA, "Erro sintático: esperado ';'.", conjunto(T.VAR, T.IDENTIFICADOR, T.PROCEDURE, T.BEGIN, T.EOF));
            const bloco = this.bloco();
            this.casar(T.PONTO_FINAL, "Erro sintático: esperado '.'.", conjunto(T.EOF));

            if (this.tokenAtual().cod !== T.EOF) {
                this.registrarErro("Erro sintático: fim da entrada esperado.", this.tokenAtual(), [T.EOF]);
                this.sincronizar(conjunto(T.EOF));
            }

            return {
                tipoNo: "Programa",
                token: tokenProgram,
                nome: this.criarNoIdentificador(identificador),
                bloco,
            };
        }

        bloco() {
            this.registrarRegra("<bloco> ::= [<parte de declarações de variáveis>] [<parte de declarações de sub-rotinas>] <comando composto>");
            let declaracoesVariaveis = [];
            let declaracoesProcedimentos = [];

            if (this.tokenAtual().cod === T.VAR) {
                this.registrarErro(
                    "Erro sintático: 'var' é permitido apenas em seções de parâmetros formais.",
                    this.tokenAtual(),
                    [T.IDENTIFICADOR, T.PROCEDURE, T.BEGIN],
                    "<parte de declarações de variáveis>"
                );
                this.sincronizar(conjunto(T.PROCEDURE, T.BEGIN, T.EOF));
            } else if (this.tokenAtual().cod === T.IDENTIFICADOR) {
                declaracoesVariaveis = this.parteDeclaracoesVariaveis();
            }

            if (this.tokenAtual().cod === T.PROCEDURE) {
                declaracoesProcedimentos = this.parteDeclaracoesSubrotinas();
            }

            return {
                tipoNo: "Bloco",
                declaracoesVariaveis,
                declaracoesProcedimentos,
                comando: this.comandoComposto(),
            };
        }

        parteDeclaracoesVariaveis() {
            this.registrarRegra("<parte de declarações de variáveis> ::= <declaração de variáveis> { ; <declaração de variáveis> }");
            const declaracoes = [];

            // Em LALG, o tipo é um identificador pre-declarado (ou um nome que
            // será rejeitado posteriormente pela análise semântica).
            while (this.tokenAtual().cod === T.IDENTIFICADOR) {
                this.registrarRegra("<declaração de variáveis> ::= <tipo> <lista de identificadores>");
                const tipo = this.tipoNome(conjunto(T.IDENTIFICADOR, T.PONTO_E_VIRGULA, T.PROCEDURE, T.BEGIN, T.END, T.ELSE, T.PONTO_FINAL));
                const identificadores = this.listaIdentificadores(conjunto(T.PONTO_E_VIRGULA, T.PROCEDURE, T.BEGIN, T.END, T.ELSE, T.PONTO_FINAL));
                const declaracao = {
                    tipoNo: "DeclaracaoVariaveis",
                    tipo,
                    identificadores,
                };
                this.declaracoes.push(declaracao);
                declaracoes.push(declaracao);
                this.casar(T.PONTO_E_VIRGULA, "Erro sintático: esperado ';'.", conjunto(T.IDENTIFICADOR, T.PROCEDURE, T.BEGIN, T.END, T.ELSE, T.PONTO_FINAL, T.EOF));
            }

            return declaracoes;
        }

        tipoNome(tokensSincronizacao) {
            if (!ehNomeTipo(this.tokenAtual())) {
                this.registrarErro("Erro sintático: identificador esperado.", this.tokenAtual(), [T.IDENTIFICADOR], "<tipo>");
                this.sincronizar(conjunto(tokensSincronizacao, T.IDENTIFICADOR));
            }

            if (ehNomeTipo(this.tokenAtual())) {
                return this.criarNoTipo(this.avancar());
            }

            return null;
        }

        listaIdentificadores(tokensSincronizacao) {
            this.registrarRegra("<lista de identificadores> ::= <identificador> {, <identificador>}");
            const identificadores = [];
            const primeiro = this.casar(T.IDENTIFICADOR, "Erro sintático: identificador esperado.", conjunto(tokensSincronizacao, T.VIRGULA));

            if (primeiro) {
                identificadores.push(this.criarNoIdentificador(primeiro));
            }

            while (this.tokenAtual().cod === T.VIRGULA) {
                this.avancar();
                const identificador = this.casar(T.IDENTIFICADOR, "Erro sintático: identificador esperado.", conjunto(tokensSincronizacao, T.VIRGULA));
                if (identificador) {
                    identificadores.push(this.criarNoIdentificador(identificador));
                }
            }

            return identificadores;
        }

        parteDeclaracoesSubrotinas() {
            this.registrarRegra("<parte de declarações de subrotinas> ::= { <declaração de procedimento> ; }");
            const declaracoes = [];

            while (this.tokenAtual().cod === T.PROCEDURE) {
                const declaracao = this.declaracaoProcedimento();
                if (declaracao) declaracoes.push(declaracao);
                this.casar(T.PONTO_E_VIRGULA, "Erro sintático: esperado ';'.", conjunto(T.PROCEDURE, T.BEGIN, T.EOF));
            }

            return declaracoes;
        }

        declaracaoProcedimento() {
            this.registrarRegra("<declaração de procedimento> ::= procedure <identificador> [<parâmetros formais>] ; <bloco>");
            const tokenProcedure = this.casar(T.PROCEDURE, "Erro sintático: esperado 'procedure'.", conjunto(T.IDENTIFICADOR, T.ABRE_PAR, T.PONTO_E_VIRGULA, T.BEGIN, T.EOF));
            const identificador = this.casar(T.IDENTIFICADOR, "Erro sintático: identificador esperado.", conjunto(T.ABRE_PAR, T.PONTO_E_VIRGULA, T.BEGIN, T.EOF));
            let parametros = [];

            if (this.tokenAtual().cod === T.ABRE_PAR) {
                parametros = this.parametrosFormais();
            }

            this.casar(T.PONTO_E_VIRGULA, "Erro sintático: esperado ';'.", conjunto(T.VAR, T.IDENTIFICADOR, T.PROCEDURE, T.BEGIN, T.EOF));
            return {
                tipoNo: "DeclaracaoProcedimento",
                token: tokenProcedure,
                nome: this.criarNoIdentificador(identificador),
                parametros,
                bloco: this.bloco(),
            };
        }

        parametrosFormais() {
            this.registrarRegra("<parâmetros formais> ::= ( <seção de parâmetros formais> { ; <seção de parâmetros formais>} )");
            this.casar(T.ABRE_PAR, "Erro sintático: esperado '('.", conjunto(T.VAR, T.IDENTIFICADOR, T.FECHA_PAR, T.PONTO_E_VIRGULA, T.EOF));
            const secoes = [];

            if (this.tokenAtual().cod === T.FECHA_PAR) {
                this.registrarErro("Erro sintático: identificador esperado.", this.tokenAtual(), [T.IDENTIFICADOR], "<parâmetros formais>");
            } else {
                const secao = this.secaoParametrosFormais();
                if (secao) secoes.push(secao);

                while (this.tokenAtual().cod === T.PONTO_E_VIRGULA) {
                    this.avancar();
                    if (this.tokenAtual().cod === T.FECHA_PAR) {
                        this.registrarErro("Erro sintático: identificador esperado.", this.tokenAtual(), [T.IDENTIFICADOR], "<seção de parâmetros formais>");
                        break;
                    }
                    const proximaSecao = this.secaoParametrosFormais();
                    if (proximaSecao) secoes.push(proximaSecao);
                }
            }

            this.casar(T.FECHA_PAR, "Erro sintático: esperado ')'.", conjunto(T.PONTO_E_VIRGULA, T.BEGIN, T.EOF));
            return secoes;
        }

        secaoParametrosFormais() {
            this.registrarRegra("<seção de parâmetros formais> ::= [var] <lista de identificadores> : <identificador>");
            let porReferencia = false;

            if (this.tokenAtual().cod === T.VAR) {
                this.avancar();
                porReferencia = true;
            }

            const identificadores = this.listaIdentificadores(conjunto(T.DOIS_PONTOS, T.PONTO_E_VIRGULA, T.FECHA_PAR));
            this.casar(T.DOIS_PONTOS, "Erro sintático: esperado ':'.", conjunto(T.IDENTIFICADOR, T.PONTO_E_VIRGULA, T.FECHA_PAR));
            return {
                tipoNo: "SecaoParametrosFormais",
                porReferencia,
                identificadores,
                tipo: this.tipoNome(conjunto(T.PONTO_E_VIRGULA, T.FECHA_PAR, T.EOF)),
            };
        }

        comandoComposto() {
            this.registrarRegra("<comando composto> ::= begin <comando> { ; <comando> } end");
            const tokenBegin = this.casar(T.BEGIN, "Erro sintático: esperado 'begin'.", conjunto(INICIO_COMANDO, T.END, T.ELSE, T.PONTO_FINAL, T.EOF));
            const comandos = [];

            let reconheceuComando = false;
            let separadorConsumido = false;
            let registrouComandoAusente = false;

            while (this.tokenAtual().cod !== T.EOF && this.tokenAtual().cod !== T.END && this.tokenAtual().cod !== T.ELSE && this.tokenAtual().cod !== T.PONTO_FINAL) {
                if (this.tokenAtual().cod === T.PONTO_E_VIRGULA) {
                    const haviaSeparador = separadorConsumido;
                    const separador = this.avancar();
                    if (!ehInicioComando(this.tokenAtual())) {
                        this.registrarErro("Erro sintático: comando esperado.", this.tokenAtual(), Array.from(INICIO_COMANDO), "<comando composto>");
                        registrouComandoAusente = true;
                        if (!FIM_COMANDO.has(this.tokenAtual().cod)) {
                            this.sincronizar(conjunto(INICIO_COMANDO, FIM_COMANDO));
                        }
                    } else if (!reconheceuComando && !haviaSeparador) {
                        this.registrarErro("Erro sintático: comando esperado.", separador, Array.from(INICIO_COMANDO), "<comando composto>");
                        registrouComandoAusente = true;
                    }
                    separadorConsumido = true;
                    continue;
                }

                if (ehInicioComando(this.tokenAtual())) {
                    if (reconheceuComando && !separadorConsumido) {
                        this.registrarErro("Erro sintático: esperado ';'.", this.tokenAtual(), [T.PONTO_E_VIRGULA], "<comando composto>");
                    }

                    const comando = this.comando();
                    if (comando) comandos.push(comando);
                    reconheceuComando = true;
                    separadorConsumido = false;
                    continue;
                }

                this.registrarErro("Erro sintático: comando esperado.", this.tokenAtual(), Array.from(INICIO_COMANDO), "<comando composto>");
                registrouComandoAusente = true;
                this.sincronizar(FIM_COMANDO);
                separadorConsumido = this.tokenAtual().cod === T.PONTO_E_VIRGULA;
            }

            if (!reconheceuComando && !registrouComandoAusente) {
                this.registrarErro("Erro sintático: comando esperado.", this.tokenAtual(), Array.from(INICIO_COMANDO), "<comando composto>");
            }

            const tokenEnd = this.casar(T.END, "Erro sintático: esperado 'end'.", conjunto(T.PONTO_E_VIRGULA, T.ELSE, T.PONTO_FINAL, T.EOF));
            return {
                tipoNo: "ComandoComposto",
                token: tokenBegin,
                comandos,
                tokenFim: tokenEnd,
            };
        }

        comando() {
            this.registrarRegra("<comando>");
            const atual = this.tokenAtual();

            if (atual.cod === T.BEGIN) {
                return this.comandoComposto();
            }

            if (atual.cod === T.IF) {
                return this.comandoCondicional();
            }

            if (atual.cod === T.WHILE) {
                return this.comandoRepetitivo();
            }

            if (ehNomeProcedimento(atual)) {
                if (atual.cod === T.IDENTIFICADOR && (this.proximoToken().cod === T.ATRIBUICAO || this.proximoToken().cod === T.ABRE_COL)) {
                    return this.atribuicao();
                }

                return this.chamadaProcedimento();
            }

            this.registrarErro("Erro sintático: comando esperado.", atual, Array.from(INICIO_COMANDO), "<comando>");
            this.sincronizar(FIM_COMANDO);
            return null;
        }

        atribuicao() {
            this.registrarRegra("<atribuição> ::= <variável> := <expressão>");
            const destino = this.variavel();
            const operador = this.casar(T.ATRIBUICAO, "Erro sintático: esperado ':='.", conjunto(INICIO_EXPRESSAO, FIM_COMANDO));
            return {
                tipoNo: "Atribuicao",
                destino,
                operador,
                expressao: this.expressao(),
            };
        }

        chamadaProcedimento() {
            this.registrarRegra("<chamada de procedimento> ::= <identificador> [ ( <lista de expressões> ) ]");

            if (!ehNomeProcedimento(this.tokenAtual())) {
                this.registrarErro("Erro sintático: identificador esperado.", this.tokenAtual(), [T.IDENTIFICADOR], "<chamada de procedimento>");
                this.sincronizar(FIM_COMANDO);
                return;
            }

            const identificador = this.avancar();
            const argumentos = [];

            if (this.tokenAtual().cod === T.ABRE_PAR) {
                this.avancar();
                argumentos.push(...this.listaExpressoes());
                this.casar(T.FECHA_PAR, "Erro sintático: esperado ')'.", conjunto(FIM_COMANDO));
            }

            return {
                tipoNo: "ChamadaProcedimento",
                nome: this.criarNoIdentificador(identificador),
                argumentos,
            };
        }

        comandoCondicional() {
            this.registrarRegra("<comando condicional 1> ::= if <expressão> then <comando> [else <comando>]");
            const tokenIf = this.casar(T.IF, "Erro sintático: esperado 'if'.", conjunto(INICIO_EXPRESSAO, T.THEN, T.EOF));
            const condicao = this.expressao();
            this.casar(T.THEN, "Erro sintático: esperado 'then'.", conjunto(INICIO_COMANDO, T.ELSE, T.END, T.PONTO_E_VIRGULA, T.EOF));
            const comandoEntao = this.comando();
            let comandoSenao = null;

            if (this.tokenAtual().cod === T.PONTO_E_VIRGULA && this.proximoToken().cod === T.ELSE) {
                const separadorIndevido = this.avancar();
                this.registrarErro(
                    "Erro sintático: ';' não é permitido antes de 'else'.",
                    separadorIndevido,
                    [T.ELSE],
                    "<comando condicional 1>"
                );
            }

            if (this.tokenAtual().cod === T.ELSE) {
                this.avancar();
                comandoSenao = this.comando();
            }

            return {
                tipoNo: "ComandoIf",
                token: tokenIf,
                condicao,
                comandoEntao,
                comandoSenao,
            };
        }

        comandoRepetitivo() {
            this.registrarRegra("<comando repetitivo 1> ::= while <expressão> do <comando>");
            const tokenWhile = this.casar(T.WHILE, "Erro sintático: esperado 'while'.", conjunto(INICIO_EXPRESSAO, T.DO, T.EOF));
            const condicao = this.expressao();
            this.casar(T.DO, "Erro sintático: esperado 'do'.", conjunto(INICIO_COMANDO, T.END, T.PONTO_E_VIRGULA, T.EOF));
            return {
                tipoNo: "ComandoWhile",
                token: tokenWhile,
                condicao,
                comando: this.comando(),
            };
        }

        expressao() {
            this.registrarRegra("<expressão> ::= <expressão simples> [<relação> <expressão simples>]");
            let esquerda = this.expressaoSimples();

            if (RELACOES.has(this.tokenAtual().cod)) {
                const operador = this.relacao();
                const direita = this.expressaoSimples();
                esquerda = {
                    tipoNo: "ExpressaoBinaria",
                    operador,
                    esquerda,
                    direita,
                };
            }

            return esquerda;
        }

        relacao() {
            this.registrarRegra("<relação> ::= = | <> | < | <= | >= | >");

            if (RELACOES.has(this.tokenAtual().cod)) {
                return this.avancar();
            }

            this.registrarErro("Erro sintático: relação esperada.", this.tokenAtual(), Array.from(RELACOES), "<relação>");
            return null;
        }

        expressaoSimples() {
            this.registrarRegra("<expressão simples> ::= [+ | -] <termo> {(+ | - | or) <termo>}");
            let operadorUnario = null;

            if (this.tokenAtual().cod === T.MAIS || this.tokenAtual().cod === T.MENOS) {
                operadorUnario = this.avancar();
            }

            if (!INICIO_FATOR.has(this.tokenAtual().cod)) {
                this.registrarErro("Erro sintático: expressão esperada.", this.tokenAtual(), Array.from(INICIO_FATOR), "<expressão>");
                this.sincronizar(conjunto(FIM_EXPRESSAO, OPERADORES_ADITIVOS, RELACOES));
                return null;
            }

            let expressao = this.termo();
            if (operadorUnario) {
                expressao = {
                    tipoNo: "ExpressaoUnaria",
                    operador: operadorUnario,
                    operando: expressao,
                };
            }

            while (OPERADORES_ADITIVOS.has(this.tokenAtual().cod)) {
                const operador = this.avancar();
                expressao = {
                    tipoNo: "ExpressaoBinaria",
                    operador,
                    esquerda: expressao,
                    direita: this.termo(),
                };
            }

            return expressao;
        }

        termo() {
            this.registrarRegra("<termo> ::= <fator> {(* | div | and) <fator> }");
            let expressao = this.fator();

            while (OPERADORES_MULTIPLICATIVOS.has(this.tokenAtual().cod)) {
                const operador = this.avancar();
                expressao = {
                    tipoNo: "ExpressaoBinaria",
                    operador,
                    esquerda: expressao,
                    direita: this.fator(),
                };
            }

            return expressao;
        }

        fator() {
            this.registrarRegra("<fator> ::= <variável> | <número> | ( <expressão> ) | not <fator>");
            const atual = this.tokenAtual();

            if (atual.cod === T.IDENTIFICADOR) {
                return this.variavel();
            }

            if (atual.cod === T.NUMERO) {
                const tokenNumero = this.avancar();
                return {
                    tipoNo: "NumeroLiteral",
                    token: tokenNumero,
                    // O parser preserva todos os dígitos. A faixa numérica é
                    // uma decisão semântica/de execução, não de sintaxe.
                    valor: tokenNumero.lexema,
                };
            }

            if (atual.cod === T.ABRE_PAR) {
                const abrePar = this.avancar();
                const expressao = this.expressao();
                this.casar(T.FECHA_PAR, "Erro sintático: esperado ')'.", conjunto(FIM_EXPRESSAO, OPERADORES_ADITIVOS, OPERADORES_MULTIPLICATIVOS, RELACOES));
                return {
                    tipoNo: "ExpressaoAgrupada",
                    token: abrePar,
                    expressao,
                };
            }

            if (atual.cod === T.NOT) {
                const operador = this.avancar();
                return {
                    tipoNo: "ExpressaoUnaria",
                    operador,
                    operando: this.fator(),
                };
            }

            this.registrarErro("Erro sintático: expressão esperada.", atual, Array.from(INICIO_FATOR), "<fator>");
            this.sincronizar(conjunto(FIM_EXPRESSAO, OPERADORES_ADITIVOS, OPERADORES_MULTIPLICATIVOS, RELACOES));
            return null;
        }

        variavel() {
            this.registrarRegra("<variável> ::= <identificador> | <identificador> [ <expressão> ]");
            const identificador = this.casar(T.IDENTIFICADOR, "Erro sintático: identificador esperado.", conjunto(T.ABRE_COL, T.ATRIBUICAO, FIM_EXPRESSAO));
            let indice = null;
            let tokenAbreCol = null;

            if (this.tokenAtual().cod === T.ABRE_COL) {
                tokenAbreCol = this.avancar();
                indice = this.expressao();
                this.casar(T.FECHA_COL, "Erro sintático: esperado ']'.", conjunto(T.ATRIBUICAO, FIM_EXPRESSAO));
            }

            return {
                tipoNo: "Variavel",
                nome: this.criarNoIdentificador(identificador),
                indice,
                tokenIndice: tokenAbreCol,
            };
        }

        listaExpressoes() {
            this.registrarRegra("<lista de expressões> ::= <expressão> {, <expressão>}");
            const expressoes = [this.expressao()];

            while (this.tokenAtual().cod === T.VIRGULA) {
                this.avancar();
                expressoes.push(this.expressao());
            }

            return expressoes;
        }

        criarNoIdentificador(tokenId) {
            if (!tokenId) return null;
            return {
                token: tokenId.token,
                cod: tokenId.cod,
                lexema: tokenId.lexema,
                posicao: {
                    linha: tokenId.startLine,
                    coluna: tokenId.startCol,
                    linhaFim: tokenId.endLine,
                    colunaFim: tokenId.endCol,
                    indiceInicio: tokenId.startIndex,
                    indiceFim: tokenId.endIndex,
                },
            };
        }

        criarNoTipo(tokenTipo) {
            if (!tokenTipo) return null;
            return {
                token: tokenTipo.token,
                cod: tokenTipo.cod,
                lexema: tokenTipo.lexema,
                nome: tokenTipo.lexema,
                posicao: {
                    linha: tokenTipo.startLine,
                    coluna: tokenTipo.startCol,
                    linhaFim: tokenTipo.endLine,
                    colunaFim: tokenTipo.endCol,
                    indiceInicio: tokenTipo.startIndex,
                    indiceFim: tokenTipo.endIndex,
                },
            };
        }
    }

    function ehInicioComando(token) {
        return INICIO_COMANDO.has(token.cod);
    }

    function parsePrograma(tokensLexicos, eof = null) {
        const parser = new ParserPrograma(tokensLexicos, eof);
        return parser.parse();
    }

    LALG.ParserPrograma = ParserPrograma;
    LALG.parsePrograma = parsePrograma;
})();
