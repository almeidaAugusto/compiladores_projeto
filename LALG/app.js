(() => {
    const LALG = window.LALG = window.LALG || {};
    const EXEMPLO_PROGRAMA = `program exemplo;
int x, y;
begin
  x := 1;
  y := x + 2;
  write(y)
end.`;

    function bootstrapApp() {
        if (LALG.__appInicializada) return;

        const dependenciasObrigatorias = [
            "scanner",
            "buildIndiceOcorrenciasLexicas",
            "getTokenCategoria",
            "highlightCode",
            "CODIGO_EXEMPLO",
            "initLexicoUI",
            "initMainTabs",
            "analisarPrograma",
            "criarEntradaSintatica",
            "initSintaticoUI",
            "analisarSemantica",
            "gerarMepa",
            "MepaInterpreter",
            "initSemanticoUI",
        ];

        const faltantes = dependenciasObrigatorias.filter((nome) => typeof LALG[nome] === "undefined");
        if (faltantes.length > 0) {
            throw new Error(`Falha ao inicializar a aplicacao LALG. Dependencias ausentes: ${faltantes.join(", ")}.`);
        }

        LALG.__appInicializada = true;
        LALG.EXEMPLO_PROGRAMA = EXEMPLO_PROGRAMA;

        LALG.initMainTabs();

        LALG.initLexicoUI({
            scanner: LALG.scanner,
            buildIndiceOcorrenciasLexicas: LALG.buildIndiceOcorrenciasLexicas,
            getTokenCategoria: LALG.getTokenCategoria,
            highlightCode: LALG.highlightCode,
            codigoExemplo: LALG.CODIGO_EXEMPLO,
        });

        LALG.initSintaticoUI({
            analisarPrograma: LALG.analisarPrograma,
            getTokenCategoria: LALG.getTokenCategoria,
            highlightCode: LALG.highlightCode,
            exemploPrograma: EXEMPLO_PROGRAMA,
        });

        LALG.initSemanticoUI({
            analisarSemantica: LALG.analisarSemantica,
            gerarMepa: LALG.gerarMepa,
            MepaInterpreter: LALG.MepaInterpreter,
            highlightCode: LALG.highlightCode,
            exemploPrograma: EXEMPLO_PROGRAMA,
        });
    }

    LALG.bootstrapApp = bootstrapApp;
    bootstrapApp();
})();
