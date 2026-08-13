(() => {
    const LALG = window.LALG = window.LALG || {};

    function normalizarDetalhes(detalhes) {
        return detalhes && typeof detalhes === "object" ? detalhes : {};
    }

    class MepaRuntimeError extends Error {
        /**
         * Erro de execução da VM MEPA. A assinatura é compartilhada pela VM:
         * new MepaRuntimeError(codigo, mensagem, { pc, instruction, ... }).
         */
        constructor(codigo, mensagem, detalhes = {}) {
            const detalhesNormalizados = normalizarDetalhes(detalhes);
            const codigoNormalizado = codigo || "RUNTIME_MEPA";
            const mensagemNormalizada = mensagem || "Falha durante a execução MEPA.";
            super(`Erro de execução MEPA [${codigoNormalizado}]: ${mensagemNormalizada}`);

            this.name = "MepaRuntimeError";
            this.codigo = codigoNormalizado;
            this.fase = "execucao-mepa";
            this.etapa = "mepa-runtime";
            this.mensagem = mensagemNormalizada;
            this.pc = detalhesNormalizados.pc ?? null;
            this.instruction = detalhesNormalizados.instruction ?? null;
            this.sp = detalhesNormalizados.sp ?? null;
            this.data = detalhesNormalizados.data ?? null;
            this.opcode = detalhesNormalizados.opcode ?? this.instruction?.opcode ?? null;
            this.sourcePosition = detalhesNormalizados.sourcePosition
                ?? this.instruction?.sourcePosition
                ?? null;
            this.sourceConstruct = detalhesNormalizados.sourceConstruct
                ?? this.instruction?.sourceConstruct
                ?? null;
            this.detalhes = detalhesNormalizados;
        }
    }

    class MepaGenerationError extends Error {
        /**
         * Aceita tanto (mensagem, detalhes) quanto (codigo, mensagem, detalhes)
         * para que o gerador possa produzir diagnósticos estruturados.
         */
        constructor(codigoOuMensagem, mensagemOuDetalhes = {}, detalhes = {}) {
            const possuiMensagem = typeof mensagemOuDetalhes === "string";
            const codigo = possuiMensagem ? codigoOuMensagem : "GERACAO_MEPA";
            const mensagem = possuiMensagem ? mensagemOuDetalhes : codigoOuMensagem;
            const detalhesNormalizados = normalizarDetalhes(possuiMensagem ? detalhes : mensagemOuDetalhes);
            const codigoNormalizado = codigo || "GERACAO_MEPA";
            const mensagemNormalizada = mensagem || "Falha durante a geração de código MEPA.";
            super(`Erro de geração MEPA [${codigoNormalizado}]: ${mensagemNormalizada}`);

            this.name = "MepaGenerationError";
            this.codigo = codigoNormalizado;
            this.fase = "geracao-mepa";
            this.etapa = "mepa";
            this.mensagem = mensagemNormalizada;
            this.origem = detalhesNormalizados.origem ?? null;
            this.position = detalhesNormalizados.position ?? detalhesNormalizados.posicao ?? null;
            this.detalhes = detalhesNormalizados;
        }
    }

    LALG.MepaRuntimeError = MepaRuntimeError;
    LALG.MepaGenerationError = MepaGenerationError;
})();
