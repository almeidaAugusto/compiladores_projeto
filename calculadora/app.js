const T_NUM_INT = 0;
const T_NUM_REAL = 1;
const T_OPSOMA = 2;
const T_OPSUB = 3;
const T_OPMUL = 4;
const T_OPDIV = 5;
const T_AP = 6;
const T_FP = 7;

const TOKEN_NOMES = {
    [T_NUM_INT]: "NUM_INT",
    [T_NUM_REAL]: "NUM_REAL",
    [T_OPSOMA]: "OPSOMA",
    [T_OPSUB]: "OPSUB",
    [T_OPMUL]: "OPMUL",
    [T_OPDIV]: "OPDIV",
    [T_AP]: "AP",
    [T_FP]: "FP",
};

const CL_DIGITO = 0;
const CL_PONTO = 1;
const CL_MAIS = 2;
const CL_MENOS = 3;
const CL_VEZES = 4;
const CL_DIV = 5;
const CL_ABREPAR = 6;
const CL_FECHAPAR = 7;
const CL_WS = 8;
const CL_OUTRO = 9;

const CLASSE_NOMES = [
    "DIGITO", "PONTO", "MAIS", "MENOS", "VEZES",
    "DIV", "ABREPAR", "FECHAPAR", "WS", "OUTRO"
];

const NUM_CLASSES = 10;

function classificar(c) {
    if (c >= '0' && c <= '9') return CL_DIGITO;
    if (c === '.') return CL_PONTO;
    if (c === '+') return CL_MAIS;
    if (c === '-') return CL_MENOS;
    if (c === '*') return CL_VEZES;
    if (c === '/') return CL_DIV;
    if (c === '(') return CL_ABREPAR;
    if (c === ')') return CL_FECHAPAR;
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r' || c === '\b')
        return CL_WS;
    return CL_OUTRO;
}

const N0 = 0, N1 = 1, N2 = 2, N3 = 3;
const ERR = -1;

const ESTADO_NUM_NOMES = ["N0", "N1", "N2", "N3"];

const TRANS_NUM = [
    [N1, ERR, ERR, ERR, ERR, ERR, ERR, ERR, ERR, ERR],
    [N1, N2, ERR, ERR, ERR, ERR, ERR, ERR, ERR, ERR],
    [N3, ERR, ERR, ERR, ERR, ERR, ERR, ERR, ERR, ERR],
    [N3, ERR, ERR, ERR, ERR, ERR, ERR, ERR, ERR, ERR],
];

const ACEITACAO_NUM = { [N1]: T_NUM_INT, [N3]: T_NUM_REAL };

const OPERATOR_MAP = new Map([
    ["+", T_OPSOMA],
    ["-", T_OPSUB],
    ["*", T_OPMUL],
    ["/", T_OPDIV],
    ["(", T_AP],
    [")", T_FP],
]);

function scanNumber(entrada, i) {
    const n = entrada.length;
    let estado = N0;
    let pos = i;
    let ultimoAceitoPos = -1;
    let ultimoAceitoEstado = -1;

    while (pos < n) {
        const cl = classificar(entrada[pos]);
        const prox = TRANS_NUM[estado][cl];
        if (prox === ERR) break;
        estado = prox;
        pos++;

        if (estado in ACEITACAO_NUM) {
            ultimoAceitoPos = pos;
            ultimoAceitoEstado = estado;
        }
    }

    if (estado === N2) {
        return {
            erro: true,
            mensagem: "número terminado em '.' sem dígitos após o ponto",
            erroPos: pos - 1,
            newPos: pos,
            tokenParcial: ultimoAceitoPos !== -1 ? {
                cod: ACEITACAO_NUM[ultimoAceitoEstado],
                lexema: entrada.substring(i, ultimoAceitoPos),
                newPos: ultimoAceitoPos,
            } : null,
        };
    }

    if (ultimoAceitoPos !== -1) {
        return {
            cod: ACEITACAO_NUM[ultimoAceitoEstado],
            lexema: entrada.substring(i, ultimoAceitoPos),
            newPos: ultimoAceitoPos,
        };
    }

    return null;
}

function scanOperator(entrada, i) {
    const n = entrada.length;
    const restante = n - i;

    for (const [op, cod] of OPERATOR_MAP) {
        if (op.length <= restante && entrada.startsWith(op, i)) {
            return { cod, lexema: op, newPos: i + op.length };
        }
    }
    return null;
}

function isWhitespace(c) {
    return c === ' ' || c === '\t' || c === '\n' || c === '\r' || c === '\b';
}

function isDigit(c) {
    return c >= '0' && c <= '9';
}

function getErrorContext(entrada, index) {
    if (index == null || index < 0 || index >= entrada.length) return null;
    const lineStart = entrada.lastIndexOf('\n', index - 1) + 1;
    let lineEnd = entrada.indexOf('\n', index);
    if (lineEnd === -1) lineEnd = entrada.length;
    const lineText = entrada.substring(lineStart, lineEnd);
    const colInLine = index - lineStart;
    return { lineText, colInLine };
}

function scanner(entrada) {
    const tokens = [];
    const erros = [];
    let i = 0;
    const n = entrada.length;
    let line = 1;
    let col = 1;

    while (i < n) {
        const c = entrada[i];

        if (isWhitespace(c)) {
            if (c === '\n') { line++; col = 1; }
            else { col++; }
            i++;
            continue;
        }

        const startLine = line;
        const startCol = col;
        const startIndex = i;

        if (isDigit(c)) {
            const resultado = scanNumber(entrada, i);

            if (resultado && !resultado.erro) {
                const len = resultado.newPos - i;
                tokens.push({
                    cod: resultado.cod,
                    lexema: resultado.lexema,
                    startLine, startCol,
                    endLine: startLine, endCol: startCol + len - 1,
                    startIndex, endIndex: resultado.newPos - 1,
                });
                col += len;
                i = resultado.newPos;
                continue;
            }

            if (resultado && resultado.erro) {
                if (resultado.tokenParcial) {
                    const tp = resultado.tokenParcial;
                    const tLen = tp.newPos - i;
                    tokens.push({
                        cod: tp.cod,
                        lexema: tp.lexema,
                        startLine, startCol,
                        endLine: startLine, endCol: startCol + tLen - 1,
                        startIndex, endIndex: tp.newPos - 1,
                    });
                }
                const errOffset = resultado.erroPos - i;
                erros.push({
                    mensagem: resultado.mensagem,
                    line: startLine,
                    col: startCol + errOffset,
                    index: resultado.erroPos,
                });
                const totalLen = resultado.newPos - i;
                col += totalLen;
                i = resultado.newPos;
                continue;
            }
        }

        const opResult = scanOperator(entrada, i);
        if (opResult) {
            const len = opResult.newPos - i;
            tokens.push({
                cod: opResult.cod,
                lexema: opResult.lexema,
                startLine, startCol,
                endLine: startLine, endCol: startCol + len - 1,
                startIndex, endIndex: opResult.newPos - 1,
            });
            col += len;
            i = opResult.newPos;
            continue;
        }

        if (c === '.') {
            erros.push({
                mensagem: "'.' não pode iniciar um número",
                line: startLine, col: startCol,
                index: i,
            });
        } else {
            erros.push({
                mensagem: `caractere inválido '${c}'`,
                line: startLine, col: startCol,
                index: i,
            });
        }
        col++;
        i++;
    }

    let abre = 0;
    for (const t of tokens) {
        if (t.cod === T_AP) abre++;
        else if (t.cod === T_FP) {
            abre--;
            if (abre < 0) {
                erros.push({
                    mensagem: "')' sem '(' correspondente",
                    line: t.startLine, col: t.startCol,
                    index: t.startIndex,
                });
                abre = 0;
            }
        }
    }
    if (abre > 0) {
        erros.push({
            mensagem: `${abre} parêntese(s) '(' sem ')' correspondente`,
            line: null, col: null,
            index: null,
        });
    }

    return {
        tokens: tokens.map(t => ({
            token: TOKEN_NOMES[t.cod],
            lexema: t.lexema,
            cod: t.cod,
            startLine: t.startLine,
            startCol: t.startCol,
            endLine: t.endLine,
            endCol: t.endCol,
            startIndex: t.startIndex,
            endIndex: t.endIndex,
        })),
        erros,
    };
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

function getTokenCategory(cod) {
    if (cod === T_NUM_INT) return "num-int";
    if (cod === T_NUM_REAL) return "num-real";
    if (cod === T_OPSOMA || cod === T_OPSUB || cod === T_OPMUL || cod === T_OPDIV) return "operador";
    if (cod === T_AP || cod === T_FP) return "parentese";
    return "";
}

function renderErrorItem(erro, entrada) {
    const posLabel = (erro.line != null) ? `${erro.line}:${erro.col}` : '\u2014';
    let html = '<div class="error-item">';
    html += '<span class="material-symbols-rounded">error</span>';
    html += '<div class="error-body">';
    html += `<div class="error-header"><span class="error-pos">${posLabel}</span>ERRO L\u00c9XICO: ${escapeHtml(erro.mensagem)}</div>`;

    if (erro.index != null) {
        const ctx = getErrorContext(entrada, erro.index);
        if (ctx) {
            const before = escapeHtml(ctx.lineText.substring(0, ctx.colInLine));
            const ch = escapeHtml(ctx.lineText[ctx.colInLine] || '');
            const after = escapeHtml(ctx.lineText.substring(ctx.colInLine + 1));
            html += `<div class="error-context"><code>${before}<mark>${ch}</mark>${after}</code></div>`;
        }
    }

    html += '</div></div>';
    return html;
}

document.addEventListener("DOMContentLoaded", () => {
    const outputTabs = document.querySelectorAll(".output-tab");
    const outputContents = document.querySelectorAll(".output-content");

    outputTabs.forEach(tab => {
        tab.addEventListener("click", () => {
            outputTabs.forEach(t => t.classList.remove("active"));
            outputContents.forEach(c => c.classList.remove("active"));
            tab.classList.add("active");
            document.getElementById(tab.dataset.output).classList.add("active");
        });
    });

    const inputExpr = document.getElementById("inputExpr");
    const lineNumbers = document.getElementById("lineNumbers");

    function updateLineNumbers() {
        const lines = inputExpr.value.split("\n").length;
        lineNumbers.textContent = Array.from({ length: lines }, (_, i) => i + 1).join("\n");
    }

    inputExpr.addEventListener("input", updateLineNumbers);
    inputExpr.addEventListener("scroll", () => {
        lineNumbers.scrollTop = inputExpr.scrollTop;
    });

    const btnTokenizar = document.getElementById("btnTokenizar");
    const btnLimpar = document.getElementById("btnLimpar");
    const resultArea = document.getElementById("resultArea");
    const errorArea = document.getElementById("errorArea");
    const tokenCountBadge = document.getElementById("tokenCount");
    const errorCountBadge = document.getElementById("errorCount");

    function switchToTab(tabName) {
        outputTabs.forEach(t => t.classList.remove("active"));
        outputContents.forEach(c => c.classList.remove("active"));
        document.querySelector(`[data-output="${tabName}"]`).classList.add("active");
        document.getElementById(tabName).classList.add("active");
    }

    btnLimpar.addEventListener("click", () => {
        inputExpr.value = "";
        updateLineNumbers();
        resultArea.innerHTML = '<p class="empty-state"><span class="material-symbols-rounded">info</span>Pressione <strong>Compilar</strong> para analisar a expressão</p>';
        errorArea.innerHTML = "";
        tokenCountBadge.textContent = "0";
        errorCountBadge.textContent = "0";
    });

    btnTokenizar.addEventListener("click", () => {
        resultArea.innerHTML = "";
        errorArea.innerHTML = "";
        tokenCountBadge.textContent = "0";
        errorCountBadge.textContent = "0";

        const expr = inputExpr.value;
        if (expr.trim() === "") return;

        const resultado = scanner(expr);
        const tokens = resultado.tokens;
        const erros = resultado.erros;

        tokenCountBadge.textContent = tokens.length;
        errorCountBadge.textContent = erros.length;

        if (tokens.length > 0) {
            let html = '<p class="section-title">Tabela de an\u00e1lise l\u00e9xica</p>';
            html += "<table class='token-table'>";
            html += "<thead><tr><th>N\u00ba</th><th>Lexema</th><th>Token</th><th>Tipo</th><th>Posi\u00e7\u00e3o</th><th>Col. Ini</th><th>Col. Fim</th></tr></thead><tbody>";
            tokens.forEach((t, idx) => {
                const tipo = (t.cod === T_NUM_INT) ? "Inteiro" :
                    (t.cod === T_NUM_REAL) ? "Real" :
                        (t.cod === T_AP || t.cod === T_FP) ? "Delimitador" : "Operador";
                html += `<tr>`;
                html += `<td>${idx + 1}</td>`;
                html += `<td><code style="font-family: 'JetBrains Mono', monospace">${escapeHtml(t.lexema)}</code></td>`;
                html += `<td><strong>${t.token}</strong></td>`;
                html += `<td>${tipo}</td>`;
                html += `<td class="col-pos">${t.startLine}:${t.startCol}</td>`;
                html += `<td class="col-pos">${t.startCol}</td>`;
                html += `<td class="col-pos">${t.endCol}</td>`;
                html += `</tr>`;
            });
            html += "</tbody></table>";
            resultArea.innerHTML = html;
        } else {
            resultArea.innerHTML = '<p class="empty-state"><span class="material-symbols-rounded">info</span>Nenhum token encontrado.</p>';
        }

        if (erros.length > 0) {
            let errHtml = '';
            erros.forEach(e => { errHtml += renderErrorItem(e, expr); });
            errorArea.innerHTML = errHtml;
            switchToTab("outputErros");
        } else {
            switchToTab("outputTokens");
        }
    });
});
