(() => {
    const LALG = window.LALG = window.LALG || {};
    const { parsePrograma, scanner } = LALG;

    function analisarPrograma(entrada) {
        const resultadoLexico = scanner(entrada);
        if (resultadoLexico.erros.length > 0) {
            return {
                ok: false,
                etapa: "lexico",
                erro: resultadoLexico.erros[0],
                erros: resultadoLexico.erros,
                resultadoLexico,
                declaracoes: [],
                regras: [],
                tokensConsumidos: [],
            };
        }

        const arvore = parsePrograma(resultadoLexico.tokens, resultadoLexico.eof);
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

    LALG.analisarPrograma = analisarPrograma;
})();
