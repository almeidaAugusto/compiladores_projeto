(() => {
    const LALG = window.LALG = window.LALG || {};
    const { parseParteDeclaracoesVariaveis, scanner, ErroSintatico } = LALG;

    function analisarDeclaracoesVariaveis(entrada) {
        const resultadoLexico = scanner(entrada);
        if (resultadoLexico.erros.length > 0) {
            return {
                ok: false,
                etapa: "lexico",
                erro: resultadoLexico.erros[0],
                resultadoLexico,
                declaracoes: [],
            };
        }

        try {
            const arvore = parseParteDeclaracoesVariaveis(resultadoLexico.tokens);
            return {
                ok: true,
                etapa: "sintatico",
                erro: null,
                resultadoLexico,
                declaracoes: arvore.declaracoes,
            };
        } catch (erro) {
            if (erro instanceof ErroSintatico) {
                return {
                    ok: false,
                    etapa: "sintatico",
                    erro,
                    resultadoLexico,
                    declaracoes: [],
                };
            }
            throw erro;
        }
    }

    LALG.analisarDeclaracoesVariaveis = analisarDeclaracoesVariaveis;
})();
