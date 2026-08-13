(() => {
    const LALG = window.LALG = window.LALG || {};
    const O = LALG.MEPA_OPCODES;
    const { getMepaOpcodeDefinition, normalizeMepaOpcode } = LALG;
    const TEM_PROPRIEDADE = Object.prototype.hasOwnProperty;

    function possuiPropriedade(objeto, nome) {
        return TEM_PROPRIEDADE.call(objeto, nome);
    }

    function normalizarRotulo(rotulo) {
        if (typeof rotulo === "string") {
            const texto = rotulo.trim();
            return texto || null;
        }
        if (typeof rotulo === "number" && Number.isFinite(rotulo)) {
            return String(rotulo);
        }
        return null;
    }

    function copiarConstrutoFonte(construto) {
        if (!construto || typeof construto !== "object") return null;
        return {
            ...construto,
            position: construto.position && typeof construto.position === "object"
                ? { ...construto.position }
                : null,
        };
    }

    class MepaInterpreter {
        /**
         * A VM recebe apenas instrucoes MEPA estruturadas. O primeiro argumento
         * pode ser o vetor C, ou um objeto com { code, input, maxSteps }.
         */
        constructor(codigoOuOpcoes = [], opcoes = {}) {
            if (!O || typeof getMepaOpcodeDefinition !== "function" || typeof normalizeMepaOpcode !== "function") {
                throw new Error("O catálogo de opcodes MEPA não foi carregado antes do interpretador.");
            }
            const recebeuCodigo = Array.isArray(codigoOuOpcoes);
            const configuracao = recebeuCodigo
                ? (opcoes && typeof opcoes === "object" ? opcoes : {})
                : (codigoOuOpcoes && typeof codigoOuOpcoes === "object" ? codigoOuOpcoes : {});
            const codigo = recebeuCodigo ? codigoOuOpcoes : (configuracao.code ?? []);

            this.code = [];
            this.labels = new Map();
            this.data = [];
            this.pc = 0;
            this.sp = -1;
            this.input = [];
            this.inputProvider = null;
            this.inputPosition = 0;
            this.output = [];
            this.halted = false;
            this.steps = 0;
            this.maxSteps = 100000;
            this.lastInstruction = null;
            this.currentInstruction = null;
            this.error = null;

            this.setMaxSteps(configuracao.maxSteps ?? this.maxSteps);
            this.setInput(configuracao.input ?? []);
            this.load(codigo);
        }

        criarErro(codigo, mensagem, detalhes = {}) {
            const instruction = detalhes.instruction ?? this.currentInstruction ?? this.code?.[this.pc] ?? null;
            const contexto = {
                pc: detalhes.pc ?? this.pc ?? null,
                instruction,
                sp: detalhes.sp ?? this.sp ?? null,
                data: detalhes.data ?? (Array.isArray(this.data) ? this.data.slice() : []),
                opcode: detalhes.opcode ?? instruction?.opcode ?? null,
                sourcePosition: detalhes.sourcePosition ?? instruction?.sourcePosition ?? null,
                sourceConstruct: detalhes.sourceConstruct ?? instruction?.sourceConstruct ?? null,
                ...detalhes,
            };

            if (typeof LALG.MepaRuntimeError === "function") {
                return new LALG.MepaRuntimeError(codigo, mensagem, contexto);
            }

            // Defesa para uso isolado do arquivo; a aplicacao carrega
            // runtime-error.js antes deste modulo.
            const erro = new Error(`Erro de execucao MEPA [${codigo}]: ${mensagem}`);
            erro.name = "MepaRuntimeError";
            erro.codigo = codigo;
            erro.mensagem = mensagem;
            erro.pc = contexto.pc;
            erro.instruction = contexto.instruction;
            erro.sp = contexto.sp;
            erro.data = contexto.data;
            erro.opcode = contexto.opcode;
            erro.sourcePosition = contexto.sourcePosition;
            erro.sourceConstruct = contexto.sourceConstruct;
            erro.detalhes = contexto;
            return erro;
        }

        lancar(codigo, mensagem, detalhes = {}) {
            throw this.criarErro(codigo, mensagem, detalhes);
        }

        setMaxSteps(maxSteps) {
            if (!Number.isSafeInteger(maxSteps) || maxSteps < 0) {
                this.lancar(
                    "LIMITE_INSTRUCOES_INVALIDO",
                    "maxSteps deve ser um inteiro seguro maior ou igual a zero.",
                    { maxSteps }
                );
            }
            this.maxSteps = maxSteps;
            return this;
        }

        setInput(entrada = []) {
            this.inputProvider = null;
            this.inputPosition = 0;

            if (typeof entrada === "function") {
                this.input = [];
                this.inputProvider = entrada;
                return this;
            }

            if (Array.isArray(entrada)) {
                this.input = entrada.slice();
                return this;
            }

            if (typeof entrada === "string") {
                const texto = entrada.trim();
                this.input = texto ? texto.split(/[\s,]+/) : [];
                return this;
            }

            if (entrada == null) {
                this.input = [];
                return this;
            }

            this.input = [entrada];
            return this;
        }

        reset(opcoes = {}) {
            const configuracao = opcoes && typeof opcoes === "object" && !Array.isArray(opcoes)
                ? opcoes
                : { input: opcoes };

            if (possuiPropriedade(configuracao, "input")) this.setInput(configuracao.input);
            if (possuiPropriedade(configuracao, "maxSteps")) this.setMaxSteps(configuracao.maxSteps);

            this.data = [];
            this.pc = 0;
            this.sp = -1;
            this.inputPosition = 0;
            this.output = [];
            this.halted = false;
            this.steps = 0;
            this.lastInstruction = null;
            this.currentInstruction = null;
            this.error = null;
            return this.getState();
        }

        load(codigo, opcoes = {}) {
            const preparado = this.prepararCodigo(codigo);
            this.code = preparado.code;
            this.labels = preparado.labels;

            const configuracao = opcoes && typeof opcoes === "object" ? opcoes : {};
            return this.reset(configuracao);
        }

        prepararCodigo(codigo) {
            if (!Array.isArray(codigo)) {
                this.lancar(
                    "CODIGO_INVALIDO",
                    "O vetor C deve ser um array de instrucoes estruturadas.",
                    { code: codigo }
                );
            }

            const labels = new Map();
            const instrucoes = codigo.map((bruta, indice) => {
                if (!bruta || typeof bruta !== "object" || Array.isArray(bruta)) {
                    this.lancar(
                        "INSTRUCAO_INVALIDA",
                        `A instrucao C[${indice}] deve ser um objeto estruturado.`,
                        { pc: indice, instruction: bruta }
                    );
                }

                if (typeof bruta.opcode !== "string" || !bruta.opcode.trim()) {
                    this.lancar(
                        "INSTRUCAO_INVALIDA",
                        `A instrucao C[${indice}] nao possui um opcode valido.`,
                        { pc: indice, instruction: bruta }
                    );
                }

                if (bruta.args != null && !Array.isArray(bruta.args)) {
                    this.lancar(
                        "INSTRUCAO_INVALIDA",
                        `Os argumentos da instrucao C[${indice}] devem ser um array.`,
                        { pc: indice, instruction: bruta }
                    );
                }

                const label = bruta.label ?? null;
                if (label != null && normalizarRotulo(label) == null) {
                    this.lancar(
                        "ROTULO_INVALIDO",
                        `O rotulo da instrucao C[${indice}] e invalido.`,
                        { pc: indice, instruction: bruta, label }
                    );
                }

                return {
                    index: bruta.index ?? indice,
                    label,
                    opcode: normalizeMepaOpcode(bruta.opcode),
                    args: (bruta.args ?? []).slice(),
                    position: bruta.position ?? null,
                    sourcePosition: bruta.sourcePosition ?? null,
                    sourceConstruct: copiarConstrutoFonte(bruta.sourceConstruct),
                    target: null,
                };
            });

            instrucoes.forEach((instrucao, indice) => {
                if (instrucao.label == null) return;
                const chave = normalizarRotulo(instrucao.label);
                if (labels.has(chave)) {
                    this.lancar(
                        "ROTULO_DUPLICADO",
                        `O rotulo '${instrucao.label}' foi definido mais de uma vez.`,
                        {
                            pc: indice,
                            instruction: instrucao,
                            label: instrucao.label,
                            firstPosition: labels.get(chave),
                        }
                    );
                }
                labels.set(chave, indice);
            });

            instrucoes.forEach((instrucao, indice) => {
                const definicao = getMepaOpcodeDefinition(instrucao.opcode);
                if (definicao?.category !== "desvio") return;
                if (instrucao.args.length !== definicao.arity) {
                    this.lancar(
                        "ARIDADE_INVALIDA",
                        `${instrucao.opcode} exige exatamente ${definicao.arity} destino de salto.`,
                        { pc: indice, instruction: instrucao }
                    );
                }
                instrucao.target = this.resolverDestinoSalto(instrucao.args[0], labels, instrucoes.length, indice, instrucao);
            });

            return { code: instrucoes, labels };
        }

        resolverDestinoSalto(destino, labels, tamanhoCodigo, pc, instrucao) {
            const chave = normalizarRotulo(destino);
            if (chave != null && labels.has(chave)) return labels.get(chave);

            if (Number.isInteger(destino) && destino >= 0 && destino < tamanhoCodigo) {
                return destino;
            }

            this.lancar(
                "DESTINO_SALTO_INEXISTENTE",
                `O destino de salto '${String(destino)}' nao existe em C.`,
                { pc, instruction: instrucao, target: destino }
            );
        }

        validarEstado() {
            const colecoes = [
                ["code", this.code],
                ["data", this.data],
                ["input", this.input],
                ["output", this.output],
            ];
            const colecaoInvalida = colecoes.find(([, valor]) => !Array.isArray(valor));
            if (colecaoInvalida) {
                this.lancar(
                    "ESTADO_INVALIDO",
                    `O estado interno '${colecaoInvalida[0]}' deve ser um array.`,
                    { field: colecaoInvalida[0], value: colecaoInvalida[1] }
                );
            }

            const inteirosNaoNegativos = [
                ["pc", this.pc],
                ["steps", this.steps],
                ["inputPosition", this.inputPosition],
                ["maxSteps", this.maxSteps],
            ];
            const inteiroInvalido = inteirosNaoNegativos.find(([, valor]) => !Number.isSafeInteger(valor) || valor < 0);
            if (inteiroInvalido) {
                this.lancar(
                    "ESTADO_INVALIDO",
                    `O estado interno '${inteiroInvalido[0]}' deve ser um inteiro não negativo.`,
                    { field: inteiroInvalido[0], value: inteiroInvalido[1] }
                );
            }

            if (!Number.isSafeInteger(this.sp) || this.sp < -1) {
                this.lancar(
                    "ESTADO_INVALIDO",
                    "O topo da pilha s deve ser um inteiro maior ou igual a -1.",
                    { field: "sp", value: this.sp }
                );
            }
            if (typeof this.halted !== "boolean") {
                this.lancar(
                    "ESTADO_INVALIDO",
                    "O indicador halted deve ser booleano.",
                    { field: "halted", value: this.halted }
                );
            }
            if (!(this.labels instanceof Map)) {
                this.lancar(
                    "ESTADO_INVALIDO",
                    "A tabela de rótulos da VM deve ser um Map.",
                    { field: "labels", value: this.labels }
                );
            }
            if (this.inputProvider != null && typeof this.inputProvider !== "function") {
                this.lancar(
                    "ESTADO_INVALIDO",
                    "O provedor de entrada deve ser uma função ou null.",
                    { field: "inputProvider", value: this.inputProvider }
                );
            }
            if (!this.inputProvider && this.inputPosition > this.input.length) {
                this.lancar(
                    "ESTADO_INVALIDO",
                    "O cursor de entrada ultrapassou o buffer disponível.",
                    { field: "inputPosition", value: this.inputPosition }
                );
            }
            return true;
        }

        getState() {
            this.validarEstado();
            const serializarInstrucao = (instrucao) => {
                if (!instrucao || typeof instrucao !== "object") return null;
                return {
                    index: instrucao.index,
                    label: instrucao.label,
                    opcode: instrucao.opcode,
                    args: Array.isArray(instrucao.args) ? instrucao.args.slice() : [],
                    position: instrucao.position,
                    sourcePosition: instrucao.sourcePosition,
                    sourceConstruct: copiarConstrutoFonte(instrucao.sourceConstruct),
                    target: instrucao.target,
                };
            };
            const proximaInstrucao = this.halted ? null : this.code[this.pc] ?? null;
            return {
                code: this.code.map(serializarInstrucao),
                data: this.data.slice(),
                pc: this.pc,
                sp: this.sp,
                input: this.input.slice(),
                inputPosition: this.inputPosition,
                output: this.output.slice(),
                outputText: this.output.map((valor) => String(valor)).join(""),
                halted: this.halted,
                steps: this.steps,
                maxSteps: this.maxSteps,
                // `currentInstruction` representa C[i] pronta para ser
                // executada; após PARA não há próxima instrução. A última
                // continua exposta para explicar a transição final ou erro.
                currentInstruction: serializarInstrucao(proximaInstrucao),
                nextInstruction: serializarInstrucao(proximaInstrucao),
                lastInstruction: serializarInstrucao(this.lastInstruction),
                error: this.error ?? null,
            };
        }

        validarPc() {
            if (!Number.isInteger(this.pc) || this.pc < 0 || this.pc >= this.code.length) {
                this.lancar(
                    "PC_FORA_DO_CODIGO",
                    `O contador de programa aponta para C[${this.pc}], fora do vetor C.`,
                    { instruction: null }
                );
            }
        }

        validarAridade(instrucao, esperada) {
            if (instrucao.args.length !== esperada) {
                this.lancar(
                    "ARIDADE_INVALIDA",
                    `${instrucao.opcode} exige ${esperada} argumento${esperada === 1 ? "" : "s"}.`,
                    { instruction: instrucao, expected: esperada, actual: instrucao.args.length }
                );
            }
        }

        garantirPilha(quantidade, instrucao) {
            if (this.sp < quantidade - 1) {
                this.lancar(
                    "STACK_UNDERFLOW",
                    `${instrucao.opcode} exige ${quantidade} valor${quantidade === 1 ? "" : "es"} na pilha D.`,
                    { instruction: instrucao, required: quantidade }
                );
            }
        }

        obterInteiroNaoNegativo(argumento, nome, instrucao) {
            if (!Number.isInteger(argumento) || argumento < 0) {
                this.lancar(
                    "ARGUMENTO_INVALIDO",
                    `${nome} deve receber um inteiro nao negativo.`,
                    { instruction: instrucao, argument: argumento }
                );
            }
            if (!Number.isSafeInteger(argumento)) {
                this.lancar(
                    "INTEIRO_FORA_DA_FAIXA",
                    `${nome} recebeu um inteiro fora da faixa segura.`,
                    { instruction: instrucao, argument: argumento }
                );
            }
            return argumento;
        }

        obterEndereco(argumento, instrucao) {
            const endereco = this.obterInteiroNaoNegativo(argumento, instrucao.opcode, instrucao);
            if (endereco > this.sp) {
                this.lancar(
                    "ENDERECO_INVALIDO",
                    `O endereco D[${endereco}] nao esta alocado no topo atual s=${this.sp}.`,
                    { instruction: instrucao, address: endereco }
                );
            }
            return endereco;
        }

        empilhar(valor) {
            if (!Number.isSafeInteger(this.sp + 1)) {
                this.lancar(
                    "INTEIRO_FORA_DA_FAIXA",
                    "O topo da pilha excedeu a faixa inteira segura.",
                    { nextSp: this.sp + 1 }
                );
            }
            this.sp += 1;
            this.data[this.sp] = valor;
        }

        desempilhar(instrucao) {
            this.garantirPilha(1, instrucao);
            const valor = this.data[this.sp];
            this.sp -= 1;
            this.data.length = this.sp + 1;
            return valor;
        }

        executarBinaria(instrucao, operacao) {
            this.garantirPilha(2, instrucao);
            const direita = this.data[this.sp];
            const esquerda = this.data[this.sp - 1];
            this.data[this.sp - 1] = operacao(esquerda, direita);
            this.sp -= 1;
            this.data.length = this.sp + 1;
        }

        validarInteiroSeguro(valor, instrucao, papel = "valor") {
            if (typeof valor !== "number" || !Number.isInteger(valor)) {
                this.lancar(
                    "VALOR_INTEIRO_INVALIDO",
                    `${instrucao.opcode} exige ${papel} inteiro.`,
                    { instruction: instrucao, value: valor, role: papel }
                );
            }
            if (!Number.isSafeInteger(valor)) {
                this.lancar(
                    "INTEIRO_FORA_DA_FAIXA",
                    `${instrucao.opcode} recebeu ${papel} fora da faixa inteira segura.`,
                    { instruction: instrucao, value: valor, role: papel }
                );
            }
            return valor;
        }

        executarAritmeticaInteira(instrucao, operacao) {
            this.executarBinaria(instrucao, (esquerda, direita) => {
                this.validarInteiroSeguro(esquerda, instrucao, "operando esquerdo");
                this.validarInteiroSeguro(direita, instrucao, "operando direito");
                const resultado = operacao(esquerda, direita);
                if (!Number.isSafeInteger(resultado)) {
                    this.lancar(
                        "INTEIRO_FORA_DA_FAIXA",
                        `${instrucao.opcode} produziu resultado fora da faixa inteira segura.`,
                        { instruction: instrucao, left: esquerda, right: direita, result: resultado }
                    );
                }
                return resultado;
            });
        }

        lerEntrada() {
            if (this.inputProvider) {
                try {
                    const valor = this.inputProvider({
                        index: this.inputPosition,
                        interpreter: this,
                    });
                    this.inputPosition += 1;
                    if (valor === undefined) {
                        this.lancar("ENTRADA_INSUFICIENTE", "Nao ha mais valores disponiveis para leitura.");
                    }
                    return valor;
                } catch (erro) {
                    if (erro?.name === "MepaRuntimeError") throw erro;
                    this.lancar(
                        "FALHA_ENTRADA",
                        "O provedor de entrada falhou durante a leitura.",
                        { cause: erro }
                    );
                }
            }

            if (this.inputPosition >= this.input.length) {
                this.lancar("ENTRADA_INSUFICIENTE", "Nao ha mais valores disponiveis para leitura.");
            }

            const valor = this.input[this.inputPosition];
            this.inputPosition += 1;
            return valor;
        }

        lerInteiro() {
            const valor = this.lerEntrada();
            if (typeof valor === "number" && Number.isInteger(valor)) {
                if (Number.isSafeInteger(valor)) return valor;
                this.lancar(
                    "INTEIRO_FORA_DA_FAIXA",
                    `LEIT recebeu o inteiro '${String(valor)}' fora da faixa segura.`,
                    { input: valor }
                );
            }
            if (typeof valor === "string" && /^[+-]?\d+$/.test(valor.trim())) {
                const numero = Number(valor.trim());
                if (Number.isSafeInteger(numero)) return numero;
                this.lancar(
                    "INTEIRO_FORA_DA_FAIXA",
                    `LEIT recebeu o inteiro '${valor}' fora da faixa segura.`,
                    { input: valor }
                );
            }
            this.lancar(
                "ENTRADA_INVALIDA",
                `LEIT esperava um inteiro, mas recebeu '${String(valor)}'.`,
                { input: valor }
            );
        }

        executarInstrucao(instrucao) {
            const definicao = getMepaOpcodeDefinition(instrucao.opcode);
            if (!definicao) {
                this.lancar(
                    "OPCODE_DESCONHECIDO",
                    `Opcode MEPA desconhecido: '${instrucao.opcode}'.`,
                    { instruction: instrucao }
                );
            }
            this.validarAridade(instrucao, definicao.arity);

            switch (instrucao.opcode) {
            case O.INPP:
                this.sp = -1;
                this.data = [];
                return {};
            case O.AMEM: {
                const quantidade = this.obterInteiroNaoNegativo(instrucao.args[0], "AMEM", instrucao);
                const novoTopo = this.sp + quantidade;
                if (!Number.isSafeInteger(novoTopo)) {
                    this.lancar(
                        "INTEIRO_FORA_DA_FAIXA",
                        "AMEM faria o topo da pilha exceder a faixa inteira segura.",
                        { instruction: instrucao, amount: quantidade, nextSp: novoTopo }
                    );
                }
                const inicio = this.sp + 1;
                this.sp = novoTopo;
                for (let indice = inicio; indice <= this.sp; indice += 1) {
                    this.data[indice] = undefined;
                }
                return {};
            }
            case O.DMEM: {
                const quantidade = this.obterInteiroNaoNegativo(instrucao.args[0], "DMEM", instrucao);
                if (this.sp - quantidade < -1) {
                    this.lancar(
                        "STACK_UNDERFLOW",
                        `DMEM ${quantidade} tentaria reduzir s abaixo de -1.`,
                        { instruction: instrucao, amount: quantidade }
                    );
                }
                this.sp -= quantidade;
                this.data.length = this.sp + 1;
                return {};
            }
            case O.PARA:
                return { halt: true };
            case O.CRCT: {
                const constante = instrucao.args[0];
                if (typeof constante !== "number" || !Number.isInteger(constante)) {
                    this.lancar(
                        "ARGUMENTO_INVALIDO",
                        "CRCT deve receber uma constante inteira.",
                        { instruction: instrucao, argument: constante }
                    );
                }
                if (!Number.isSafeInteger(constante)) {
                    this.lancar(
                        "INTEIRO_FORA_DA_FAIXA",
                        "CRCT recebeu uma constante fora da faixa inteira segura.",
                        { instruction: instrucao, argument: constante }
                    );
                }
                this.empilhar(constante);
                return {};
            }
            case O.CRVL:
                this.empilhar(this.data[this.obterEndereco(instrucao.args[0], instrucao)]);
                return {};
            case O.ARMZ: {
                this.garantirPilha(1, instrucao);
                const endereco = this.obterEndereco(instrucao.args[0], instrucao);
                this.data[endereco] = this.desempilhar(instrucao);
                return {};
            }
            case O.SOMA:
                this.executarAritmeticaInteira(instrucao, (a, b) => a + b);
                return {};
            case O.SUBT:
                this.executarAritmeticaInteira(instrucao, (a, b) => a - b);
                return {};
            case O.MULT:
                this.executarAritmeticaInteira(instrucao, (a, b) => a * b);
                return {};
            case O.DIVI:
                this.executarAritmeticaInteira(instrucao, (a, b) => {
                    if (b === 0) {
                        this.lancar("DIVISAO_POR_ZERO", "DIVI nao aceita divisor igual a zero.", { instruction: instrucao });
                    }
                    return Math.trunc(a / b);
                });
                return {};
            case O.MODI:
                this.executarAritmeticaInteira(instrucao, (a, b) => {
                    if (b === 0) {
                        this.lancar("DIVISAO_POR_ZERO", "MODI nao aceita divisor igual a zero.", { instruction: instrucao });
                    }
                    return a % b;
                });
                return {};
            case O.INVR:
                this.garantirPilha(1, instrucao);
                this.data[this.sp] = -this.validarInteiroSeguro(this.data[this.sp], instrucao, "operando");
                return {};
            case O.CONJ:
                this.executarBinaria(instrucao, (a, b) => (a === 1 && b === 1 ? 1 : 0));
                return {};
            case O.DISJ:
                this.executarBinaria(instrucao, (a, b) => (a === 1 || b === 1 ? 1 : 0));
                return {};
            case O.NEGA:
                this.garantirPilha(1, instrucao);
                this.data[this.sp] = 1 - this.data[this.sp];
                return {};
            case O.CMME:
                this.executarBinaria(instrucao, (a, b) => (a < b ? 1 : 0));
                return {};
            case O.CMMA:
                this.executarBinaria(instrucao, (a, b) => (a > b ? 1 : 0));
                return {};
            case O.CMIG:
                this.executarBinaria(instrucao, (a, b) => (a === b ? 1 : 0));
                return {};
            case O.CMDG:
                this.executarBinaria(instrucao, (a, b) => (a !== b ? 1 : 0));
                return {};
            case O.CMAG:
                this.executarBinaria(instrucao, (a, b) => (a >= b ? 1 : 0));
                return {};
            case O.CMEG:
                this.executarBinaria(instrucao, (a, b) => (a <= b ? 1 : 0));
                return {};
            case O.DSVS:
                return { nextPc: instrucao.target };
            case O.DSVF: {
                const condicao = this.desempilhar(instrucao);
                return { nextPc: condicao === 0 ? instrucao.target : this.pc + 1 };
            }
            case O.NADA:
                return {};
            case O.LEIT:
                this.empilhar(this.lerInteiro());
                return {};
            case O.LECH:
                this.empilhar(this.lerEntrada());
                return {};
            case O.IMPR:
                this.output.push(this.desempilhar(instrucao));
                return {};
            case O.IMPC: {
                const valor = this.desempilhar(instrucao);
                this.output.push(typeof valor === "number" ? String.fromCharCode(valor) : String(valor));
                return {};
            }
            case O.IMPE:
                this.output.push("\n");
                return {};
            default:
                this.lancar(
                    "OPCODE_DESCONHECIDO",
                    `Opcode MEPA desconhecido: '${instrucao.opcode}'.`,
                    { instruction: instrucao }
                );
            }
        }

        executarPassoInterno(retornarEstado) {
            this.validarEstado();
            if (this.halted) return retornarEstado ? this.getState() : null;

            try {
                if (this.steps >= this.maxSteps) {
                    this.lancar(
                        "LIMITE_INSTRUCOES_EXCEDIDO",
                        `A execucao excedeu o limite de ${this.maxSteps} instrucoes.`,
                        { maxSteps: this.maxSteps }
                    );
                }

                this.validarPc();
                const instrucao = this.code[this.pc];
                if (!instrucao || typeof instrucao !== "object" || !Array.isArray(instrucao.args)) {
                    this.lancar(
                        "ESTADO_INVALIDO",
                        `A instrução corrente C[${this.pc}] foi corrompida.`,
                        { instruction: instrucao, field: "code" }
                    );
                }
                this.currentInstruction = instrucao;
                const resultado = this.executarInstrucao(instrucao) ?? {};
                this.steps += 1;
                this.lastInstruction = instrucao;

                if (resultado.halt) this.halted = true;
                else this.pc = resultado.nextPc ?? this.pc + 1;

                this.currentInstruction = null;
                return retornarEstado ? this.getState() : null;
            } catch (erro) {
                this.currentInstruction = null;
                this.halted = true;
                this.error = erro;
                throw erro;
            }
        }

        step() {
            return this.executarPassoInterno(true);
        }

        run(opcoes = {}) {
            const configuracao = opcoes && typeof opcoes === "object" && !Array.isArray(opcoes)
                ? opcoes
                : { input: opcoes };

            if (possuiPropriedade(configuracao, "input")) this.setInput(configuracao.input);
            if (possuiPropriedade(configuracao, "maxSteps")) this.setMaxSteps(configuracao.maxSteps);

            // Cada chamada de run inicia uma execucao limpa em C[0], como
            // definido para a VM. O modo passo a passo pode continuar o
            // estado atual com `run({ reset: false })`.
            const deveReiniciar = configuracao.reset !== false;
            if (deveReiniciar) this.reset();

            // `step()` continua retornando um snapshot completo para inspeção.
            // A execução contínua evita esse custo por instrução e materializa
            // o estado somente ao final.
            while (!this.halted) this.executarPassoInterno(false);
            return this.getState();
        }
    }

    LALG.MepaInterpreter = MepaInterpreter;
})();
