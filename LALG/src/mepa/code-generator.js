(() => {
    const LALG = window.LALG = window.LALG || {};
    const O = LALG.MEPA_OPCODES;

    function normalizarOperador(operador) {
        return String(operador?.lexema ?? operador ?? "").toLowerCase();
    }

    function obterPosicao(origem) {
        let posicao = origem;
        if (origem?.posicao && typeof origem.posicao === "object") {
            posicao = origem.posicao;
        } else if (origem?.startLine == null && origem?.linha == null) {
            if (origem?.token && typeof origem.token === "object") posicao = origem.token;
            else if (origem?.operador && typeof origem.operador === "object") posicao = origem.operador;
            else if (origem?.nome && typeof origem.nome === "object") posicao = origem.nome;
            else if (origem?.destino && typeof origem.destino === "object") posicao = origem.destino;
        }
        if (posicao?.posicao && typeof posicao.posicao === "object") {
            posicao = posicao.posicao;
        }
        if (!posicao || typeof posicao !== "object") return null;

        const linha = posicao.linha ?? posicao.startLine ?? null;
        const coluna = posicao.coluna ?? posicao.startCol ?? null;
        const indiceInicio = posicao.indiceInicio ?? posicao.startIndex ?? null;
        const linhaFim = posicao.linhaFim ?? posicao.endLine ?? linha;
        const colunaFim = posicao.colunaFim ?? posicao.endCol ?? coluna;
        const indiceFim = posicao.indiceFim ?? posicao.endIndex ?? indiceInicio;

        if (linha == null && coluna == null && indiceInicio == null) return null;
        return { linha, coluna, linhaFim, colunaFim, indiceInicio, indiceFim };
    }

    class MepaCodeGenerator {
        constructor(options = {}) {
            this.options = { ...options };
            this.reset();
        }

        reset() {
            this.instructions = [];
            this.proximoRotulo = 0;
            this.proximoConstrutoFonte = 0;
            this.construtoFonteAtual = null;
            this.simbolosPorId = new Map();
            this.arvore = null;
            this.variaveisGlobais = [];
            return this;
        }

        newLabel(prefixo = "L") {
            const rotulo = `${prefixo}${this.proximoRotulo}`;
            this.proximoRotulo += 1;
            return rotulo;
        }

        emitirConstrutoFonte(kind, label, origem = null) {
            return {
                id: `fonte-${this.proximoConstrutoFonte++}`,
                kind,
                label,
                position: obterPosicao(origem),
            };
        }

        criarConstrutoFonte(origem) {
            if (!origem || typeof origem !== "object") return null;
            if (typeof origem.kind === "string" && typeof origem.label === "string") {
                return this.emitirConstrutoFonte(origem.kind, origem.label, origem.position ?? origem);
            }

            const tipoNo = origem.tipoNo ?? "OrigemLALG";
            const nome = origem.nome?.lexema ?? origem.lexema ?? "";
            const operador = normalizarOperador(origem.operador);
            const descricoes = {
                Programa: "Programa LALG",
                Bloco: "Bloco do programa",
                DeclaracaoVariaveis: "Declaração de variáveis",
                ComandoComposto: "Comando composto",
                Atribuicao: "Atribuição",
                ChamadaProcedimento: nome ? `Chamada de ${nome}` : "Chamada de procedimento",
                ComandoIf: "Comando if",
                ComandoWhile: "Comando while",
                ExpressaoBinaria: operador ? `Expressão (${operador})` : "Expressão binária",
                ExpressaoUnaria: operador ? `Expressão unária (${operador})` : "Expressão unária",
                ExpressaoAgrupada: "Expressão agrupada",
                NumeroLiteral: "Literal numérico",
                BooleanoLiteral: "Literal booleano",
                Variavel: nome ? `Variável ${nome}` : "Variável",
            };
            return this.emitirConstrutoFonte(tipoNo, descricoes[tipoNo] ?? "Construto LALG", origem);
        }

        comConstrutoFonte(origem, callback) {
            const anterior = this.construtoFonteAtual;
            this.construtoFonteAtual = this.criarConstrutoFonte(origem) ?? anterior;
            try {
                return callback();
            } finally {
                this.construtoFonteAtual = anterior;
            }
        }

        emit(opcode, args = [], position = null, sourceConstruct = undefined) {
            return this.emitInterno(null, opcode, args, position, sourceConstruct);
        }

        emitLabel(label, opcode = O.NADA, args = [], position = null, sourceConstruct = undefined) {
            if (typeof opcode !== "string") {
                position = opcode;
                opcode = O.NADA;
                args = [];
            } else if (!Array.isArray(args)) {
                position = args;
                args = [];
            }
            return this.emitInterno(label, opcode, args, position, sourceConstruct);
        }

        emitInterno(label, opcode, args, position, sourceConstruct = undefined) {
            const ClasseInstrucao = LALG.MepaInstruction;
            if (typeof ClasseInstrucao !== "function") {
                this.falhar(
                    "DEPENDENCIA_AUSENTE",
                    "MepaInstruction não foi carregada antes do gerador."
                );
            }

            const argumentos = Array.isArray(args) ? args : [args];
            const instrucao = new ClasseInstrucao({
                index: this.instructions.length,
                position: this.instructions.length,
                label,
                opcode,
                args: argumentos,
                sourcePosition: position ?? null,
                sourceConstruct: sourceConstruct === undefined
                    ? this.construtoFonteAtual
                    : sourceConstruct,
            });
            this.instructions.push(instrucao);
            return instrucao;
        }

        getInstructions() {
            return [...this.instructions];
        }

        toText() {
            return this.instructions.map((instrucao) => instrucao.toText()).join("\n");
        }

        /**
         * Gera o vetor C a partir da AST já validada semanticamente. Também
         * aceita, por conveniência, o resultado completo de analisarSemantica.
         */
        generate(arvoreOuResultado, tabelaSimbolos) {
            this.reset();

            if (!O || typeof LALG.getMepaOpcodeDefinition !== "function") {
                this.falhar(
                    "DEPENDENCIA_AUSENTE",
                    "o catálogo de opcodes MEPA não foi carregado antes do gerador."
                );
            }

            const entrada = this.normalizarEntrada(arvoreOuResultado, tabelaSimbolos);
            this.arvore = entrada.arvore;
            this.configurarTabelaSimbolos(entrada.tabelaSimbolos);
            this.validarProgramaSuportado(this.arvore);
            this.variaveisGlobais = this.obterVariaveisGlobais(this.arvore);

            this.emit(
                O.INPP,
                [],
                obterPosicao(this.arvore?.token),
                this.criarConstrutoFonte({
                    kind: "Prologo",
                    label: "Inicialização do programa",
                    position: obterPosicao(this.arvore?.token),
                })
            );
            this.variaveisGlobais.forEach((simbolo) => {
                this.emit(
                    O.AMEM,
                    [1],
                    obterPosicao(simbolo),
                    this.criarConstrutoFonte({
                        kind: "DeclaracaoVariaveis",
                        label: `Alocação da variável ${simbolo.nome}`,
                        position: obterPosicao(simbolo),
                    })
                );
            });

            this.gerarComando(this.arvore.bloco.comando);

            const origemEpilogo = this.arvore.bloco.comando ?? this.arvore;
            if (this.variaveisGlobais.length > 0) {
                this.emit(
                    O.DMEM,
                    [this.variaveisGlobais.length],
                    obterPosicao(origemEpilogo),
                    this.criarConstrutoFonte({
                        kind: "Epilogo",
                        label: "Liberação das variáveis globais",
                        position: obterPosicao(origemEpilogo),
                    })
                );
            }
            this.emit(
                O.PARA,
                [],
                obterPosicao(origemEpilogo),
                this.criarConstrutoFonte({
                    kind: "Epilogo",
                    label: "Finalização do programa",
                    position: obterPosicao(origemEpilogo),
                })
            );
            return this.getInstructions();
        }

        normalizarEntrada(arvoreOuResultado, tabelaSimbolos) {
            const pareceResultado = arvoreOuResultado
                && typeof arvoreOuResultado === "object"
                && Object.prototype.hasOwnProperty.call(arvoreOuResultado, "arvore");
            const arvore = pareceResultado ? arvoreOuResultado.arvore : arvoreOuResultado;
            const tabela = tabelaSimbolos ?? (pareceResultado ? arvoreOuResultado.tabelaSimbolos : null);

            if (!arvore || arvore.tipoNo !== "Programa" || !arvore.bloco) {
                this.falhar(
                    "AST_INVALIDA",
                    "a geração MEPA requer uma AST de Programa produzida pelo analisador sintático/semântico.",
                    arvore
                );
            }
            return { arvore, tabelaSimbolos: tabela };
        }

        configurarTabelaSimbolos(tabelaSimbolos) {
            let simbolos;
            if (Array.isArray(tabelaSimbolos)) {
                simbolos = tabelaSimbolos;
            } else if (tabelaSimbolos instanceof Map) {
                simbolos = Array.from(tabelaSimbolos.values());
            } else {
                this.falhar(
                    "TABELA_SIMBOLOS_AUSENTE",
                    "a geração MEPA requer a tabela de símbolos resultante da análise semântica."
                );
            }

            simbolos.forEach((simbolo) => {
                if (!simbolo || !Number.isInteger(simbolo.id)) {
                    this.falhar(
                        "SIMBOLO_INVALIDO",
                        "a tabela semântica contém um símbolo sem identificador numérico.",
                        simbolo
                    );
                }
                if (this.simbolosPorId.has(simbolo.id)) {
                    this.falhar(
                        "SIMBOLO_DUPLICADO",
                        `a tabela semântica contém o identificador de símbolo duplicado '${simbolo.id}'.`,
                        simbolo
                    );
                }
                this.simbolosPorId.set(simbolo.id, simbolo);
            });
        }

        validarProgramaSuportado(arvore) {
            // Aula13-26, p. 32, delimita esta etapa da disciplina a programas
            // LALG sem procedimentos. O catálogo MEPA estudado também não
            // define CALL/RET ou quadros de ativação; portanto não inventamos
            // uma ABI fora da especificação.
            const procedimento = this.encontrarPrimeiroProcedimento(arvore.bloco);
            if (procedimento) {
                this.falhar(
                    "PROCEDIMENTOS_NAO_SUPORTADOS",
                    "procedimentos definidos pelo usuário ainda não possuem geração MEPA nesta etapa.",
                    procedimento.nome ?? procedimento
                );
            }
            this.validarComando(arvore.bloco.comando);
        }

        encontrarPrimeiroProcedimento(bloco) {
            return bloco?.declaracoesProcedimentos?.[0] ?? null;
        }

        obterVariaveisGlobais(arvore) {
            const bloco = arvore.bloco;
            const escopoGlobalId = bloco.escopoId ?? arvore.escopoCorpoId ?? 0;
            const variaveis = [];
            const ids = new Set();

            (bloco.declaracoesVariaveis ?? []).forEach((declaracao) => {
                (declaracao.identificadores ?? []).forEach((identificador) => {
                    const simbolo = this.obterSimbolo(identificador, identificador, "declarado");
                    if (simbolo.categoria !== "variavel") {
                        this.falhar(
                            "CATEGORIA_INVALIDA",
                            `o símbolo '${simbolo.nome}' não é uma variável global alocável.`,
                            identificador,
                            { simbolo }
                        );
                    }
                    if (simbolo.escopoId !== escopoGlobalId) {
                        this.falhar(
                            "ESCOPO_NAO_SUPORTADO",
                            `a variável '${simbolo.nome}' não pertence ao escopo global do programa.`,
                            identificador,
                            { simbolo }
                        );
                    }
                    if (ids.has(simbolo.id)) {
                        this.falhar(
                            "DECLARACAO_DUPLICADA",
                            `a variável '${simbolo.nome}' foi encontrada mais de uma vez na AST.`,
                            identificador,
                            { simbolo }
                        );
                    }
                    this.validarEnderecoRelativo(simbolo, identificador);
                    ids.add(simbolo.id);
                    variaveis.push(simbolo);
                });
            });

            variaveis.sort((esquerda, direita) => esquerda.end_rel - direita.end_rel);
            variaveis.forEach((simbolo, indice) => {
                if (simbolo.end_rel !== indice) {
                    this.falhar(
                        "ENDERECO_RELATIVO_INVALIDO",
                        `a variável global '${simbolo.nome}' possui end_rel ${simbolo.end_rel}; era esperado ${indice}.`,
                        simbolo,
                        { simbolo }
                    );
                }
            });
            return variaveis;
        }

        validarComando(comando) {
            if (!comando || typeof comando !== "object") {
                this.falhar("COMANDO_INVALIDO", "foi encontrado um comando ausente na AST.", comando);
            }

            switch (comando.tipoNo) {
            case "ComandoComposto":
                (comando.comandos ?? []).forEach((filho) => this.validarComando(filho));
                return;
            case "Atribuicao":
                this.validarVariavel(comando.destino);
                this.validarExpressao(comando.expressao);
                return;
            case "ChamadaProcedimento":
                this.validarChamadaProcedimento(comando);
                return;
            case "ComandoIf":
                this.validarExpressao(comando.condicao);
                this.validarComando(comando.comandoEntao);
                if (comando.comandoSenao) this.validarComando(comando.comandoSenao);
                return;
            case "ComandoWhile":
                this.validarExpressao(comando.condicao);
                this.validarComando(comando.comando);
                return;
            default:
                this.falhar(
                    "COMANDO_NAO_SUPORTADO",
                    `o comando '${comando.tipoNo ?? "desconhecido"}' não possui tradução MEPA.`,
                    comando
                );
            }
        }

        validarChamadaProcedimento(chamada) {
            const simbolo = this.obterSimbolo(chamada, chamada.nome);
            if (simbolo.categoria !== "procedimento") {
                this.falhar(
                    "CATEGORIA_INVALIDA",
                    `o identificador '${chamada.nome?.lexema ?? simbolo.nome}' não é um procedimento.`,
                    chamada.nome,
                    { simbolo }
                );
            }

            if (simbolo.procedimentoEspecial === "read") {
                (chamada.argumentos ?? []).forEach((argumento) => {
                    if (argumento?.tipoNo !== "Variavel") {
                        this.falhar(
                            "READ_ARGUMENTO_INVALIDO",
                            "read só pode receber variáveis inteiras atribuíveis.",
                            argumento ?? chamada.nome
                        );
                    }
                    this.validarVariavel(argumento);
                });
                return;
            }

            if (simbolo.procedimentoEspecial === "write") {
                (chamada.argumentos ?? []).forEach((argumento) => this.validarExpressao(argumento));
                return;
            }

            this.falhar(
                "PROCEDIMENTO_NAO_SUPORTADO",
                `a chamada ao procedimento '${simbolo.nome}' não possui tradução MEPA nesta etapa.`,
                chamada.nome,
                { simbolo }
            );
        }

        validarExpressao(expressao) {
            if (!expressao || typeof expressao !== "object") {
                this.falhar("EXPRESSAO_INVALIDA", "foi encontrada uma expressão ausente na AST.", expressao);
            }

            switch (expressao.tipoNo) {
            case "NumeroLiteral":
                this.obterValorInteiro(expressao);
                return;
            case "BooleanoLiteral":
                return;
            case "Variavel":
                this.validarReferenciaExpressao(expressao);
                return;
            case "ExpressaoAgrupada":
                this.validarExpressao(expressao.expressao);
                return;
            case "ExpressaoUnaria":
                this.obterOpcodeUnario(expressao.operador, expressao);
                this.validarExpressao(expressao.operando);
                return;
            case "ExpressaoBinaria":
                this.obterOpcodeBinario(expressao.operador, expressao);
                this.validarExpressao(expressao.esquerda);
                this.validarExpressao(expressao.direita);
                return;
            default:
                this.falhar(
                    "EXPRESSAO_NAO_SUPORTADA",
                    `a expressão '${expressao.tipoNo ?? "desconhecida"}' não possui tradução MEPA.`,
                    expressao
                );
            }
        }

        validarVariavel(variavel) {
            if (!variavel || variavel.tipoNo !== "Variavel") {
                this.falhar("VARIAVEL_INVALIDA", "era esperada uma variável da AST.", variavel);
            }
            if (variavel.indice || variavel.tokenIndice) {
                this.falhar(
                    "INDEXACAO_NAO_SUPORTADA",
                    "a geração MEPA para variável indexada não está especificada nesta etapa.",
                    variavel.tokenIndice ?? variavel.nome
                );
            }

            const simbolo = this.obterSimbolo(variavel, variavel.nome);
            if (simbolo.categoria !== "variavel") {
                this.falhar(
                    "CATEGORIA_INVALIDA",
                    `o identificador '${simbolo.nome}' não é uma variável alocável nesta etapa.`,
                    variavel.nome,
                    { simbolo }
                );
            }
            this.validarEnderecoRelativo(simbolo, variavel.nome);
            return simbolo;
        }

        validarReferenciaExpressao(referencia) {
            if (!referencia || referencia.tipoNo !== "Variavel") {
                this.falhar("REFERENCIA_INVALIDA", "era esperada uma referência da AST.", referencia);
            }
            if (referencia.indice || referencia.tokenIndice) {
                return this.validarVariavel(referencia);
            }

            const simbolo = this.obterSimbolo(referencia, referencia.nome);
            if (simbolo.categoria === "constante") {
                this.obterValorConstante(simbolo, referencia);
                return simbolo;
            }
            return this.validarVariavel(referencia);
        }

        validarEnderecoRelativo(simbolo, origem) {
            if (!Number.isInteger(simbolo?.end_rel) || simbolo.end_rel < 0) {
                this.falhar(
                    "ENDERECO_RELATIVO_AUSENTE",
                    `a variável '${simbolo?.nome ?? "desconhecida"}' não possui um end_rel inteiro válido.`,
                    origem,
                    { simbolo }
                );
            }
        }

        obterSimbolo(no, origem = no, modo = "resolvido") {
            const propriedades = modo === "declarado"
                ? ["simboloDeclaradoId", "simboloResolvidoId"]
                : ["simboloResolvidoId", "simboloDeclaradoId"];
            let id = null;
            for (const propriedade of propriedades) {
                if (Number.isInteger(no?.[propriedade])) {
                    id = no[propriedade];
                    break;
                }
                if (Number.isInteger(no?.nome?.[propriedade])) {
                    id = no.nome[propriedade];
                    break;
                }
            }

            if (id == null) {
                const nome = no?.nome?.lexema ?? no?.lexema ?? "desconhecido";
                this.falhar(
                    "SIMBOLO_NAO_RESOLVIDO",
                    `o nó '${nome}' não possui o identificador resolvido pela análise semântica.`,
                    origem
                );
            }

            const simbolo = this.simbolosPorId.get(id);
            if (!simbolo) {
                this.falhar(
                    "SIMBOLO_NAO_ENCONTRADO",
                    `o símbolo resolvido de identificador '${id}' não existe na tabela semântica.`,
                    origem
                );
            }
            return simbolo;
        }

        gerarComando(comando) {
            return this.comConstrutoFonte(comando, () => {
                switch (comando.tipoNo) {
                case "ComandoComposto":
                    (comando.comandos ?? []).forEach((filho) => this.gerarComando(filho));
                    return;
                case "Atribuicao":
                    this.gerarExpressao(comando.expressao);
                    this.emit(O.ARMZ, [this.obterEnderecoVariavel(comando.destino)], obterPosicao(comando.destino));
                    return;
                case "ChamadaProcedimento":
                    this.gerarChamadaProcedimento(comando);
                    return;
                case "ComandoIf":
                    this.gerarIf(comando);
                    return;
                case "ComandoWhile":
                    this.gerarWhile(comando);
                    return;
                default:
                    this.falhar(
                        "COMANDO_NAO_SUPORTADO",
                        `o comando '${comando.tipoNo ?? "desconhecido"}' não possui tradução MEPA.`,
                        comando
                    );
                }
            });
        }

        gerarChamadaProcedimento(chamada) {
            const simbolo = this.obterSimbolo(chamada, chamada.nome);
            if (simbolo.procedimentoEspecial === "read") {
                (chamada.argumentos ?? []).forEach((argumento) => {
                    this.emit(O.LEIT, [], obterPosicao(chamada.nome));
                    this.emit(O.ARMZ, [this.obterEnderecoVariavel(argumento)], obterPosicao(argumento));
                });
                return;
            }
            if (simbolo.procedimentoEspecial === "write") {
                (chamada.argumentos ?? []).forEach((argumento) => {
                    this.gerarExpressao(argumento);
                    this.emit(O.IMPR, [], obterPosicao(argumento));
                });
                return;
            }
            this.falhar(
                "PROCEDIMENTO_NAO_SUPORTADO",
                `a chamada ao procedimento '${simbolo.nome}' não possui tradução MEPA nesta etapa.`,
                chamada.nome,
                { simbolo }
            );
        }

        gerarIf(comando) {
            const rotuloSenao = this.newLabel();
            this.gerarExpressao(comando.condicao);
            this.emit(O.DSVF, [rotuloSenao], obterPosicao(comando.condicao));
            this.gerarComando(comando.comandoEntao);

            if (comando.comandoSenao) {
                const rotuloFim = this.newLabel();
                this.emit(O.DSVS, [rotuloFim], obterPosicao(comando.token));
                this.emitLabel(rotuloSenao, O.NADA, [], obterPosicao(comando.token));
                this.gerarComando(comando.comandoSenao);
                this.emitLabel(rotuloFim, O.NADA, [], obterPosicao(comando.token));
                return;
            }

            this.emitLabel(rotuloSenao, O.NADA, [], obterPosicao(comando.token));
        }

        gerarWhile(comando) {
            const rotuloInicio = this.newLabel();
            const rotuloFim = this.newLabel();
            this.emitLabel(rotuloInicio, O.NADA, [], obterPosicao(comando.token));
            this.gerarExpressao(comando.condicao);
            this.emit(O.DSVF, [rotuloFim], obterPosicao(comando.condicao));
            this.gerarComando(comando.comando);
            this.emit(O.DSVS, [rotuloInicio], obterPosicao(comando.token));
            this.emitLabel(rotuloFim, O.NADA, [], obterPosicao(comando.token));
        }

        gerarExpressao(expressao) {
            switch (expressao.tipoNo) {
            case "NumeroLiteral":
                this.emit(O.CRCT, [this.obterValorInteiro(expressao)], obterPosicao(expressao));
                return;
            case "BooleanoLiteral":
                this.emit(O.CRCT, [this.obterValorBooleano(expressao)], obterPosicao(expressao));
                return;
            case "Variavel": {
                const simbolo = this.validarReferenciaExpressao(expressao);
                if (simbolo.categoria === "constante") {
                    this.emit(O.CRCT, [this.obterValorConstante(simbolo, expressao)], obterPosicao(expressao));
                } else {
                    this.emit(O.CRVL, [simbolo.end_rel], obterPosicao(expressao));
                }
                return;
            }
            case "ExpressaoAgrupada":
                this.gerarExpressao(expressao.expressao);
                return;
            case "ExpressaoUnaria": {
                this.gerarExpressao(expressao.operando);
                const opcode = this.obterOpcodeUnario(expressao.operador, expressao);
                if (opcode) this.emit(opcode, [], obterPosicao(expressao.operador));
                return;
            }
            case "ExpressaoBinaria":
                this.gerarExpressao(expressao.esquerda);
                this.gerarExpressao(expressao.direita);
                this.emit(this.obterOpcodeBinario(expressao.operador, expressao), [], obterPosicao(expressao.operador));
                return;
            default:
                this.falhar(
                    "EXPRESSAO_NAO_SUPORTADA",
                    `a expressão '${expressao.tipoNo ?? "desconhecida"}' não possui tradução MEPA.`,
                    expressao
                );
            }
        }

        obterEnderecoVariavel(variavel) {
            const simbolo = this.validarVariavel(variavel);
            return simbolo.end_rel;
        }

        obterValorInteiro(expressao) {
            // O lexema vem antes do valor materializado para que um Number já
            // arredondado pelo JavaScript nunca apague o texto original do fonte.
            const bruto = expressao?.token?.lexema ?? expressao?.valor;
            const texto = typeof bruto === "string" ? bruto.trim() : null;
            if ((texto != null && !/^[+-]?\d+$/.test(texto))
                || (typeof bruto !== "string" && !Number.isInteger(bruto))) {
                this.falhar(
                    "LITERAL_INVALIDO",
                    "um literal numérico MEPA deve ser um inteiro.",
                    expressao
                );
            }

            const valor = Number(bruto);
            if (!Number.isSafeInteger(valor)) {
                this.falhar(
                    "INTEIRO_FORA_DA_FAIXA",
                    `o literal inteiro '${String(bruto)}' excede a faixa segura suportada pela MEPA (${Number.MIN_SAFE_INTEGER} a ${Number.MAX_SAFE_INTEGER}).`,
                    expressao,
                    { valorOriginal: bruto }
                );
            }
            return valor;
        }

        obterValorBooleano(expressao) {
            if (expressao?.valor === true) return 1;
            if (expressao?.valor === false) return 0;
            const lexema = String(expressao?.token?.lexema ?? "").toLowerCase();
            if (lexema === "true") return 1;
            if (lexema === "false") return 0;
            this.falhar("LITERAL_INVALIDO", "um literal booleano MEPA deve ser true ou false.", expressao);
        }

        obterValorConstante(simbolo, origem) {
            const valor = simbolo?.valor ?? simbolo?.value;
            if (valor === true || valor === 1 || String(valor).toLowerCase() === "true") return 1;
            if (valor === false || valor === 0 || String(valor).toLowerCase() === "false") return 0;

            // Compatibilidade defensiva com tabelas semânticas antigas, nas
            // quais true/false já eram categorizados como constantes, mas o
            // valor ainda não era materializado como atributo do símbolo.
            const nome = String(simbolo?.nome ?? "").toLowerCase();
            if (nome === "true") return 1;
            if (nome === "false") return 0;

            this.falhar(
                "CONSTANTE_INVALIDA",
                `a constante '${simbolo?.nome ?? "desconhecida"}' não possui valor booleano MEPA válido.`,
                origem,
                { simbolo }
            );
        }

        obterOpcodeUnario(operador, origem) {
            const opcodePorOperador = {
                "+": null,
                "-": O.INVR,
                not: O.NEGA,
            };
            const lexema = normalizarOperador(operador);
            if (!Object.prototype.hasOwnProperty.call(opcodePorOperador, lexema)) {
                this.falhar(
                    "OPERADOR_NAO_SUPORTADO",
                    `o operador unário '${operador?.lexema ?? lexema}' não possui tradução MEPA.`,
                    operador ?? origem
                );
            }
            return opcodePorOperador[lexema];
        }

        obterOpcodeBinario(operador, origem) {
            const opcodePorOperador = {
                "+": O.SOMA,
                "-": O.SUBT,
                "*": O.MULT,
                div: O.DIVI,
                and: O.CONJ,
                or: O.DISJ,
                "<": O.CMME,
                ">": O.CMMA,
                "=": O.CMIG,
                "<>": O.CMDG,
                ">=": O.CMAG,
                "<=": O.CMEG,
            };
            const lexema = normalizarOperador(operador);
            if (!Object.prototype.hasOwnProperty.call(opcodePorOperador, lexema)) {
                this.falhar(
                    "OPERADOR_NAO_SUPORTADO",
                    `o operador '${operador?.lexema ?? lexema}' não possui tradução MEPA.`,
                    operador ?? origem
                );
            }
            return opcodePorOperador[lexema];
        }

        falhar(codigo, mensagem, origem = null, detalhes = {}) {
            const DetalheErro = {
                ...detalhes,
                origem,
                position: detalhes.position ?? obterPosicao(origem),
            };
            if (typeof LALG.MepaGenerationError === "function") {
                throw new LALG.MepaGenerationError(codigo, mensagem, DetalheErro);
            }

            const erro = new Error(`Erro de geração MEPA [${codigo}]: ${mensagem}`);
            erro.name = "MepaGenerationError";
            erro.codigo = codigo;
            erro.origem = origem;
            erro.position = DetalheErro.position;
            erro.detalhes = DetalheErro;
            throw erro;
        }
    }

    LALG.MepaCodeGenerator = MepaCodeGenerator;
})();
