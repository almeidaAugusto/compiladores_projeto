(() => {
    const LALG = window.LALG = window.LALG || {};

    function extrairMarcacoesSemanticas(resultado) {
        if (!resultado || resultado.ok) return [];

        if (resultado.etapa === "lexico") {
            return (resultado.erros ?? [])
                .filter((erro) => erro?.index != null)
                .map((erro) => ({ index: erro.index }));
        }

        if (resultado.etapa === "sintatico") {
            return (resultado.erros ?? [])
                .map((erro) => erro?.detalhe?.encontrado)
                .filter((token) => token?.startIndex != null)
                .map((token) => ({ index: token.startIndex }));
        }

        return (resultado.erros ?? [])
            .filter((erro) => erro?.index != null)
            .map((erro) => ({ index: erro.index }));
    }

    function initSemanticoUI({
        analisarSemantica,
        gerarMepa,
        MepaInterpreter,
        highlightCode,
        exemploPrograma,
    }) {
        const {
            renderSemanticoResumoArea,
            renderSemanticoSimbolosArea,
            renderSemanticoEscoposArea,
            renderSemanticoErroArea,
            renderSemanticoAvisosArea,
            renderMepaCodigoArea,
            renderMepaExecucaoArea,
        } = LALG;

        document.addEventListener("DOMContentLoaded", () => {
            const panel = document.getElementById("tabSemantico");
            if (!panel) return;

            const outputTabs = panel.querySelectorAll(".output-tab");
            const outputContents = panel.querySelectorAll(".output-content");
            const inputExpr = panel.querySelector("#semInputExpr");
            const lineNumbers = panel.querySelector("#semLineNumbers");
            const highlightOverlay = panel.querySelector("#semHighlightOverlay");
            const btnCompilar = panel.querySelector("#btnSemanticoCompilar");
            const btnLimpar = panel.querySelector("#btnSemanticoLimpar");
            const btnExemplo = panel.querySelector("#btnSemanticoExemplo");
            const btnCarregar = panel.querySelector("#btnSemanticoCarregar");
            const fileInput = panel.querySelector("#semFileInput");
            const btnSalvar = panel.querySelector("#btnSemanticoSalvar");
            const resumoArea = panel.querySelector("#semResumoArea");
            const simbolosArea = panel.querySelector("#semSimbolosArea");
            const escoposArea = panel.querySelector("#semEscoposArea");
            const errorArea = panel.querySelector("#semErrorArea");
            const avisosArea = panel.querySelector("#semAvisosArea");
            const mepaArea = panel.querySelector("#semMepaArea");
            const mepaExecucaoArea = panel.querySelector("#semMepaExecucaoArea");
            const mepaInput = panel.querySelector("#semMepaInput");
            const btnExecutar = panel.querySelector("#btnSemanticoExecutar");
            const btnReiniciar = panel.querySelector("#btnSemanticoReiniciar");
            const btnProximoPasso = panel.querySelector("#btnSemanticoProximoPasso");
            const statusBadge = panel.querySelector("#semStatusBadge");
            const simboloCountBadge = panel.querySelector("#semSymbolCount");
            const escopoCountBadge = panel.querySelector("#semScopeCount");
            const errorCountBadge = panel.querySelector("#semErrorCount");
            const warningCountBadge = panel.querySelector("#semWarningCount");
            const mepaInstructionCountBadge = panel.querySelector("#semMepaInstructionCount");
            const mepaExecutionStatusBadge = panel.querySelector("#semMepaExecutionStatus");

            const state = {
                marcacoesErro: [],
                ultimoResultado: null,
                ultimoMepa: null,
                interpretadorMepa: null,
                ultimaExecucao: null,
                erroExecucao: null,
            };

            function switchToTab(tabName) {
                outputTabs.forEach((tab) => tab.classList.remove("active"));
                outputContents.forEach((content) => content.classList.remove("active"));
                panel.querySelector(`[data-output="${tabName}"]`)?.classList.add("active");
                panel.querySelector(`#${tabName}`)?.classList.add("active");
            }

            function resetBadges() {
                statusBadge.textContent = "-";
                statusBadge.classList.remove("error", "success", "warning");
                simboloCountBadge.textContent = "0";
                escopoCountBadge.textContent = "0";
                errorCountBadge.textContent = "0";
                warningCountBadge.textContent = "0";
            }

            function atualizarBadges(resultado) {
                if (!resultado) {
                    resetBadges();
                    return;
                }

                const bloqueada = Boolean(resultado.bloqueada);
                statusBadge.textContent = resultado.ok ? "OK" : (bloqueada ? "BLOQ." : "ERRO");
                statusBadge.classList.remove("error", "success", "warning");
                statusBadge.classList.add(resultado.ok ? "success" : "error");
                simboloCountBadge.textContent = String(resultado.tabelaSimbolos?.length ?? 0);
                escopoCountBadge.textContent = String(resultado.escopos?.length ?? 0);
                errorCountBadge.textContent = String(resultado.erros?.length ?? 0);
                warningCountBadge.textContent = String(resultado.avisos?.length ?? 0);
            }

            function resetMepaBadges() {
                mepaInstructionCountBadge.textContent = "0";
                mepaExecutionStatusBadge.textContent = "-";
                mepaExecutionStatusBadge.classList.remove("error", "success", "warning");
                btnExecutar.disabled = true;
                if (btnReiniciar) btnReiniciar.disabled = true;
                if (btnProximoPasso) btnProximoPasso.disabled = true;
            }

            function atualizarMepaBadges() {
                const instructions = state.ultimoMepa?.ok && Array.isArray(state.ultimoMepa.instructions)
                    ? state.ultimoMepa.instructions
                    : [];
                const execucao = state.ultimaExecucao;
                const erro = state.erroExecucao ?? execucao?.error ?? null;
                const finalizada = Boolean(execucao?.halted);
                const possuiCodigo = state.ultimoMepa?.ok && Array.isArray(state.ultimoMepa.instructions);
                mepaInstructionCountBadge.textContent = String(instructions.length);

                mepaExecutionStatusBadge.classList.remove("error", "success", "warning");
                if (erro) {
                    mepaExecutionStatusBadge.textContent = "ERRO";
                    mepaExecutionStatusBadge.classList.add("error");
                } else if (finalizada) {
                    mepaExecutionStatusBadge.textContent = "OK";
                    mepaExecutionStatusBadge.classList.add("success");
                } else if (state.interpretadorMepa) {
                    const passos = Number(execucao?.steps ?? 0);
                    mepaExecutionStatusBadge.textContent = passos > 0 ? "EM EXEC." : "PRONTO";
                    mepaExecutionStatusBadge.classList.add("warning");
                } else {
                    mepaExecutionStatusBadge.textContent = "-";
                }

                const podeAvancar = possuiCodigo && !erro && !finalizada;
                btnExecutar.disabled = !podeAvancar;
                if (btnProximoPasso) btnProximoPasso.disabled = !podeAvancar;
                if (btnReiniciar) btnReiniciar.disabled = !possuiCodigo;
            }

            function criarFalhaMepa(erro) {
                const erroNormalizado = erro instanceof Error ? erro : new Error(String(erro));
                return {
                    ok: false,
                    etapa: "mepa",
                    bloqueada: true,
                    erro: erroNormalizado,
                    erros: [erroNormalizado],
                    instructions: [],
                    codeText: "",
                };
            }

            function gerarCodigoMepa(resultadoSemantico) {
                if (typeof gerarMepa !== "function") {
                    return criarFalhaMepa("Gerador MEPA indisponível. Verifique se os scripts MEPA foram carregados.");
                }

                try {
                    const resultadoMepa = gerarMepa(resultadoSemantico);
                    if (!resultadoMepa || typeof resultadoMepa.ok !== "boolean") {
                        return criarFalhaMepa("O gerador MEPA retornou um resultado inválido.");
                    }
                    if (resultadoMepa.ok && !Array.isArray(resultadoMepa.instructions)) {
                        return criarFalhaMepa("O gerador MEPA não forneceu instruções estruturadas para execução.");
                    }
                    return resultadoMepa;
                } catch (erro) {
                    return criarFalhaMepa(erro);
                }
            }

            function limparExecucaoMepa() {
                state.interpretadorMepa = null;
                state.ultimaExecucao = null;
                state.erroExecucao = null;
            }

            function invalidarEstadoMepa() {
                state.ultimoMepa = null;
                limparExecucaoMepa();
                mepaInput.value = "";
                resetMepaBadges();
            }

            function obterInstrucoesMepaValidas() {
                if (!state.ultimoMepa?.ok || !Array.isArray(state.ultimoMepa.instructions)) {
                    throw new Error("Não há código MEPA válido disponível para execução.");
                }
                return state.ultimoMepa.instructions;
            }

            function registrarSnapshotMepa(snapshot) {
                if (!snapshot || typeof snapshot !== "object") {
                    throw new Error("O interpretador MEPA não retornou o estado da máquina.");
                }
                state.ultimaExecucao = snapshot;
                return snapshot;
            }

            function criarSessaoMepa() {
                if (state.interpretadorMepa) return state.interpretadorMepa;

                if (typeof MepaInterpreter !== "function") {
                    throw new Error("Interpretador MEPA indisponível. Verifique se os scripts MEPA foram carregados.");
                }

                const interpretador = new MepaInterpreter(obterInstrucoesMepaValidas(), {
                    input: mepaInput.value,
                });
                state.interpretadorMepa = interpretador;
                state.erroExecucao = null;
                registrarSnapshotMepa(interpretador.getState());
                return interpretador;
            }

            function registrarErroExecucaoMepa(erro) {
                const erroNormalizado = erro instanceof Error ? erro : new Error(String(erro));
                state.erroExecucao = erroNormalizado;

                const interpretador = state.interpretadorMepa;
                if (interpretador && typeof interpretador.getState === "function") {
                    try {
                        const snapshot = interpretador.getState();
                        state.ultimaExecucao = {
                            ...snapshot,
                            error: snapshot.error ?? erroNormalizado,
                        };
                        return;
                    } catch {
                        // O diagnóstico original continua disponível mesmo se o estado
                        // interno estiver corrompido e não puder ser materializado.
                    }
                }

                if (state.ultimaExecucao) {
                    state.ultimaExecucao = {
                        ...state.ultimaExecucao,
                        error: state.ultimaExecucao.error ?? erroNormalizado,
                    };
                }
            }

            function concluirAcaoMepa() {
                atualizarMepaBadges();
                renderPanels();
                switchToTab("semOutputExecucao");
            }

            function executarMepa() {
                try {
                    const interpretador = criarSessaoMepa();
                    state.erroExecucao = null;
                    registrarSnapshotMepa(interpretador.run({ reset: false }));
                } catch (erro) {
                    registrarErroExecucaoMepa(erro);
                }

                concluirAcaoMepa();
            }

            function executarProximoPassoMepa() {
                try {
                    const interpretador = criarSessaoMepa();
                    state.erroExecucao = null;
                    registrarSnapshotMepa(interpretador.step());
                } catch (erro) {
                    registrarErroExecucaoMepa(erro);
                }

                concluirAcaoMepa();
            }

            function reiniciarMepa() {
                try {
                    obterInstrucoesMepaValidas();
                    const interpretador = state.interpretadorMepa ?? criarSessaoMepa();
                    state.erroExecucao = null;
                    registrarSnapshotMepa(interpretador.reset({ input: mepaInput.value }));
                } catch (erro) {
                    registrarErroExecucaoMepa(erro);
                }

                concluirAcaoMepa();
            }

            function bindDiagnosticSelection() {
                panel.querySelectorAll(".error-clickable").forEach((item) => {
                    item.addEventListener("click", () => {
                        const inicio = Number.parseInt(item.dataset.errorIndex, 10);
                        if (Number.isNaN(inicio)) return;

                        const fimInformado = Number.parseInt(item.dataset.errorEndIndex, 10);
                        const fim = Number.isNaN(fimInformado)
                            ? inicio + 1
                            : fimInformado + 1;
                        inputExpr.focus();
                        inputExpr.setSelectionRange(inicio, Math.min(fim, inputExpr.value.length));
                    });
                });
            }

            function renderPanels() {
                resumoArea.innerHTML = renderSemanticoResumoArea(state.ultimoResultado);
                simbolosArea.innerHTML = renderSemanticoSimbolosArea(state.ultimoResultado);
                escoposArea.innerHTML = renderSemanticoEscoposArea(state.ultimoResultado);
                errorArea.innerHTML = renderSemanticoErroArea(state.ultimoResultado, inputExpr.value);
                avisosArea.innerHTML = renderSemanticoAvisosArea(state.ultimoResultado, inputExpr.value);
                mepaArea.innerHTML = renderMepaCodigoArea(
                    state.ultimoMepa,
                    state.ultimaExecucao,
                    state.erroExecucao
                );
                mepaExecucaoArea.innerHTML = renderMepaExecucaoArea(
                    state.ultimoMepa,
                    state.ultimaExecucao,
                    state.erroExecucao
                );
                bindDiagnosticSelection();
            }

            function updateLineNumbers() {
                const lines = inputExpr.value.split("\n").length;
                lineNumbers.textContent = Array.from({ length: lines }, (_, index) => index + 1).join("\n");
            }

            function updateHighlight(marcacoes = state.marcacoesErro) {
                highlightOverlay.innerHTML = highlightCode(inputExpr.value, marcacoes) + "\n";
            }

            function syncScroll() {
                highlightOverlay.scrollTop = inputExpr.scrollTop;
                highlightOverlay.scrollLeft = inputExpr.scrollLeft;
                lineNumbers.scrollTop = inputExpr.scrollTop;
            }

            function invalidateResultado() {
                state.ultimoResultado = null;
                state.marcacoesErro = [];
                invalidarEstadoMepa();
                resetBadges();
                renderPanels();
                updateHighlight([]);
            }

            outputTabs.forEach((tab) => {
                tab.addEventListener("click", () => switchToTab(tab.dataset.output));
            });

            inputExpr.addEventListener("input", () => {
                updateLineNumbers();
                invalidateResultado();
                switchToTab("semOutputResumo");
            });
            inputExpr.addEventListener("scroll", syncScroll);

            mepaInput.addEventListener("input", () => {
                if (!state.interpretadorMepa && !state.ultimaExecucao && !state.erroExecucao) return;
                limparExecucaoMepa();
                atualizarMepaBadges();
                renderPanels();
            });

            btnExemplo.addEventListener("click", () => {
                inputExpr.value = exemploPrograma;
                updateLineNumbers();
                invalidateResultado();
                switchToTab("semOutputResumo");
            });

            btnLimpar.addEventListener("click", () => {
                inputExpr.value = "";
                updateLineNumbers();
                invalidateResultado();
                switchToTab("semOutputResumo");
            });

            btnCarregar.addEventListener("click", () => fileInput.click());
            fileInput.addEventListener("change", (event) => {
                const file = event.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = (loadEvent) => {
                    inputExpr.value = loadEvent.target.result;
                    updateLineNumbers();
                    invalidateResultado();
                    switchToTab("semOutputResumo");
                };
                reader.readAsText(file, "UTF-8");
                fileInput.value = "";
            });

            btnSalvar.addEventListener("click", () => {
                if (inputExpr.value.trim() === "") return;

                const blob = new Blob([inputExpr.value], { type: "text/plain;charset=utf-8;" });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = "programa.lalg";
                link.click();
                URL.revokeObjectURL(url);
            });

            btnExecutar.addEventListener("click", executarMepa);
            btnReiniciar?.addEventListener("click", reiniciarMepa);
            btnProximoPasso?.addEventListener("click", executarProximoPassoMepa);

            btnCompilar.addEventListener("click", () => {
                state.ultimoResultado = null;
                state.marcacoesErro = [];
                invalidarEstadoMepa();
                resetBadges();
                renderPanels();

                if (inputExpr.value.trim() === "") {
                    updateHighlight([]);
                    switchToTab("semOutputResumo");
                    return;
                }

                const resultado = analisarSemantica(inputExpr.value);
                state.ultimoResultado = resultado;
                state.marcacoesErro = extrairMarcacoesSemanticas(resultado);
                if (resultado.ok) {
                    state.ultimoMepa = gerarCodigoMepa(resultado);
                }
                atualizarBadges(resultado);
                atualizarMepaBadges();
                renderPanels();
                updateHighlight();
                if (!resultado.ok) {
                    switchToTab("semOutputErros");
                } else if (!state.ultimoMepa?.ok) {
                    switchToTab("semOutputMepa");
                } else {
                    switchToTab("semOutputResumo");
                }
            });

            resetBadges();
            invalidarEstadoMepa();
            renderPanels();
            updateLineNumbers();
            updateHighlight([]);
            switchToTab("semOutputResumo");
        });
    }

    LALG.initSemanticoUI = initSemanticoUI;
})();
