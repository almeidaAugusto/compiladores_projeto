(() => {
    const LALG = window.LALG = window.LALG || {};
    const { EscopoSemantico, normalizarNomeSemantico } = LALG;

    class TabelaSimbolosSemantica {
        constructor() {
            this.proximoEscopoId = 0;
            this.proximoSimboloId = 0;
            // A primeira célula global da área de dados MEPA é D[0].
            // IDs de símbolo não podem ser usados para esse fim porque os
            // identificadores pré-declarados também recebem um ID.
            this.proximoEnderecoRelativoGlobal = 0;
            this.escopos = [];
            this.escopoGlobal = this.criarEscopo("global", "global", null);
            this.escopoAtual = this.escopoGlobal;
            this.inicializarPreDeclarados();
        }

        criarEscopo(nome, tipo, pai = this.escopoAtual) {
            const escopo = new EscopoSemantico({
                id: this.proximoEscopoId++,
                nome,
                tipo,
                pai,
            });
            if (pai) pai.filhos.push(escopo);
            this.escopos.push(escopo);
            return escopo;
        }

        entrarEscopo(nome, tipo) {
            const escopo = this.criarEscopo(nome, tipo, this.escopoAtual);
            this.escopoAtual = escopo;
            return escopo;
        }

        sairEscopo() {
            if (this.escopoAtual.pai) this.escopoAtual = this.escopoAtual.pai;
            return this.escopoAtual;
        }

        declarar(dados, escopo = this.escopoAtual) {
            const existente = escopo.buscarLocal(dados.nome);
            if (existente) {
                return { sucesso: false, simbolo: existente };
            }

            const posicao = dados.posicao ?? {};
            const ehVariavelGlobal = dados.categoria === "variavel" && escopo === this.escopoGlobal;
            const endRel = dados.end_rel ?? (ehVariavelGlobal
                ? this.proximoEnderecoRelativoGlobal++
                : null);
            const simbolo = {
                id: this.proximoSimboloId++,
                nome: dados.nome,
                chave: normalizarNomeSemantico(dados.nome),
                categoria: dados.categoria,
                tipo: dados.tipo ?? null,
                valor: dados.valor ?? null,
                escopo: escopo.nome,
                escopoId: escopo.id,
                nivelLexico: escopo.nivelLexico,
                linha: posicao.linha ?? posicao.startLine ?? null,
                coluna: posicao.coluna ?? posicao.startCol ?? null,
                indiceInicio: posicao.indiceInicio ?? posicao.startIndex ?? null,
                indiceFim: posicao.indiceFim ?? posicao.endIndex ?? null,
                utilizada: false,
                preDeclarado: Boolean(dados.preDeclarado),
                modoParametro: dados.modoParametro ?? null,
                parametros: dados.parametros ?? [],
                procedimentoEspecial: dados.procedimentoEspecial ?? null,
                escopoCorpoId: dados.escopoCorpoId ?? null,
                escopoCorpoNome: dados.escopoCorpoNome ?? null,
                nivelLexicoCorpo: dados.nivelLexicoCorpo ?? null,
                // end_rel é o deslocamento simples usado por CRVL/ARMZ nesta
                // etapa. Variáveis locais e parâmetros ficam sem endereço até
                // haver suporte a quadros de ativação.
                end_rel: endRel,
            };
            escopo.inserir(simbolo);
            return { sucesso: true, simbolo };
        }

        buscar(nome, escopo = this.escopoAtual) {
            return escopo?.buscar(nome) ?? null;
        }

        marcarUtilizada(simbolo) {
            if (simbolo) simbolo.utilizada = true;
        }

        associarEscopoCorpo(simbolo, escopo) {
            if (!simbolo || !escopo) return;
            simbolo.escopoCorpoId = escopo.id;
            simbolo.escopoCorpoNome = escopo.nome;
            simbolo.nivelLexicoCorpo = escopo.nivelLexico;
        }

        inicializarPreDeclarados() {
            const preDeclarados = [
                { nome: "int", categoria: "tipo", tipo: "int" },
                { nome: "boolean", categoria: "tipo", tipo: "boolean" },
                { nome: "read", categoria: "procedimento", procedimentoEspecial: "read" },
                { nome: "write", categoria: "procedimento", procedimentoEspecial: "write" },
                { nome: "true", categoria: "constante", tipo: "boolean", valor: true },
                { nome: "false", categoria: "constante", tipo: "boolean", valor: false },
            ];

            preDeclarados.forEach((simbolo) => {
                this.declarar({ ...simbolo, preDeclarado: true }, this.escopoGlobal);
            });
        }

        listarSimbolos() {
            return this.escopos.flatMap((escopo) => Array.from(escopo.simbolos.values()));
        }

        listarEscopos() {
            return this.escopos.map((escopo) => ({
                id: escopo.id,
                nome: escopo.nome,
                tipo: escopo.tipo,
                nivelLexico: escopo.nivelLexico,
                pai: escopo.pai?.nome ?? null,
                paiId: escopo.pai?.id ?? null,
                simbolos: Array.from(escopo.simbolos.values()),
            }));
        }
    }

    LALG.TabelaSimbolosSemantica = TabelaSimbolosSemantica;
})();
