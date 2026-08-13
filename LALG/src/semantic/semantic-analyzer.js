(() => {
    const LALG = window.LALG = window.LALG || {};
    const {
        scanner,
        parsePrograma,
        SINTATICO_TOKENS,
        TabelaSimbolosSemantica,
        ErroSemantico,
        AvisoSemantico,
    } = LALG;
    const T = SINTATICO_TOKENS;
    const TIPO_INT = "int";
    const TIPO_BOOLEAN = "boolean";
    const TIPO_DESCONHECIDO = "desconhecido";
    const CATEGORIAS_ATRIBUIVEIS = new Set(["variavel", "parametro"]);

    function nomeCategoria(categoria) {
        const nomes = {
            programa: "programa",
            variavel: "variável",
            procedimento: "procedimento",
            parametro: "parâmetro",
            tipo: "tipo",
            constante: "constante",
        };
        return nomes[categoria] ?? categoria ?? "identificador";
    }

    function tipoConhecido(tipo) {
        return tipo != null && tipo !== TIPO_DESCONHECIDO;
    }

    function obterOrigemExpressao(expressao, alternativa = null) {
        return expressao?.nome ?? expressao?.token ?? expressao?.operador ?? alternativa ?? expressao;
    }

    function criarAssinaturaParametros(parametros) {
        return parametros.map((parametro) => ({
            nome: parametro.nome,
            tipo: parametro.tipo,
            modo: parametro.modo,
            linha: parametro.posicao?.linha ?? null,
            coluna: parametro.posicao?.coluna ?? null,
            indiceInicio: parametro.posicao?.indiceInicio ?? null,
            indiceFim: parametro.posicao?.indiceFim ?? null,
        }));
    }

    class AnalisadorSemantico {
        constructor() {
            this.reset();
        }

        reset() {
            this.tabela = new TabelaSimbolosSemantica();
            this.erros = [];
            this.avisos = [];
            return this;
        }

        analisar(arvore) {
            this.reset();
            if (!arvore?.bloco) {
                return this.criarResultado();
            }

            this.declararPrograma(arvore);
            this.analisarBloco(arvore.bloco);
            this.gerarAvisos();
            return this.criarResultado();
        }

        criarResultado() {
            return {
                erros: [...this.erros],
                avisos: [...this.avisos],
                tabelaSimbolos: this.tabela.listarSimbolos(),
                escopos: this.tabela.listarEscopos(),
            };
        }

        anotarTipo(no, tipo) {
            if (no) no.tipoInferido = tipo;
            return tipo;
        }

        anotarUsoSimbolo(no, simbolo) {
            if (!no || !simbolo) return;
            no.simboloResolvidoId = simbolo.id;
            no.categoriaResolvida = simbolo.categoria;
            no.escopoResolvidoId = simbolo.escopoId;
            no.nivelLexicoResolvido = simbolo.nivelLexico;
        }

        anotarDeclaracao(no, simbolo) {
            if (!no || !simbolo) return;
            no.simboloDeclaradoId = simbolo.id;
            no.escopoDeclaracaoId = simbolo.escopoId;
            no.nivelLexicoDeclaracao = simbolo.nivelLexico;
        }

        registrarErro(codigo, mensagem, origem, detalhes = {}) {
            const erro = new ErroSemantico(`Erro semântico: ${mensagem}`, {
                codigo,
                origem,
                escopo: detalhes.escopo ?? this.tabela.escopoAtual?.nome ?? null,
                simbolo: detalhes.simbolo ?? null,
                tipoEsperado: detalhes.tipoEsperado ?? null,
                tipoEncontrado: detalhes.tipoEncontrado ?? null,
            });
            this.erros.push(erro);
            return erro;
        }

        registrarAviso(codigo, mensagem, origem, detalhes = {}) {
            const aviso = new AvisoSemantico(`Aviso semântico: ${mensagem}`, {
                codigo,
                origem,
                escopo: detalhes.escopo ?? this.tabela.escopoAtual?.nome ?? null,
                simbolo: detalhes.simbolo ?? null,
            });
            this.avisos.push(aviso);
            return aviso;
        }

        declararPrograma(arvore) {
            if (!arvore.nome) return;
            const resultado = this.declarar({
                nome: arvore.nome.lexema,
                categoria: "programa",
                posicao: arvore.nome.posicao,
            }, arvore.nome);
            if (resultado.sucesso) {
                this.anotarDeclaracao(arvore.nome, resultado.simbolo);
                this.tabela.associarEscopoCorpo(resultado.simbolo, this.tabela.escopoGlobal);
            }
            arvore.escopoCorpoId = this.tabela.escopoGlobal.id;
            arvore.nivelLexico = this.tabela.escopoGlobal.nivelLexico;
        }

        analisarBloco(bloco) {
            if (!bloco) return;
            bloco.escopoId = this.tabela.escopoAtual?.id ?? null;
            bloco.nivelLexico = this.tabela.escopoAtual?.nivelLexico ?? null;

            (bloco.declaracoesVariaveis ?? []).forEach((declaracao) => {
                this.declararVariaveis(declaracao);
            });

            (bloco.declaracoesProcedimentos ?? []).forEach((declaracao) => {
                this.analisarDeclaracaoProcedimento(declaracao);
            });

            this.analisarComando(bloco.comando);
        }

        declararVariaveis(declaracao) {
            const tipo = this.resolverTipo(declaracao?.tipo);
            (declaracao?.identificadores ?? []).forEach((identificador) => {
                const resultado = this.declarar({
                    nome: identificador.lexema,
                    categoria: "variavel",
                    tipo,
                    posicao: identificador.posicao,
                }, identificador);
                if (resultado.sucesso) this.anotarDeclaracao(identificador, resultado.simbolo);
            });
        }

        analisarDeclaracaoProcedimento(declaracao) {
            if (!declaracao?.nome) return;
            const parametros = this.descreverParametros(declaracao.parametros ?? []);
            const resultadoDeclaracao = this.declarar({
                nome: declaracao.nome.lexema,
                categoria: "procedimento",
                posicao: declaracao.nome.posicao,
                parametros: criarAssinaturaParametros(parametros),
            }, declaracao.nome);

            if (resultadoDeclaracao.sucesso) this.anotarDeclaracao(declaracao.nome, resultadoDeclaracao.simbolo);
            const nomeEscopo = resultadoDeclaracao.sucesso
                ? resultadoDeclaracao.simbolo.nome
                : `${declaracao.nome.lexema} (redeclaração)`;
            const escopoProcedimento = this.tabela.entrarEscopo(nomeEscopo, "procedimento");
            declaracao.escopoCorpoId = escopoProcedimento.id;
            declaracao.nivelLexico = escopoProcedimento.nivelLexico;
            if (resultadoDeclaracao.sucesso) {
                this.tabela.associarEscopoCorpo(resultadoDeclaracao.simbolo, escopoProcedimento);
            }
            parametros.forEach((parametro) => {
                const resultadoParametro = this.declarar({
                    nome: parametro.nome,
                    categoria: "parametro",
                    tipo: parametro.tipo,
                    modoParametro: parametro.modo,
                    posicao: parametro.posicao,
                }, parametro.origem);
                if (resultadoParametro.sucesso) this.anotarDeclaracao(parametro.origem, resultadoParametro.simbolo);
            });
            this.analisarBloco(declaracao.bloco);
            this.tabela.sairEscopo();
        }

        descreverParametros(secoes) {
            const parametros = [];
            secoes.forEach((secao) => {
                const tipo = this.resolverTipo(secao.tipo);
                const modo = secao.porReferencia ? "referencia" : "valor";
                (secao.identificadores ?? []).forEach((identificador) => {
                    parametros.push({
                        nome: identificador.lexema,
                        tipo,
                        modo,
                        posicao: identificador.posicao,
                        origem: identificador,
                    });
                });
            });
            return parametros;
        }

        declarar(dados, origem) {
            const resultado = this.tabela.declarar(dados);
            if (!resultado.sucesso) {
                this.registrarErro(
                    "DECLARACAO_DUPLICADA",
                    `identificador '${dados.nome}' já declarado neste escopo.`,
                    origem,
                    { simbolo: resultado.simbolo }
                );
            }
            return resultado;
        }

        resolverTipo(noTipo) {
            if (!noTipo?.lexema) return this.anotarTipo(noTipo, TIPO_DESCONHECIDO);
            const simbolo = this.tabela.buscar(noTipo.lexema);
            if (!simbolo) {
                this.registrarErro(
                    "TIPO_NAO_DECLARADO",
                    `tipo '${noTipo.lexema}' não declarado.`,
                    noTipo
                );
                return this.anotarTipo(noTipo, TIPO_DESCONHECIDO);
            }
            this.anotarUsoSimbolo(noTipo, simbolo);
            if (simbolo.categoria !== "tipo") {
                this.registrarErro(
                    "CATEGORIA_INVALIDA",
                    `identificador '${noTipo.lexema}' é ${nomeCategoria(simbolo.categoria)} e não pode ser usado como tipo.`,
                    noTipo,
                    { simbolo }
                );
                return this.anotarTipo(noTipo, TIPO_DESCONHECIDO);
            }
            this.tabela.marcarUtilizada(simbolo);
            return this.anotarTipo(noTipo, simbolo.tipo);
        }

        analisarComando(comando) {
            if (!comando) return;

            switch (comando.tipoNo) {
            case "ComandoComposto":
                (comando.comandos ?? []).forEach((filho) => this.analisarComando(filho));
                break;
            case "Atribuicao":
                this.analisarAtribuicao(comando);
                break;
            case "ChamadaProcedimento":
                this.analisarChamadaProcedimento(comando);
                break;
            case "ComandoIf":
                this.analisarCondicao(comando.condicao, "if", comando.token);
                this.analisarComando(comando.comandoEntao);
                this.analisarComando(comando.comandoSenao);
                break;
            case "ComandoWhile":
                this.analisarCondicao(comando.condicao, "while", comando.token);
                this.analisarComando(comando.comando);
                break;
            default:
                break;
            }
        }

        analisarAtribuicao(comando) {
            const destino = this.analisarVariavel(comando.destino, { comoDestino: true });
            const tipoExpressao = this.inferirTipoExpressao(comando.expressao);
            if (!destino.atribuivel || !tipoConhecido(destino.tipo) || !tipoConhecido(tipoExpressao)) return;

            if (destino.tipo !== tipoExpressao) {
                this.registrarErro(
                    "ATRIBUICAO_INCOMPATIVEL",
                    `atribuição incompatível; esperado '${destino.tipo}', encontrado '${tipoExpressao}'.`,
                    comando.operador ?? comando.destino?.nome,
                    { tipoEsperado: destino.tipo, tipoEncontrado: tipoExpressao, simbolo: destino.simbolo }
                );
            }
        }

        analisarCondicao(expressao, nomeComando, origem) {
            const tipo = this.inferirTipoExpressao(expressao);
            if (tipoConhecido(tipo) && tipo !== TIPO_BOOLEAN) {
                this.registrarErro(
                    "CONDICAO_NAO_BOOLEANA",
                    `condição do comando '${nomeComando}' deve ser 'boolean', encontrado '${tipo}'.`,
                    obterOrigemExpressao(expressao, origem),
                    { tipoEsperado: TIPO_BOOLEAN, tipoEncontrado: tipo }
                );
            }
        }

        analisarChamadaProcedimento(chamada) {
            const nome = chamada?.nome?.lexema;
            if (!nome) return;
            chamada.tipoInferido = null;
            const simbolo = this.tabela.buscar(nome);
            const argumentos = chamada.argumentos ?? [];

            if (!simbolo) {
                this.registrarErro(
                    "IDENTIFICADOR_NAO_DECLARADO",
                    `procedimento '${nome}' não declarado.`,
                    chamada.nome
                );
                argumentos.forEach((argumento) => this.inferirTipoExpressao(argumento));
                return;
            }

            this.anotarUsoSimbolo(chamada, simbolo);
            this.anotarUsoSimbolo(chamada.nome, simbolo);

            if (simbolo.categoria !== "procedimento") {
                this.registrarErro(
                    "CATEGORIA_INVALIDA",
                    `identificador '${nome}' é ${nomeCategoria(simbolo.categoria)} e não pode ser chamado como procedimento.`,
                    chamada.nome,
                    { simbolo }
                );
                argumentos.forEach((argumento) => this.inferirTipoExpressao(argumento));
                return;
            }

            this.tabela.marcarUtilizada(simbolo);
            if (simbolo.procedimentoEspecial === "read") {
                this.analisarRead(argumentos, chamada.nome);
                return;
            }
            if (simbolo.procedimentoEspecial === "write") {
                this.analisarWrite(argumentos, chamada.nome);
                return;
            }

            const parametros = simbolo.parametros ?? [];
            if (argumentos.length !== parametros.length) {
                this.registrarErro(
                    "QUANTIDADE_ARGUMENTOS_INCORRETA",
                    `procedimento '${nome}' espera ${parametros.length} argumento${parametros.length === 1 ? "" : "s"}, mas recebeu ${argumentos.length}.`,
                    chamada.nome,
                    { simbolo }
                );
            }

            argumentos.forEach((argumento, indice) => {
                const parametro = parametros[indice];
                if (!parametro) {
                    this.inferirTipoExpressao(argumento);
                    return;
                }
                this.analisarArgumento(argumento, parametro, indice + 1, nome);
            });
        }

        analisarRead(argumentos, origem) {
            if (argumentos.length === 0) {
                this.registrarErro(
                    "QUANTIDADE_ARGUMENTOS_INCORRETA",
                    "procedimento 'read' espera ao menos 1 argumento, mas recebeu 0.",
                    origem
                );
                return;
            }

            argumentos.forEach((argumento, indice) => {
                if (argumento?.tipoNo !== "Variavel") {
                    this.inferirTipoExpressao(argumento);
                    this.registrarErro(
                        "READ_ARGUMENTO_INVALIDO",
                        `argumento ${indice + 1} de 'read' deve ser uma variável inteira atribuível.`,
                        obterOrigemExpressao(argumento, origem),
                        { tipoEsperado: TIPO_INT }
                    );
                    return;
                }

                const variavel = this.analisarVariavel(argumento);
                if (variavel.constante) {
                    this.registrarErro(
                        "READ_ARGUMENTO_INVALIDO",
                        `argumento ${indice + 1} de 'read' não pode ser a constante '${variavel.simbolo.nome}'; deve ser uma variável inteira atribuível.`,
                        argumento.nome,
                        { tipoEsperado: TIPO_INT, tipoEncontrado: variavel.tipo, simbolo: variavel.simbolo }
                    );
                    return;
                }
                if (variavel.atribuivel && tipoConhecido(variavel.tipo) && variavel.tipo !== TIPO_INT) {
                    this.registrarErro(
                        "READ_TIPO_INVALIDO",
                        `argumento ${indice + 1} de 'read' deve ser 'int', encontrado '${variavel.tipo}'.`,
                        argumento.nome,
                        { tipoEsperado: TIPO_INT, tipoEncontrado: variavel.tipo, simbolo: variavel.simbolo }
                    );
                }
            });
        }

        analisarWrite(argumentos, origem) {
            if (argumentos.length === 0) {
                this.registrarErro(
                    "QUANTIDADE_ARGUMENTOS_INCORRETA",
                    "procedimento 'write' espera ao menos 1 argumento, mas recebeu 0.",
                    origem
                );
                return;
            }

            argumentos.forEach((argumento, indice) => {
                const tipo = this.inferirTipoExpressao(argumento);
                if (tipoConhecido(tipo) && tipo !== TIPO_INT) {
                    this.registrarErro(
                        "WRITE_TIPO_INVALIDO",
                        `argumento ${indice + 1} de 'write' deve ser uma expressão 'int', encontrado '${tipo}'.`,
                        obterOrigemExpressao(argumento, origem),
                        { tipoEsperado: TIPO_INT, tipoEncontrado: tipo }
                    );
                }
            });
        }

        analisarArgumento(argumento, parametro, indice, nomeProcedimento) {
            if (parametro.modo === "referencia") {
                if (argumento?.tipoNo !== "Variavel") {
                    const tipo = this.inferirTipoExpressao(argumento);
                    this.registrarErro(
                        "ARGUMENTO_REFERENCIA_INVALIDO",
                        `argumento ${indice} de '${nomeProcedimento}' deve ser uma variável por ser parâmetro 'var'.`,
                        obterOrigemExpressao(argumento),
                        { tipoEsperado: parametro.tipo, tipoEncontrado: tipo }
                    );
                    return;
                }

                const variavel = this.analisarVariavel(argumento);
                if (variavel.constante) {
                    this.registrarErro(
                        "ARGUMENTO_REFERENCIA_INVALIDO",
                        `argumento ${indice} de '${nomeProcedimento}' não pode ser a constante '${variavel.simbolo.nome}' por ser parâmetro 'var'.`,
                        argumento.nome,
                        { tipoEsperado: parametro.tipo, tipoEncontrado: variavel.tipo, simbolo: variavel.simbolo }
                    );
                    return;
                }
                if (!variavel.atribuivel || !tipoConhecido(variavel.tipo) || !tipoConhecido(parametro.tipo)) return;
                if (variavel.tipo !== parametro.tipo) {
                    this.registrarErro(
                        "ARGUMENTO_TIPO_INCOMPATIVEL",
                        `argumento ${indice} de '${nomeProcedimento}' deve ser '${parametro.tipo}', encontrado '${variavel.tipo}'.`,
                        argumento.nome,
                        { tipoEsperado: parametro.tipo, tipoEncontrado: variavel.tipo, simbolo: variavel.simbolo }
                    );
                }
                return;
            }

            const tipo = this.inferirTipoExpressao(argumento);
            if (tipoConhecido(tipo) && tipoConhecido(parametro.tipo) && tipo !== parametro.tipo) {
                this.registrarErro(
                    "ARGUMENTO_TIPO_INCOMPATIVEL",
                    `argumento ${indice} de '${nomeProcedimento}' deve ser '${parametro.tipo}', encontrado '${tipo}'.`,
                    obterOrigemExpressao(argumento),
                    { tipoEsperado: parametro.tipo, tipoEncontrado: tipo }
                );
            }
        }

        analisarVariavel(variavel, opcoes = {}) {
            const nome = variavel?.nome?.lexema;
            const possuiIndice = Boolean(variavel?.tokenIndice || variavel?.indice);
            if (!nome) {
                this.anotarTipo(variavel, TIPO_DESCONHECIDO);
                return { tipo: TIPO_DESCONHECIDO, simbolo: null, atribuivel: false, constante: false };
            }
            const simbolo = this.tabela.buscar(nome);
            if (!simbolo) {
                this.registrarErro(
                    "IDENTIFICADOR_NAO_DECLARADO",
                    `identificador '${nome}' não declarado.`,
                    variavel.nome
                );
                if (possuiIndice) this.registrarIndexacaoNaoSuportada(variavel);
                this.anotarTipo(variavel, TIPO_DESCONHECIDO);
                return { tipo: TIPO_DESCONHECIDO, simbolo: null, atribuivel: false, constante: false };
            }

            this.anotarUsoSimbolo(variavel, simbolo);
            this.anotarUsoSimbolo(variavel.nome, simbolo);

            const ehConstante = simbolo.categoria === "constante";
            if (!CATEGORIAS_ATRIBUIVEIS.has(simbolo.categoria) && !ehConstante) {
                const acao = opcoes.comoDestino ? "receber atribuição" : "ser usado como variável";
                this.registrarErro(
                    "CATEGORIA_INVALIDA",
                    `identificador '${nome}' é ${nomeCategoria(simbolo.categoria)} e não pode ${acao}.`,
                    variavel.nome,
                    { simbolo }
                );
                if (possuiIndice) this.registrarIndexacaoNaoSuportada(variavel, simbolo);
                this.anotarTipo(variavel, TIPO_DESCONHECIDO);
                return { tipo: TIPO_DESCONHECIDO, simbolo, atribuivel: false, constante: false };
            }

            this.tabela.marcarUtilizada(simbolo);
            if (possuiIndice) {
                this.registrarIndexacaoNaoSuportada(variavel, simbolo);
                this.anotarTipo(variavel, TIPO_DESCONHECIDO);
                return { tipo: TIPO_DESCONHECIDO, simbolo, atribuivel: false, constante: ehConstante };
            }
            const tipo = simbolo.tipo ?? TIPO_DESCONHECIDO;
            this.anotarTipo(variavel, tipo);
            if (ehConstante) {
                variavel.valorConstante = simbolo.valor;
                if (opcoes.comoDestino) {
                    this.registrarErro(
                        "CONSTANTE_NAO_ATRIBUIVEL",
                        `constante '${nome}' não pode receber atribuição.`,
                        variavel.nome,
                        { tipoEncontrado: tipo, simbolo }
                    );
                }
                return { tipo, simbolo, atribuivel: false, constante: true, valor: simbolo.valor };
            }
            return { tipo, simbolo, atribuivel: true, constante: false };
        }

        registrarIndexacaoNaoSuportada(variavel, simbolo = null) {
            if (variavel?.indice) this.inferirTipoExpressao(variavel.indice);
            this.registrarErro(
                "INDEXACAO_NAO_SUPORTADA",
                "acesso indexado não é suportado: a especificação LALG não possui declaração de vetores.",
                variavel?.tokenIndice ?? variavel?.nome,
                { simbolo }
            );
            if (variavel) variavel.indexacaoSuportada = false;
        }

        inferirTipoExpressao(expressao) {
            if (!expressao) return TIPO_DESCONHECIDO;

            switch (expressao.tipoNo) {
            case "NumeroLiteral":
                return this.anotarTipo(expressao, TIPO_INT);
            case "BooleanoLiteral": {
                const simbolo = this.tabela.buscar(expressao.token?.lexema);
                this.anotarUsoSimbolo(expressao, simbolo);
                this.tabela.marcarUtilizada(simbolo);
                return this.anotarTipo(expressao, TIPO_BOOLEAN);
            }
            case "Variavel":
                return this.analisarVariavel(expressao).tipo;
            case "ExpressaoAgrupada":
                return this.anotarTipo(expressao, this.inferirTipoExpressao(expressao.expressao));
            case "ExpressaoUnaria":
                return this.inferirTipoUnario(expressao);
            case "ExpressaoBinaria":
                return this.inferirTipoBinario(expressao);
            default:
                return this.anotarTipo(expressao, TIPO_DESCONHECIDO);
            }
        }

        inferirTipoUnario(expressao) {
            const tipoOperando = this.inferirTipoExpressao(expressao.operando);
            const operador = expressao.operador;
            const exigeInt = operador?.cod === T.MAIS || operador?.cod === T.MENOS;
            const tipoEsperado = exigeInt ? TIPO_INT : TIPO_BOOLEAN;
            const tipoResultado = tipoEsperado;
            if (tipoConhecido(tipoOperando) && tipoOperando !== tipoEsperado) {
                this.registrarErro(
                    "OPERADOR_TIPO_INVALIDO",
                    `operador '${operador?.lexema}' exige operando '${tipoEsperado}', encontrado '${tipoOperando}'.`,
                    operador,
                    { tipoEsperado, tipoEncontrado: tipoOperando }
                );
            }
            return this.anotarTipo(expressao, tipoResultado);
        }

        inferirTipoBinario(expressao) {
            const tipoEsquerda = this.inferirTipoExpressao(expressao.esquerda);
            const tipoDireita = this.inferirTipoExpressao(expressao.direita);
            const operador = expressao.operador;
            const codigo = operador?.cod;

            if (codigo === T.MAIS || codigo === T.MENOS || codigo === T.VEZES || codigo === T.DIV) {
                this.validarOperandosIguais(operador, tipoEsquerda, tipoDireita, TIPO_INT);
                return this.anotarTipo(expressao, TIPO_INT);
            }
            if (codigo === T.OR || codigo === T.AND) {
                this.validarOperandosIguais(operador, tipoEsquerda, tipoDireita, TIPO_BOOLEAN);
                return this.anotarTipo(expressao, TIPO_BOOLEAN);
            }
            if (codigo === T.MENOR || codigo === T.MENOR_IGUAL || codigo === T.MAIOR || codigo === T.MAIOR_IGUAL) {
                this.validarOperandosIguais(operador, tipoEsquerda, tipoDireita, TIPO_INT);
                return this.anotarTipo(expressao, TIPO_BOOLEAN);
            }
            if (codigo === T.IGUAL || codigo === T.DIFERENTE) {
                if (tipoConhecido(tipoEsquerda) && tipoConhecido(tipoDireita) && tipoEsquerda !== tipoDireita) {
                    this.registrarErro(
                        "OPERADOR_TIPO_INVALIDO",
                        `operador '${operador?.lexema}' exige operandos de tipos compatíveis, encontrados '${tipoEsquerda}' e '${tipoDireita}'.`,
                        operador,
                        { tipoEsperado: tipoEsquerda, tipoEncontrado: tipoDireita }
                    );
                }
                return this.anotarTipo(expressao, TIPO_BOOLEAN);
            }
            return this.anotarTipo(expressao, TIPO_DESCONHECIDO);
        }

        validarOperandosIguais(operador, tipoEsquerda, tipoDireita, tipoEsperado) {
            const tiposInvalidos = [tipoEsquerda, tipoDireita]
                .filter((tipo) => tipoConhecido(tipo) && tipo !== tipoEsperado);
            if (tiposInvalidos.length === 0) return;
            this.registrarErro(
                "OPERADOR_TIPO_INVALIDO",
                `operador '${operador?.lexema}' exige operandos '${tipoEsperado}', mas encontrou tipo incompatível '${tiposInvalidos.join("' e '")}'.`,
                operador,
                { tipoEsperado, tipoEncontrado: tiposInvalidos.join(" e ") }
            );
        }

        gerarAvisos() {
            this.tabela.listarSimbolos().forEach((simbolo) => {
                if (simbolo.preDeclarado || simbolo.utilizada) return;
                if (simbolo.categoria === "variavel") {
                    this.registrarAviso(
                        "VARIAVEL_NAO_UTILIZADA",
                        `variável '${simbolo.nome}' declarada e nunca utilizada.`,
                        simbolo,
                        { simbolo, escopo: simbolo.escopo }
                    );
                }
                if (simbolo.categoria === "parametro") {
                    this.registrarAviso(
                        "PARAMETRO_NAO_UTILIZADO",
                        `parâmetro '${simbolo.nome}' declarado e nunca utilizado.`,
                        simbolo,
                        { simbolo, escopo: simbolo.escopo }
                    );
                }
                if (simbolo.categoria === "procedimento") {
                    this.registrarAviso(
                        "PROCEDIMENTO_NAO_UTILIZADO",
                        `procedimento '${simbolo.nome}' declarado e nunca chamado.`,
                        simbolo,
                        { simbolo, escopo: simbolo.escopo }
                    );
                }
            });
        }
    }

    function criarResultadoSintatico(resultadoLexico, arvore) {
        const erros = arvore.erros ?? [];
        return {
            ok: erros.length === 0,
            etapa: "sintatico",
            erro: erros[0] ?? null,
            erros,
            resultadoLexico,
            declaracoes: arvore.declaracoes ?? [],
            regras: arvore.regras ?? [],
            tokensConsumidos: arvore.tokensConsumidos ?? [],
            arvore,
        };
    }

    function analisarSemantica(entrada) {
        const resultadoLexico = scanner(String(entrada ?? ""));
        if (resultadoLexico.erros.length > 0) {
            return {
                ok: false,
                etapa: "lexico",
                bloqueada: true,
                erro: resultadoLexico.erros[0],
                erros: resultadoLexico.erros,
                avisos: [],
                tabelaSimbolos: [],
                escopos: [],
                resultadoLexico,
                resultadoSintatico: null,
                arvore: null,
            };
        }

        const arvore = parsePrograma(resultadoLexico.tokens, resultadoLexico.eof);
        const resultadoSintatico = criarResultadoSintatico(resultadoLexico, arvore);
        if (!resultadoSintatico.ok) {
            return {
                ok: false,
                etapa: "sintatico",
                bloqueada: true,
                erro: resultadoSintatico.erro,
                erros: resultadoSintatico.erros,
                avisos: [],
                tabelaSimbolos: [],
                escopos: [],
                resultadoLexico,
                resultadoSintatico,
                arvore,
            };
        }

        const analisador = new AnalisadorSemantico();
        const resultadoSemantico = analisador.analisar(arvore);
        return {
            ok: resultadoSemantico.erros.length === 0,
            etapa: "semantico",
            bloqueada: false,
            erro: resultadoSemantico.erros[0] ?? null,
            erros: resultadoSemantico.erros,
            avisos: resultadoSemantico.avisos,
            tabelaSimbolos: resultadoSemantico.tabelaSimbolos,
            escopos: resultadoSemantico.escopos,
            resultadoLexico,
            resultadoSintatico,
            arvore,
        };
    }

    LALG.AnalisadorSemantico = AnalisadorSemantico;
    LALG.analisarSemantica = analisarSemantica;
})();
