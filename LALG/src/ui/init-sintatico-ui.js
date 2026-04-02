(() => {
    const LALG = window.LALG = window.LALG || {};
    const EOF_TOKEN = "EOF";

    function extrairMarcacoesErro(resultado) {
        if (!resultado || resultado.ok) return [];
        if (resultado.etapa === "lexico") {
            if (resultado.erro?.index == null) return [];
            return [{ index: resultado.erro.index }];
        }

        const token = resultado.erro?.detalhe?.encontrado;
        if (!token || token.startIndex == null) return [];
        return [{ index: token.startIndex }];
    }

    function contarTokensVisiveis(resultado) {
        const tokens = resultado?.resultadoLexico?.tokens ?? [];
        return tokens.filter((token) => token && token.token !== EOF_TOKEN && token.cod !== EOF_TOKEN).length;
    }

    function initSintaticoUI({
        analisarDeclaracoesVariaveis,
        getTokenCategoria,
        highlightCode,
        exemploDeclaracoes,
    }) {
        const {
            renderSintaticoResumoArea,
            renderSintaticoTokensArea,
            renderSintaticoDeclaracoesArea,
            renderSintaticoErroArea,
        } = LALG;

        document.addEventListener("DOMContentLoaded", () => {
            const panel = document.getElementById("tabSintatico");
            if (!panel) return;

            const outputTabs = panel.querySelectorAll(".output-tab");
            const outputContents = panel.querySelectorAll(".output-content");
            const inputExpr = panel.querySelector("#sintInputExpr");
            const lineNumbers = panel.querySelector("#sintLineNumbers");
            const highlightOverlay = panel.querySelector("#sintHighlightOverlay");
            const btnCompilar = panel.querySelector("#btnSintaticoCompilar");
            const btnLimpar = panel.querySelector("#btnSintaticoLimpar");
            const btnExemplo = panel.querySelector("#btnSintaticoExemplo");
            const btnCarregar = panel.querySelector("#btnSintaticoCarregar");
            const fileInput = panel.querySelector("#sintFileInput");
            const btnSalvar = panel.querySelector("#btnSintaticoSalvar");
            const resumoArea = panel.querySelector("#sintResumoArea");
            const tokensArea = panel.querySelector("#sintTokensArea");
            const declaracoesArea = panel.querySelector("#sintDeclaracoesArea");
            const errorArea = panel.querySelector("#sintErrorArea");
            const statusBadge = panel.querySelector("#sintStatusBadge");
            const tokenCountBadge = panel.querySelector("#sintTokenCount");
            const declarationCountBadge = panel.querySelector("#sintDeclarationCount");
            const errorCountBadge = panel.querySelector("#sintErrorCount");

            const state = {
                marcacoesErro: [],
                ultimoResultado: null,
            };

            function switchToTab(tabName) {
                outputTabs.forEach((tab) => tab.classList.remove("active"));
                outputContents.forEach((content) => content.classList.remove("active"));
                panel.querySelector(`[data-output="${tabName}"]`).classList.add("active");
                panel.querySelector(`#${tabName}`).classList.add("active");
            }

            function resetBadges() {
                statusBadge.textContent = "-";
                statusBadge.classList.remove("error", "success");
                tokenCountBadge.textContent = "0";
                declarationCountBadge.textContent = "0";
                errorCountBadge.textContent = "0";
            }

            function atualizarBadges(resultado) {
                if (!resultado) {
                    resetBadges();
                    return;
                }

                statusBadge.textContent = resultado.ok ? "OK" : "ERRO";
                statusBadge.classList.remove("error", "success");
                statusBadge.classList.add(resultado.ok ? "success" : "error");
                tokenCountBadge.textContent = String(contarTokensVisiveis(resultado));
                declarationCountBadge.textContent = String(resultado.ok ? resultado.declaracoes.length : 0);
                errorCountBadge.textContent = resultado.ok ? "0" : "1";
            }

            function bindErrorSelection() {
                errorArea.querySelectorAll(".error-clickable").forEach((item) => {
                    item.addEventListener("click", () => {
                        const idx = parseInt(item.dataset.errorIndex, 10);
                        if (isNaN(idx)) return;

                        const end = Math.min(idx + 1, inputExpr.value.length);
                        inputExpr.focus();
                        inputExpr.setSelectionRange(idx, end);
                    });
                });
            }

            function renderPanels() {
                resumoArea.innerHTML = renderSintaticoResumoArea(state.ultimoResultado);
                tokensArea.innerHTML = renderSintaticoTokensArea(state.ultimoResultado, getTokenCategoria);
                declaracoesArea.innerHTML = renderSintaticoDeclaracoesArea(state.ultimoResultado);
                errorArea.innerHTML = renderSintaticoErroArea(state.ultimoResultado, inputExpr.value);
                bindErrorSelection();
            }

            function updateLineNumbers() {
                const lines = inputExpr.value.split("\n").length;
                lineNumbers.textContent = Array.from({ length: lines }, (_, i) => i + 1).join("\n");
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
                resetBadges();
                renderPanels();
                updateHighlight([]);
            }

            outputTabs.forEach((tab) => {
                tab.addEventListener("click", () => {
                    outputTabs.forEach((t) => t.classList.remove("active"));
                    outputContents.forEach((c) => c.classList.remove("active"));
                    tab.classList.add("active");
                    panel.querySelector(`#${tab.dataset.output}`).classList.add("active");
                });
            });

            inputExpr.addEventListener("input", () => {
                updateLineNumbers();
                invalidateResultado();
                switchToTab("sintOutputResumo");
            });
            inputExpr.addEventListener("scroll", syncScroll);

            btnExemplo.addEventListener("click", () => {
                inputExpr.value = exemploDeclaracoes;
                updateLineNumbers();
                invalidateResultado();
                switchToTab("sintOutputResumo");
            });

            btnLimpar.addEventListener("click", () => {
                inputExpr.value = "";
                updateLineNumbers();
                invalidateResultado();
                switchToTab("sintOutputResumo");
            });

            btnCarregar.addEventListener("click", () => {
                fileInput.click();
            });

            fileInput.addEventListener("change", (event) => {
                const file = event.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = (ev) => {
                    inputExpr.value = ev.target.result;
                    updateLineNumbers();
                    invalidateResultado();
                    switchToTab("sintOutputResumo");
                };
                reader.readAsText(file, "UTF-8");
                fileInput.value = "";
            });

            btnSalvar.addEventListener("click", () => {
                const code = inputExpr.value;
                if (code.trim() === "") return;

                const blob = new Blob([code], { type: "text/plain;charset=utf-8;" });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = "declaracoes_variaveis.lalg";
                link.click();
                URL.revokeObjectURL(url);
            });

            btnCompilar.addEventListener("click", () => {
                state.ultimoResultado = null;
                state.marcacoesErro = [];
                resetBadges();
                renderPanels();

                const expr = inputExpr.value;
                if (expr.trim() === "") {
                    updateHighlight([]);
                    switchToTab("sintOutputResumo");
                    return;
                }

                const resultado = analisarDeclaracoesVariaveis(expr);
                state.ultimoResultado = resultado;
                state.marcacoesErro = extrairMarcacoesErro(resultado);

                atualizarBadges(resultado);
                renderPanels();
                updateHighlight();

                if (resultado.ok) {
                    switchToTab("sintOutputResumo");
                    return;
                }

                switchToTab("sintOutputErros");
            });

            resetBadges();
            renderPanels();
            updateLineNumbers();
            updateHighlight([]);
            switchToTab("sintOutputResumo");
        });
    }

    LALG.initSintaticoUI = initSintaticoUI;
})();
