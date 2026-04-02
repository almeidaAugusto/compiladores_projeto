(() => {
    const LALG = window.LALG = window.LALG || {};

    function initLexicoUI({
        scanner,
        buildTabelaSimbolos,
        getTokenCategoria,
        highlightCode,
        codigoExemplo,
    }) {
        const { renderErrosArea, renderSimbolosArea, renderTokensArea } = LALG;

        document.addEventListener("DOMContentLoaded", () => {
            const panel = document.getElementById("tabTokenizar");
            if (!panel) return;

            const outputTabs = panel.querySelectorAll(".output-tab");
            const outputContents = panel.querySelectorAll(".output-content");
            const inputExpr = panel.querySelector("#inputExpr");
            const lineNumbers = panel.querySelector("#lineNumbers");
            const highlightOverlay = panel.querySelector("#highlightOverlay");
            const btnTokenizar = panel.querySelector("#btnTokenizar");
            const btnLimpar = panel.querySelector("#btnLimpar");
            const btnExemplo = panel.querySelector("#btnExemplo");
            const btnCarregar = panel.querySelector("#btnCarregar");
            const fileInput = panel.querySelector("#fileInput");
            const btnSalvar = panel.querySelector("#btnSalvar");
            const resultArea = panel.querySelector("#resultArea");
            const errorArea = panel.querySelector("#errorArea");
            const simbolosArea = panel.querySelector("#simbolosArea");
            const tokenCountBadge = panel.querySelector("#tokenCount");
            const errorCountBadge = panel.querySelector("#errorCount");
            const simbolosCountBadge = panel.querySelector("#simbolosCount");

            const state = {
                ultimoResultado: null,
                ultimosErros: [],
            };

            function switchToTab(tabName) {
                outputTabs.forEach((tab) => tab.classList.remove("active"));
                outputContents.forEach((content) => content.classList.remove("active"));
                panel.querySelector(`[data-output="${tabName}"]`).classList.add("active");
                panel.querySelector(`#${tabName}`).classList.add("active");
            }

            function resetBadges() {
                tokenCountBadge.textContent = "0";
                errorCountBadge.textContent = "0";
                simbolosCountBadge.textContent = "0";
            }

            function clearOutputAreas() {
                resultArea.innerHTML = "";
                errorArea.innerHTML = "";
                simbolosArea.innerHTML = "";
            }

            function updateLineNumbers() {
                const lines = inputExpr.value.split("\n").length;
                lineNumbers.textContent = Array.from({ length: lines }, (_, i) => i + 1).join("\n");
            }

            function updateHighlight(erros = state.ultimosErros) {
                highlightOverlay.innerHTML = highlightCode(inputExpr.value, erros) + "\n";
            }

            function syncScroll() {
                highlightOverlay.scrollTop = inputExpr.scrollTop;
                highlightOverlay.scrollLeft = inputExpr.scrollLeft;
                lineNumbers.scrollTop = inputExpr.scrollTop;
            }

            function bindTokenRowSelection() {
                resultArea.querySelectorAll(".token-row").forEach((row) => {
                    row.addEventListener("click", () => {
                        const start = parseInt(row.dataset.start, 10);
                        const end = parseInt(row.dataset.end, 10);
                        inputExpr.focus();
                        inputExpr.setSelectionRange(start, end + 1);
                        resultArea.querySelectorAll(".token-row").forEach((line) => line.classList.remove("selected"));
                        row.classList.add("selected");
                    });
                });
            }

            function bindErrorSelection() {
                errorArea.querySelectorAll(".error-clickable").forEach((item) => {
                    item.addEventListener("click", () => {
                        const idx = parseInt(item.dataset.errorIndex, 10);
                        if (!isNaN(idx)) {
                            inputExpr.focus();
                            inputExpr.setSelectionRange(idx, idx + 1);
                        }
                    });
                });
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
                updateHighlight();
            });
            inputExpr.addEventListener("scroll", syncScroll);

            btnExemplo.addEventListener("click", () => {
                inputExpr.value = codigoExemplo;
                updateLineNumbers();
                updateHighlight();
            });

            btnLimpar.addEventListener("click", () => {
                inputExpr.value = "";
                state.ultimosErros = [];
                updateLineNumbers();
                updateHighlight([]);
                resultArea.innerHTML = '<p class="empty-state"><span class="material-symbols-rounded">info</span>Pressione <strong>Compilar</strong> para analisar o c\u00f3digo LALG</p>';
                errorArea.innerHTML = "";
                simbolosArea.innerHTML = "";
                resetBadges();
                state.ultimoResultado = null;
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
                    updateHighlight();
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
                link.download = "codigo_lalg.txt";
                link.click();
                URL.revokeObjectURL(url);
            });

            btnTokenizar.addEventListener("click", () => {
                clearOutputAreas();
                resetBadges();
                state.ultimoResultado = null;

                const expr = inputExpr.value;
                if (expr.trim() === "") return;

                const resultado = scanner(expr);
                const tokens = resultado.tokens;
                const erros = resultado.erros;
                state.ultimoResultado = resultado;

                tokenCountBadge.textContent = tokens.length;
                errorCountBadge.textContent = erros.length;

                resultArea.innerHTML = renderTokensArea(tokens, getTokenCategoria);
                if (tokens.length > 0) {
                    bindTokenRowSelection();
                }

                const tabelaSim = buildTabelaSimbolos(tokens);
                simbolosCountBadge.textContent = tabelaSim.size;
                simbolosArea.innerHTML = renderSimbolosArea(tabelaSim);

                state.ultimosErros = erros;
                updateHighlight(erros);

                errorArea.innerHTML = renderErrosArea(erros, expr);
                if (erros.length > 0) {
                    bindErrorSelection();
                    switchToTab("outputErros");
                } else {
                    switchToTab("outputTokens");
                }
            });
        });
    }

    LALG.initLexicoUI = initLexicoUI;
})();
