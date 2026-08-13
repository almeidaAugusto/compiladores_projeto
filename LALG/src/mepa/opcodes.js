(() => {
    const LALG = window.LALG = window.LALG || {};

    /**
     * Catálogo canônico das instruções suportadas pela MEPA do projeto.
     *
     * `arity` descreve o número exato de argumentos estruturados e `category`
     * permite que consumidores reconheçam famílias (por exemplo, desvios) sem
     * manter listas paralelas de strings.
     */
    const especificacoes = [
        ["INPP", 0, "programa"],
        ["PARA", 0, "programa"],

        ["AMEM", 1, "memoria"],
        ["DMEM", 1, "memoria"],
        ["CRCT", 1, "dados"],
        ["CRVL", 1, "dados"],
        ["ARMZ", 1, "dados"],

        ["SOMA", 0, "aritmetica"],
        ["SUBT", 0, "aritmetica"],
        ["MULT", 0, "aritmetica"],
        ["DIVI", 0, "aritmetica"],
        ["MODI", 0, "aritmetica"],
        ["INVR", 0, "aritmetica"],

        ["CONJ", 0, "logica"],
        ["DISJ", 0, "logica"],
        ["NEGA", 0, "logica"],

        ["CMME", 0, "comparacao"],
        ["CMMA", 0, "comparacao"],
        ["CMIG", 0, "comparacao"],
        ["CMDG", 0, "comparacao"],
        ["CMAG", 0, "comparacao"],
        ["CMEG", 0, "comparacao"],

        ["DSVS", 1, "desvio"],
        ["DSVF", 1, "desvio"],
        ["NADA", 0, "controle"],

        ["LEIT", 0, "entrada_saida"],
        ["LECH", 0, "entrada_saida"],
        ["IMPR", 0, "entrada_saida"],
        ["IMPC", 0, "entrada_saida"],
        ["IMPE", 0, "entrada_saida"],
    ];

    const definicoes = Object.create(null);
    const opcodes = Object.create(null);

    especificacoes.forEach(([name, arity, category]) => {
        const definition = Object.freeze({ name, arity, category });
        definicoes[name] = definition;
        opcodes[name] = name;
    });

    const MEPA_OPCODE_DEFINITIONS = Object.freeze(definicoes);
    const MEPA_OPCODES = Object.freeze(opcodes);

    function normalizeMepaOpcode(opcode) {
        return typeof opcode === "string" ? opcode.trim().toUpperCase() : "";
    }

    function getMepaOpcodeDefinition(opcode) {
        const normalized = normalizeMepaOpcode(opcode);
        return MEPA_OPCODE_DEFINITIONS[normalized] ?? null;
    }

    LALG.MEPA_OPCODE_DEFINITIONS = MEPA_OPCODE_DEFINITIONS;
    LALG.MEPA_OPCODES = MEPA_OPCODES;
    LALG.normalizeMepaOpcode = normalizeMepaOpcode;
    LALG.getMepaOpcodeDefinition = getMepaOpcodeDefinition;
})();
