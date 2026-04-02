(() => {
    const LALG = window.LALG = window.LALG || {};
    const EXEMPLO_DECLARACOES = `int a, b;
boolean ativo;`;

    function bootstrapApp() {
        if (LALG.__appInicializada) return;

        const dependenciasObrigatorias = [
            "scanner",
            "buildTabelaSimbolos",
            "getTokenCategoria",
            "highlightCode",
            "CODIGO_EXEMPLO",
            "initLexicoUI",
            "initMainTabs",
            "analisarDeclaracoesVariaveis",
            "criarEntradaSintatica",
            "initSintaticoUI",
        ];

        const faltantes = dependenciasObrigatorias.filter((nome) => typeof LALG[nome] === "undefined");
        if (faltantes.length > 0) {
            throw new Error(`Falha ao inicializar a aplicacao LALG. Dependencias ausentes: ${faltantes.join(", ")}.`);
        }

        LALG.__appInicializada = true;
        LALG.EXEMPLO_DECLARACOES = EXEMPLO_DECLARACOES;

        LALG.initMainTabs();

        LALG.initLexicoUI({
            scanner: LALG.scanner,
            buildTabelaSimbolos: LALG.buildTabelaSimbolos,
            getTokenCategoria: LALG.getTokenCategoria,
            highlightCode: LALG.highlightCode,
            codigoExemplo: LALG.CODIGO_EXEMPLO,
        });

        LALG.initSintaticoUI({
            analisarDeclaracoesVariaveis: LALG.analisarDeclaracoesVariaveis,
            getTokenCategoria: LALG.getTokenCategoria,
            highlightCode: LALG.highlightCode,
            exemploDeclaracoes: EXEMPLO_DECLARACOES,
        });
    }

    LALG.bootstrapApp = bootstrapApp;
    bootstrapApp();
})();
