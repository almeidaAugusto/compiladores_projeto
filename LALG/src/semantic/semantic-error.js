(() => {
    const LALG = window.LALG = window.LALG || {};

    function obterPosicao(origem) {
        const posicao = origem?.posicao ?? origem ?? {};
        return {
            line: posicao.linha ?? posicao.startLine ?? null,
            col: posicao.coluna ?? posicao.startCol ?? null,
            endLine: posicao.linhaFim ?? posicao.endLine ?? posicao.linha ?? posicao.startLine ?? null,
            endCol: posicao.colunaFim ?? posicao.endCol ?? posicao.coluna ?? posicao.startCol ?? null,
            index: posicao.indiceInicio ?? posicao.startIndex ?? null,
            endIndex: posicao.indiceFim ?? posicao.endIndex ?? posicao.indiceInicio ?? posicao.startIndex ?? null,
        };
    }

    function incluirPosicaoNaMensagem(mensagem, posicao) {
        if (posicao.line == null || posicao.col == null || /\(linha \d+, coluna \d+\)/.test(mensagem)) {
            return mensagem;
        }

        const semPontoFinal = mensagem.endsWith(".") ? mensagem.slice(0, -1) : mensagem;
        return `${semPontoFinal} (linha ${posicao.line}, coluna ${posicao.col}).`;
    }

    class DiagnosticoSemantico extends Error {
        constructor(mensagem, detalhe = {}) {
            const posicao = obterPosicao(detalhe.origem ?? detalhe.token ?? detalhe.simbolo);
            super(incluirPosicaoNaMensagem(mensagem, posicao));
            this.name = "DiagnosticoSemantico";
            this.mensagem = this.message;
            this.codigo = detalhe.codigo ?? "SEMANTICO";
            this.fase = "semantico";
            this.etapa = "semantico";
            this.simbolo = detalhe.simbolo ?? null;
            this.escopo = detalhe.escopo ?? null;
            this.tipoEsperado = detalhe.tipoEsperado ?? null;
            this.tipoEncontrado = detalhe.tipoEncontrado ?? null;
            this.line = posicao.line;
            this.col = posicao.col;
            this.endLine = posicao.endLine;
            this.endCol = posicao.endCol;
            this.index = posicao.index;
            this.endIndex = posicao.endIndex;
            this.detalhe = detalhe;
        }
    }

    class ErroSemantico extends DiagnosticoSemantico {
        constructor(mensagem, detalhe = {}) {
            super(mensagem, detalhe);
            this.name = "ErroSemantico";
            this.severidade = "erro";
        }
    }

    class AvisoSemantico extends DiagnosticoSemantico {
        constructor(mensagem, detalhe = {}) {
            super(mensagem, detalhe);
            this.name = "AvisoSemantico";
            this.severidade = "aviso";
        }
    }

    LALG.DiagnosticoSemantico = DiagnosticoSemantico;
    LALG.ErroSemantico = ErroSemantico;
    LALG.AvisoSemantico = AvisoSemantico;
})();
