(() => {
    const LALG = window.LALG = window.LALG || {};

    function normalizarNomeSemantico(nome) {
        return String(nome ?? "").toLowerCase();
    }

    class EscopoSemantico {
        constructor({ id, nome, tipo, pai = null }) {
            this.id = id;
            this.nome = nome;
            this.tipo = tipo;
            this.pai = pai;
            this.nivelLexico = pai ? pai.nivelLexico + 1 : 0;
            this.simbolos = new Map();
            this.filhos = [];
        }

        buscarLocal(nome) {
            return this.simbolos.get(normalizarNomeSemantico(nome)) ?? null;
        }

        inserir(simbolo) {
            const chave = normalizarNomeSemantico(simbolo.nome);
            if (this.simbolos.has(chave)) return false;
            this.simbolos.set(chave, simbolo);
            return true;
        }

        buscar(nome) {
            const local = this.buscarLocal(nome);
            return local ?? this.pai?.buscar(nome) ?? null;
        }
    }

    LALG.EscopoSemantico = EscopoSemantico;
    LALG.normalizarNomeSemantico = normalizarNomeSemantico;
})();
