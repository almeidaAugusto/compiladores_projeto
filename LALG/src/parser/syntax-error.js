(() => {
    const LALG = window.LALG = window.LALG || {};

    function incluirPosicaoNaMensagem(mensagem, detalhe) {
        const token = detalhe?.encontrado;
        const possuiLinhaColuna = token?.startLine != null && token?.startCol != null;
        const mensagemTexto = String(mensagem);

        if (!possuiLinhaColuna || /\(linha \d+, coluna \d+\)/.test(mensagemTexto)) {
            return mensagemTexto;
        }

        const mensagemSemPontoFinal = mensagemTexto.endsWith(".")
            ? mensagemTexto.slice(0, -1)
            : mensagemTexto;
        return `${mensagemSemPontoFinal} (linha ${token.startLine}, coluna ${token.startCol}).`;
    }

    class ErroSintatico extends Error {
        constructor(mensagem, detalhe = null) {
            super(incluirPosicaoNaMensagem(mensagem, detalhe));
            this.name = "ErroSintatico";
            this.codigo = detalhe?.codigo ?? "TOKEN_INESPERADO";
            this.fase = "sintatico";
            this.etapa = "sintatico";
            this.mensagem = this.message;
            this.token = detalhe?.encontrado ?? null;
            this.esperados = detalhe?.esperados ?? [];
            this.line = this.token?.startLine ?? null;
            this.col = this.token?.startCol ?? null;
            this.endLine = this.token?.endLine ?? this.line;
            this.endCol = this.token?.endCol ?? this.col;
            this.index = this.token?.startIndex ?? null;
            this.endIndex = this.token?.endIndex ?? this.index;
            this.detalhe = detalhe;
        }
    }

    LALG.ErroSintatico = ErroSintatico;
})();
