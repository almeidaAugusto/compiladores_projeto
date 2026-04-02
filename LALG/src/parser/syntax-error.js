(() => {
    const LALG = window.LALG = window.LALG || {};
    const { nomeTerminal } = LALG;

    class ErroSintatico extends Error {
        constructor(mensagem, detalhe = null) {
            super(mensagem);
            this.name = "ErroSintatico";
            this.detalhe = detalhe;
        }
    }

    function criarErroEsperado(tokenAtual, esperados, contexto) {
        const esperadoStr = esperados.map((cod) => nomeTerminal(cod)).join(" ou ");
        const recebidoStr = tokenAtual?.token ?? nomeTerminal(tokenAtual?.cod);
        const possuiLinhaColuna = tokenAtual?.startLine != null && tokenAtual?.startCol != null;
        const sufixoPosicao = possuiLinhaColuna
            ? ` (linha ${tokenAtual.startLine}, coluna ${tokenAtual.startCol})`
            : "";
        const prefixoContexto = contexto ? ` em ${contexto}` : "";

        const mensagem = `Erro sintatico${prefixoContexto}: esperado ${esperadoStr}, encontrado ${recebidoStr}${sufixoPosicao}.`;
        return new ErroSintatico(mensagem, {
            esperados,
            encontrado: tokenAtual,
            contexto,
        });
    }

    LALG.ErroSintatico = ErroSintatico;
    LALG.criarErroEsperado = criarErroEsperado;
})();
