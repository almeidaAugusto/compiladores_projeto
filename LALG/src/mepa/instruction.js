(() => {
    const LALG = window.LALG = window.LALG || {};
    const { getMepaOpcodeDefinition, normalizeMepaOpcode } = LALG;

    function formatarArgumento(argumento) {
        if (argumento == null) return "";
        return String(argumento);
    }

    function copiarConstrutoFonte(construto) {
        if (!construto || typeof construto !== "object") return null;
        const posicao = construto.position && typeof construto.position === "object"
            ? { ...construto.position }
            : null;
        return {
            ...construto,
            position: posicao,
        };
    }

    /**
     * Representa uma instrução do vetor de código C da MEPA.
     * A forma textual é destinada somente à apresentação/exportação: a VM deve
     * receber diretamente estas instâncias (ou objetos estruturalmente iguais).
     */
    class MepaInstruction {
        constructor({
            label = null,
            opcode,
            args = [],
            position = null,
            index = null,
            sourcePosition = null,
            sourceConstruct = null,
        } = {}) {
            if (typeof opcode !== "string" || opcode.trim() === "") {
                throw new TypeError("Uma instrução MEPA requer um opcode não vazio.");
            }
            if (typeof getMepaOpcodeDefinition !== "function" || typeof normalizeMepaOpcode !== "function") {
                throw new Error("O catálogo de opcodes MEPA não foi carregado antes de MepaInstruction.");
            }
            if (!Array.isArray(args)) {
                throw new TypeError("Os argumentos de uma instrução MEPA devem formar um array.");
            }

            const opcodeNormalizado = normalizeMepaOpcode(opcode);
            const definicao = getMepaOpcodeDefinition(opcodeNormalizado);
            if (!definicao) {
                throw new RangeError(`Opcode MEPA desconhecido: '${opcodeNormalizado}'.`);
            }
            if (args.length !== definicao.arity) {
                throw new RangeError(
                    `${opcodeNormalizado} exige ${definicao.arity} argumento${definicao.arity === 1 ? "" : "s"}.`
                );
            }

            this.label = label == null ? null : String(label);
            this.opcode = opcodeNormalizado;
            this.args = [...args];
            this.position = position ?? null;
            this.index = Number.isInteger(index) ? index : null;
            this.sourcePosition = sourcePosition ?? null;
            // Metadado didático criado pelo gerador a partir da AST. Ele não
            // participa da execução da VM e evita inferir a origem por parsing
            // do texto MEPA depois de pronto.
            this.sourceConstruct = copiarConstrutoFonte(sourceConstruct);
        }

        toText() {
            const instrucao = [this.opcode, ...this.args.map(formatarArgumento)]
                .filter((parte) => parte !== "")
                .join(" ");
            return this.label == null ? instrucao : `${this.label}: ${instrucao}`;
        }
    }

    LALG.MepaInstruction = MepaInstruction;
})();
