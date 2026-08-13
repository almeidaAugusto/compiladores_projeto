(() => {
    const LALG = window.LALG = window.LALG || {};

    function pareceResultadoSemantico(entrada) {
        return entrada
            && typeof entrada === "object"
            && Object.prototype.hasOwnProperty.call(entrada, "arvore")
            && Object.prototype.hasOwnProperty.call(entrada, "ok");
    }

    function criarResultado({
        ok,
        etapa,
        bloqueada,
        erro = null,
        erros = [],
        resultadoSemantico = null,
        instructions = [],
        codeText = "",
        generator = null,
    }) {
        return {
            ok,
            etapa,
            bloqueada,
            erro,
            erros,
            errors: erros,
            resultadoSemantico,
            instructions,
            codeText,
            toText: () => codeText,
            generator,
        };
    }

    function criarErroGeracao(codigo, mensagem, detalhes = {}) {
        if (typeof LALG.MepaGenerationError === "function") {
            return new LALG.MepaGenerationError(codigo, mensagem, detalhes);
        }
        const erro = new Error(`Erro de geração MEPA [${codigo}]: ${mensagem}`);
        erro.name = "MepaGenerationError";
        erro.codigo = codigo;
        erro.detalhes = detalhes;
        return erro;
    }

    /**
     * Fachada da etapa MEPA. Recebe o fonte LALG ou um resultado previamente
     * retornado por analisarSemantica, para não repetir as análises na UI.
     */
    function gerarMepa(entradaOuResultadoSemantico) {
        let resultadoSemantico;
        try {
            if (pareceResultadoSemantico(entradaOuResultadoSemantico)) {
                resultadoSemantico = entradaOuResultadoSemantico;
            } else {
                if (typeof LALG.analisarSemantica !== "function") {
                    throw criarErroGeracao(
                        "DEPENDENCIA_AUSENTE",
                        "analisarSemantica não foi carregada antes da etapa MEPA."
                    );
                }
                resultadoSemantico = LALG.analisarSemantica(entradaOuResultadoSemantico);
            }
        } catch (erro) {
            const erroNormalizado = erro?.name === "MepaGenerationError"
                ? erro
                : criarErroGeracao("FALHA_NA_ANALISE", erro?.message ?? "não foi possível analisar o programa.", { causa: erro });
            return criarResultado({
                ok: false,
                etapa: "geracao",
                bloqueada: false,
                erro: erroNormalizado,
                erros: [erroNormalizado],
            });
        }

        if (!resultadoSemantico?.ok) {
            const erros = resultadoSemantico?.erros ?? (resultadoSemantico?.erro ? [resultadoSemantico.erro] : []);
            return criarResultado({
                ok: false,
                etapa: resultadoSemantico?.etapa ?? "semantico",
                bloqueada: true,
                erro: resultadoSemantico?.erro ?? erros[0] ?? null,
                erros,
                resultadoSemantico,
            });
        }

        let generator = null;
        try {
            if (typeof LALG.MepaCodeGenerator !== "function") {
                throw criarErroGeracao(
                    "DEPENDENCIA_AUSENTE",
                    "MepaCodeGenerator não foi carregado antes da etapa MEPA."
                );
            }
            generator = new LALG.MepaCodeGenerator();
            const instructions = generator.generate(resultadoSemantico.arvore, resultadoSemantico.tabelaSimbolos);
            const codeText = generator.toText();
            return criarResultado({
                ok: true,
                etapa: "mepa",
                bloqueada: false,
                resultadoSemantico,
                instructions,
                codeText,
                generator,
            });
        } catch (erro) {
            const erroNormalizado = erro?.name === "MepaGenerationError"
                ? erro
                : criarErroGeracao("FALHA_NA_GERACAO", erro?.message ?? "falha desconhecida durante a geração MEPA.", { causa: erro });
            return criarResultado({
                ok: false,
                etapa: "geracao",
                bloqueada: false,
                erro: erroNormalizado,
                erros: [erroNormalizado],
                resultadoSemantico,
                instructions: [],
                codeText: "",
                generator,
            });
        }
    }

    LALG.gerarMepa = gerarMepa;
})();
