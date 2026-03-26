// ═══════════════════════════════════════════════════════════════════════════
// Analisador Léxico — Linguagem LALG (Pascal Simplificado)
// ═══════════════════════════════════════════════════════════════════════════

// ─── Códigos de Token ──────────────────────────────────────────────────────
const T_PROGRAM     = 0;
const T_BEGIN       = 1;
const T_END         = 2;
const T_PROCEDURE   = 3;
const T_VAR         = 4;
const T_IF          = 5;
const T_THEN        = 6;
const T_ELSE        = 7;
const T_WHILE       = 8;
const T_DO          = 9;
const T_NOT         = 10;
const T_OR          = 11;
const T_AND         = 12;
const T_DIV         = 13;
const T_READ        = 14;
const T_WRITE       = 15;
const T_TRUE        = 16;
const T_FALSE       = 17;
const T_INT         = 18;
const T_BOOLEAN     = 19;

const T_IDENTIFICADOR = 20;
const T_NUMERO        = 21;

const T_ATRIBUICAO  = 22; // :=
const T_PONTO_VIRGULA = 23; // ;
const T_PONTO_FINAL = 24; // .
const T_VIRGULA     = 25; // ,
const T_DOIS_PONTOS = 26; // :
const T_ABRE_PAR    = 27; // (
const T_FECHA_PAR   = 28; // )
const T_ABRE_COL    = 29; // [
const T_FECHA_COL   = 30; // ]

const T_IGUAL       = 31; // =
const T_DIFERENTE   = 32; // <>
const T_MENOR       = 33; // <
const T_MENOR_IGUAL = 34; // <=
const T_MAIOR       = 35; // >
const T_MAIOR_IGUAL = 36; // >=

const T_MAIS        = 37; // +
const T_MENOS       = 38; // -
const T_VEZES       = 39; // *

// ─── Nomes dos Tokens ──────────────────────────────────────────────────────
const TOKEN_NOMES = {
    [T_PROGRAM]:       "PROGRAM",
    [T_BEGIN]:         "BEGIN",
    [T_END]:           "END",
    [T_PROCEDURE]:     "PROCEDURE",
    [T_VAR]:           "VAR",
    [T_IF]:            "IF",
    [T_THEN]:          "THEN",
    [T_ELSE]:          "ELSE",
    [T_WHILE]:         "WHILE",
    [T_DO]:            "DO",
    [T_NOT]:           "NOT",
    [T_OR]:            "OR",
    [T_AND]:           "AND",
    [T_DIV]:           "DIV",
    [T_READ]:          "READ",
    [T_WRITE]:         "WRITE",
    [T_TRUE]:          "TRUE",
    [T_FALSE]:         "FALSE",
    [T_INT]:           "INT",
    [T_BOOLEAN]:       "BOOLEAN",
    [T_IDENTIFICADOR]: "IDENTIFICADOR",
    [T_NUMERO]:        "NUMERO",
    [T_ATRIBUICAO]:    "ATRIBUICAO",
    [T_PONTO_VIRGULA]: "PONTO_VIRGULA",
    [T_PONTO_FINAL]:   "PONTO_FINAL",
    [T_VIRGULA]:       "VIRGULA",
    [T_DOIS_PONTOS]:   "DOIS_PONTOS",
    [T_ABRE_PAR]:      "ABRE_PAR",
    [T_FECHA_PAR]:     "FECHA_PAR",
    [T_ABRE_COL]:      "ABRE_COL",
    [T_FECHA_COL]:     "FECHA_COL",
    [T_IGUAL]:         "IGUAL",
    [T_DIFERENTE]:     "DIFERENTE",
    [T_MENOR]:         "MENOR",
    [T_MENOR_IGUAL]:   "MENOR_IGUAL",
    [T_MAIOR]:         "MAIOR",
    [T_MAIOR_IGUAL]:   "MAIOR_IGUAL",
    [T_MAIS]:          "MAIS",
    [T_MENOS]:         "MENOS",
    [T_VEZES]:         "VEZES",
};

// ─── Categorias dos Tokens (para exibição) ─────────────────────────────────
function getTokenCategoria(cod) {
    if (cod >= T_PROGRAM && cod <= T_BOOLEAN) return "Palavra Reservada";
    if (cod === T_IDENTIFICADOR) return "Identificador";
    if (cod === T_NUMERO) return "Número";
    if (cod === T_ATRIBUICAO) return "Atribuição";
    if (cod >= T_PONTO_VIRGULA && cod <= T_FECHA_COL) return "Delimitador";
    if (cod >= T_IGUAL && cod <= T_MAIOR_IGUAL) return "Operador Relacional";
    if (cod === T_MAIS || cod === T_MENOS || cod === T_VEZES) return "Operador Aritmético";
    return "Desconhecido";
}

// ─── Palavras Reservadas ───────────────────────────────────────────────────
const PALAVRAS_RESERVADAS = new Map([
    ["program",   T_PROGRAM],
    ["begin",     T_BEGIN],
    ["end",       T_END],
    ["procedure", T_PROCEDURE],
    ["var",       T_VAR],
    ["if",        T_IF],
    ["then",      T_THEN],
    ["else",      T_ELSE],
    ["while",     T_WHILE],
    ["do",        T_DO],
    ["not",       T_NOT],
    ["or",        T_OR],
    ["and",       T_AND],
    ["div",       T_DIV],
    ["read",      T_READ],
    ["write",     T_WRITE],
    ["true",      T_TRUE],
    ["false",     T_FALSE],
    ["int",       T_INT],
    ["boolean",   T_BOOLEAN],
]);

// ─── Código de Exemplo LALG ────────────────────────────────────────────────
const CODIGO_EXEMPLO = `program exemplo;
{ Programa de exemplo da linguagem LALG }

int a, b, resultado;
boolean flag;

procedure soma(var x, y : int);
begin
  resultado := x + y
end;

begin
  // leitura de dados
  read(a, b);

  if a > b then
    flag := true
  else
    flag := false;

  while a <> 0 do
  begin
    soma(a, b);
    write(resultado);
    a := a - 1
  end;

  write(resultado)
end.`;

// ─── Funções auxiliares ────────────────────────────────────────────────────
function isLetra(c) {
    return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_';
}

function isDigito(c) {
    return c >= '0' && c <= '9';
}

function isWhitespace(c) {
    return c === ' ' || c === '\t' || c === '\n' || c === '\r';
}

// ═══════════════════════════════════════════════════════════════════════════
// Buffer de Entrada — leitura e devolução de caracteres
// ═══════════════════════════════════════════════════════════════════════════
class Buffer {
    constructor(entrada) {
        this.entrada = entrada;
        this.pos = 0;
        this.line = 1;
        this.col = 1;
        this._anterior = null; // estado anterior (para retroceder)
        this._ultimaLeitura = null; // info da última leitura
    }

    // Lê o próximo caractere e avança a posição
    ler() {
        if (this.pos >= this.entrada.length) return null; // EOF
        const c = this.entrada[this.pos];
        // Salva estado antes de avançar (para retroceder)
        this._anterior = { pos: this.pos, line: this.line, col: this.col };
        this._ultimaLeitura = { pos: this.pos, line: this.line, col: this.col };
        this.pos++;
        if (c === '\n') { this.line++; this.col = 1; }
        else { this.col++; }
        return c;
    }

    // Retrocede um caractere (devolve ao buffer)
    retroceder() {
        if (!this._anterior) return;
        this.pos = this._anterior.pos;
        this.line = this._anterior.line;
        this.col = this._anterior.col;
        this._anterior = null;
    }

    // Retorna posição (line, col, pos) do último caractere lido
    getInfoLeitura() {
        return this._ultimaLeitura;
    }

    // Consulta o caractere atual sem consumir (lookahead)
    lookahead() {
        if (this.pos >= this.entrada.length) return null;
        return this.entrada[this.pos];
    }

    // Verifica se chegou ao fim da entrada
    eof() {
        return this.pos >= this.entrada.length;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Autômato Finito — Estados do Analisador Léxico
// ═══════════════════════════════════════════════════════════════════════════
//
// Diagrama de Estados (AF):
//
//  ┌──────────┐
//  │  INICIO  │──── letra ────► IDENT ──── !letra&!dígito ──► retroceder(); retornar(lexema,token)
//  │   (q0)   │──── dígito ───► NUMERO ─── !dígito ─────────► retroceder(); retornar(lexema,NUMERO)
//  │          │──── ':' ──────► DOIS_PTS ─ '=' ─────────────► retornar(":=", ATRIBUICAO)
//  │          │                    │─── outro ───────────────► retroceder(); retornar(":", DOIS_PONTOS)
//  │          │──── '<' ──────► MENOR_Q ── '>' ─────────────► retornar("<>", DIFERENTE)
//  │          │                    │─── '=' ─────────────────► retornar("<=", MENOR_IGUAL)
//  │          │                    │─── outro ───────────────► retroceder(); retornar("<", MENOR)
//  │          │──── '>' ──────► MAIOR_Q ── '=' ─────────────► retornar(">=", MAIOR_IGUAL)
//  │          │                    │─── outro ───────────────► retroceder(); retornar(">", MAIOR)
//  │          │──── '/' ──────► BARRA_Q ── '/' ─────────────► COMENT_LINHA (ignora até \n)
//  │          │                    │─── outro ───────────────► ERRO: caractere inválido '/'
//  │          │──── '{' ──────► COMENT_BLOCO ── '}' ────────► (ignora comentário)
//  │          │                    │─── EOF ─────────────────► ERRO: comentário não fechado
//  │          │──── op/delim ─► retornar(c, token)
//  │          │──── ws ───────► (ignora, volta ao INICIO)
//  │          │──── outro ────► ERRO: caractere inválido
//  └──────────┘
//

const ESTADO = {
    INICIO:        'INICIO',        // q0 - estado inicial
    IDENT:         'IDENT',         // q1 - acumulando identificador
    NUMERO:        'NUMERO',        // q2 - acumulando dígitos
    DOIS_PTS:      'DOIS_PTS',      // q3 - leu ':', lookahead para '='
    MENOR_Q:       'MENOR_Q',       // q4 - leu '<', lookahead para '>' ou '='
    MAIOR_Q:       'MAIOR_Q',       // q5 - leu '>', lookahead para '='
    BARRA_Q:       'BARRA_Q',       // q6 - leu '/', lookahead para '/'
    COMENT_BLOCO:  'COMENT_BLOCO',  // q7 - dentro de { ... }
    COMENT_LINHA:  'COMENT_LINHA',  // q8 - dentro de // ...
};

// Mapa de operadores/delimitadores simples (transição direta do INICIO)
const SIMPLES_MAP = {
    '=': T_IGUAL,
    '+': T_MAIS,
    '-': T_MENOS,
    '*': T_VEZES,
    ';': T_PONTO_VIRGULA,
    '.': T_PONTO_FINAL,
    ',': T_VIRGULA,
    '(': T_ABRE_PAR,
    ')': T_FECHA_PAR,
    '[': T_ABRE_COL,
    ']': T_FECHA_COL,
};

// ─── Scanner Principal (AF) ───────────────────────────────────────────────
function scanner(entrada) {
    const buf = new Buffer(entrada);
    const tokens = [];
    const erros = [];

    // Ação: retornar token
    function retornar(cod, lexema, startLine, startCol, endLine, endCol, startIndex, endIndex) {
        tokens.push({
            cod,
            token: TOKEN_NOMES[cod],
            lexema,
            startLine, startCol,
            endLine, endCol,
            startIndex, endIndex,
        });
    }

    // Ação: registrar erro
    function erro(mensagem, startLine, startCol, endCol, index) {
        erros.push({ mensagem, line: startLine, col: startCol, endCol, index });
    }

    // ── Loop principal do AF ──
    while (!buf.eof()) {
        let estado = ESTADO.INICIO;
        let lexema = '';
        let startLine, startCol, startIndex;

        // ── Estado INICIO (q0) ──
        const c = buf.ler();
        if (c === null) break;

        // Whitespace: ignora e volta ao INICIO
        if (isWhitespace(c)) continue;

        const posInfo = buf.getInfoLeitura();
        startLine = posInfo.line;
        startCol  = posInfo.col;
        startIndex = posInfo.pos;

        // ── Transição: letra → estado IDENT (q1) ──
        if (isLetra(c)) {
            estado = ESTADO.IDENT;
            lexema = c;

            while (!buf.eof()) {
                const next = buf.ler();
                if (next !== null && (isLetra(next) || isDigito(next))) {
                    lexema += next;
                } else {
                    if (next !== null) buf.retroceder(); // devolve caractere não pertencente
                    break;
                }
            }

            // Estado final IDENT: verifica se é palavra reservada
            const lower = lexema.toLowerCase();
            const cod = PALAVRAS_RESERVADAS.has(lower) ? PALAVRAS_RESERVADAS.get(lower) : T_IDENTIFICADOR;
            retornar(cod, lexema, startLine, startCol, buf.line, buf.col - 1, startIndex, buf.pos - 1);
            continue;
        }

        // ── Transição: dígito → estado NUMERO (q2) ──
        if (isDigito(c)) {
            estado = ESTADO.NUMERO;
            lexema = c;

            while (!buf.eof()) {
                const next = buf.ler();
                if (next !== null && isDigito(next)) {
                    lexema += next;
                } else {
                    if (next !== null) buf.retroceder(); // devolve caractere não pertencente
                    break;
                }
            }

            // Estado final NUMERO
            retornar(T_NUMERO, lexema, startLine, startCol, buf.line, buf.col - 1, startIndex, buf.pos - 1);
            continue;
        }

        // ── Transição: ':' → estado DOIS_PTS (q3) ──
        if (c === ':') {
            estado = ESTADO.DOIS_PTS;
            const next = buf.lookahead();

            if (next === '=') {
                buf.ler(); // consome '='
                // Estado final: ':=' → ATRIBUICAO
                retornar(T_ATRIBUICAO, ':=', startLine, startCol, buf.line, buf.col - 1, startIndex, buf.pos - 1);
            } else {
                // Estado final: ':' → DOIS_PONTOS (sem retroceder, ':' é o token completo)
                retornar(T_DOIS_PONTOS, ':', startLine, startCol, startLine, startCol, startIndex, startIndex);
            }
            continue;
        }

        // ── Transição: '<' → estado MENOR_Q (q4) ──
        if (c === '<') {
            estado = ESTADO.MENOR_Q;
            const next = buf.lookahead();

            if (next === '>') {
                buf.ler();
                retornar(T_DIFERENTE, '<>', startLine, startCol, buf.line, buf.col - 1, startIndex, buf.pos - 1);
            } else if (next === '=') {
                buf.ler();
                retornar(T_MENOR_IGUAL, '<=', startLine, startCol, buf.line, buf.col - 1, startIndex, buf.pos - 1);
            } else {
                // Estado final: '<' → MENOR (sem retroceder)
                retornar(T_MENOR, '<', startLine, startCol, startLine, startCol, startIndex, startIndex);
            }
            continue;
        }

        // ── Transição: '>' → estado MAIOR_Q (q5) ──
        if (c === '>') {
            estado = ESTADO.MAIOR_Q;
            const next = buf.lookahead();

            if (next === '=') {
                buf.ler();
                retornar(T_MAIOR_IGUAL, '>=', startLine, startCol, buf.line, buf.col - 1, startIndex, buf.pos - 1);
            } else {
                retornar(T_MAIOR, '>', startLine, startCol, startLine, startCol, startIndex, startIndex);
            }
            continue;
        }

        // ── Transição: '/' → estado BARRA_Q (q6) ──
        if (c === '/') {
            estado = ESTADO.BARRA_Q;
            const next = buf.lookahead();

            if (next === '/') {
                buf.ler();
                // Transição para COMENT_LINHA (q8)
                estado = ESTADO.COMENT_LINHA;
                while (!buf.eof()) {
                    const ch = buf.ler();
                    if (ch === '\n') break;
                }
                // Comentário ignorado, volta ao INICIO
            } else {
                // '/' sozinho não é token válido na LALG
                erro(`caractere inválido '/'`, startLine, startCol, startCol, startIndex);
            }
            continue;
        }

        // ── Transição: '{' → estado COMENT_BLOCO (q7) ──
        if (c === '{') {
            estado = ESTADO.COMENT_BLOCO;
            let fechou = false;

            while (!buf.eof()) {
                const ch = buf.ler();
                if (ch === '}') {
                    fechou = true;
                    break;
                }
            }

            if (!fechou) {
                // Estado de ERRO: comentário não fechado
                erro("comentário de bloco '{' não fechado", startLine, startCol, startCol, startIndex);
            }
            continue;
        }

        // ── Transição: '}' sem '{' → ERRO ──
        if (c === '}') {
            erro("'}' sem '{' correspondente", startLine, startCol, startCol, startIndex);
            continue;
        }

        // ── Transição: operadores/delimitadores simples → estado final direto ──
        if (c in SIMPLES_MAP) {
            const cod = SIMPLES_MAP[c];
            retornar(cod, c, startLine, startCol, startLine, startCol, startIndex, startIndex);
            continue;
        }

        // ── Estado de ERRO: caractere inválido ──
        erro(`caractere inválido '${c}'`, startLine, startCol, startCol, startIndex);
    }

    return {
        tokens: tokens.map(t => ({
            token: t.token,
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

// ─── Tabela de Símbolos ────────────────────────────────────────────────────
function buildTabelaSimbolos(tokens) {
    const tabela = new Map();
    for (const t of tokens) {
        if (t.cod === T_IDENTIFICADOR) {
            const nome = t.lexema;
            if (!tabela.has(nome)) {
                tabela.set(nome, { nome, linhas: [], ocorrencias: 0 });
            }
            const entry = tabela.get(nome);
            entry.ocorrencias++;
            if (!entry.linhas.includes(t.startLine)) {
                entry.linhas.push(t.startLine);
            }
        }
    }
    return tabela;
}

// ─── Estatísticas ──────────────────────────────────────────────────────────
function buildEstatisticas(tokens) {
    const stats = {
        "Palavras Reservadas": 0,
        "Identificadores": 0,
        "Números": 0,
        "Operadores Relacionais": 0,
        "Operadores Aritméticos": 0,
        "Atribuição": 0,
        "Delimitadores": 0,
    };
    for (const t of tokens) {
        const cat = getTokenCategoria(t.cod);
        if (cat in stats) stats[cat]++;
    }
    return stats;
}

// ─── Syntax Highlight ──────────────────────────────────────────────────────
// Erros da última compilação (usado pelo highlight para marcadores inline)
let _ultimosErros = [];

function highlightCode(code, erros) {
    const PALAVRAS_RE = /\b(program|begin|end|procedure|var|if|then|else|while|do|not|or|and|div|read|write|true|false|int|boolean)\b/gi;
    const NUMERO_RE = /\b\d+\b/g;
    const COMENTARIO_BLOCO_RE = /\{[^}]*\}/g;
    const COMENTARIO_LINHA_RE = /\/\/[^\n]*/g;
    const OP_RE = /(:=|<>|<=|>=|[+\-*=<>])/g;

    const spans = [];

    function addSpans(regex, cls) {
        let m;
        while ((m = regex.exec(code)) !== null) {
            spans.push({ start: m.index, end: m.index + m[0].length, cls, text: m[0] });
        }
    }

    addSpans(COMENTARIO_BLOCO_RE, "hl-comment");
    addSpans(COMENTARIO_LINHA_RE, "hl-comment");
    addSpans(PALAVRAS_RE, "hl-keyword");
    addSpans(NUMERO_RE, "hl-number");
    addSpans(OP_RE, "hl-operator");

    // Marcadores de erro inline
    const errosParaMarcacao = erros || _ultimosErros;
    if (errosParaMarcacao && errosParaMarcacao.length > 0) {
        for (const e of errosParaMarcacao) {
            if (e.index != null && e.index >= 0 && e.index < code.length) {
                spans.push({
                    start: e.index,
                    end: e.index + 1,
                    cls: "hl-error",
                    text: code[e.index],
                });
            }
        }
    }

    // Erros têm prioridade máxima, depois comentários
    const comentarios = spans.filter(s => s.cls === "hl-comment");
    const erroSpans = spans.filter(s => s.cls === "hl-error");
    const filtrados = spans.filter(s => {
        if (s.cls === "hl-error") return true;
        if (s.cls === "hl-comment") return !erroSpans.some(e => s.start <= e.start && s.end >= e.end);
        return !comentarios.some(c => s.start >= c.start && s.end <= c.end)
            && !erroSpans.some(e => s.start <= e.start && s.end >= e.end);
    });

    filtrados.sort((a, b) => a.start - b.start || b.end - a.end);

    // Remove sobreposições (mantém o primeiro — erros ficam por cima)
    const final = [];
    let lastEnd = 0;
    for (const s of filtrados) {
        if (s.start >= lastEnd) {
            final.push(s);
            lastEnd = s.end;
        }
    }

    let result = '';
    let pos = 0;
    for (const s of final) {
        if (s.start > pos) {
            result += escapeHtml(code.substring(pos, s.start));
        }
        result += `<span class="${s.cls}">${escapeHtml(s.text)}</span>`;
        pos = s.end;
    }
    if (pos < code.length) {
        result += escapeHtml(code.substring(pos));
    }

    return result;
}

// ─── Utilitários de Renderização ───────────────────────────────────────────
function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
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

function renderErrorItem(erro, entrada, idx) {
    let posLabel = '\u2014';
    if (erro.line != null) {
        posLabel = (erro.endCol != null && erro.endCol !== erro.col)
            ? `${erro.line}:${erro.col}-${erro.endCol}`
            : `${erro.line}:${erro.col}`;
    }
    const dataIdx = (erro.index != null) ? ` data-error-index="${erro.index}"` : '';
    let html = `<div class="error-item error-clickable"${dataIdx}>`;
    html += '<span class="material-symbols-rounded">error</span>';
    html += '<div class="error-body">';
    html += `<div class="error-header"><span class="error-pos">${posLabel}</span><span class="error-msg">ERRO LÉXICO: ${escapeHtml(erro.mensagem)}</span></div>`;

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

// ─── Inicialização da Interface ────────────────────────────────────────────
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
    const highlightOverlay = document.getElementById("highlightOverlay");

    // ── Syntax Highlight em tempo real ──
    function updateHighlight(erros) {
        highlightOverlay.innerHTML = highlightCode(inputExpr.value, erros) + '\n';
    }

    function updateLineNumbers() {
        const lines = inputExpr.value.split("\n").length;
        lineNumbers.textContent = Array.from({ length: lines }, (_, i) => i + 1).join("\n");
    }

    function syncScroll() {
        highlightOverlay.scrollTop = inputExpr.scrollTop;
        highlightOverlay.scrollLeft = inputExpr.scrollLeft;
        lineNumbers.scrollTop = inputExpr.scrollTop;
    }

    inputExpr.addEventListener("input", () => {
        updateLineNumbers();
        updateHighlight();
    });
    inputExpr.addEventListener("scroll", syncScroll);

    const btnTokenizar = document.getElementById("btnTokenizar");
    const btnLimpar = document.getElementById("btnLimpar");
    const btnExemplo = document.getElementById("btnExemplo");
    const btnCarregar = document.getElementById("btnCarregar");
    const fileInput = document.getElementById("fileInput");
    const btnSalvar = document.getElementById("btnSalvar");
    const resultArea = document.getElementById("resultArea");
    const errorArea = document.getElementById("errorArea");
    const simbolosArea = document.getElementById("simbolosArea");
    const estatisticasArea = document.getElementById("estatisticasArea");
    const tokenCountBadge = document.getElementById("tokenCount");
    const errorCountBadge = document.getElementById("errorCount");
    const simbolosCountBadge = document.getElementById("simbolosCount");

    let ultimoResultado = null;

    function switchToTab(tabName) {
        outputTabs.forEach(t => t.classList.remove("active"));
        outputContents.forEach(c => c.classList.remove("active"));
        document.querySelector(`[data-output="${tabName}"]`).classList.add("active");
        document.getElementById(tabName).classList.add("active");
    }

    // ── Carregar Exemplo ──
    btnExemplo.addEventListener("click", () => {
        inputExpr.value = CODIGO_EXEMPLO;
        updateLineNumbers();
        updateHighlight();
    });

    // ── Limpar ──
    btnLimpar.addEventListener("click", () => {
        inputExpr.value = "";
        _ultimosErros = [];
        updateLineNumbers();
        updateHighlight([]);
        resultArea.innerHTML = '<p class="empty-state"><span class="material-symbols-rounded">info</span>Pressione <strong>Compilar</strong> para analisar o código LALG</p>';
        errorArea.innerHTML = '';
        simbolosArea.innerHTML = "";
        estatisticasArea.innerHTML = "";
        tokenCountBadge.textContent = "0";
        errorCountBadge.textContent = "0";
        simbolosCountBadge.textContent = "0";
        ultimoResultado = null;
    });

    // ── Carregar Arquivo ──
    btnCarregar.addEventListener("click", () => {
        fileInput.click();
    });

    fileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            inputExpr.value = ev.target.result;
            updateLineNumbers();
            updateHighlight();
        };
        reader.readAsText(file, 'UTF-8');
        fileInput.value = ''; // permite recarregar o mesmo arquivo
    });

    // ── Salvar Código Fonte ──
    btnSalvar.addEventListener("click", () => {
        const code = inputExpr.value;
        if (code.trim() === '') return;
        const blob = new Blob([code], { type: "text/plain;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "codigo_lalg.txt";
        link.click();
        URL.revokeObjectURL(url);
    });

    // ── Compilar ──
    btnTokenizar.addEventListener("click", () => {
        resultArea.innerHTML = "";
        errorArea.innerHTML = "";
        simbolosArea.innerHTML = "";
        estatisticasArea.innerHTML = "";
        tokenCountBadge.textContent = "0";
        errorCountBadge.textContent = "0";
        simbolosCountBadge.textContent = "0";
        ultimoResultado = null;

        const expr = inputExpr.value;
        if (expr.trim() === "") return;

        const resultado = scanner(expr);
        const tokens = resultado.tokens;
        const erros = resultado.erros;
        ultimoResultado = resultado;

        tokenCountBadge.textContent = tokens.length;
        errorCountBadge.textContent = erros.length;

        // ── Tabela de Tokens ──
        if (tokens.length > 0) {
            let html = '<p class="section-title">Tabela de análise léxica</p>';
            html += "<table class='token-table'>";
            html += "<thead><tr><th>Nº</th><th>Lexema</th><th>Token</th><th>Categoria</th><th>Linha</th><th>Col. Ini</th><th>Col. Fim</th></tr></thead><tbody>";
            tokens.forEach((t, idx) => {
                const categoria = getTokenCategoria(t.cod);
                html += `<tr class="token-row" data-start="${t.startIndex}" data-end="${t.endIndex}">`;
                html += `<td>${idx + 1}</td>`;
                html += `<td><code style="font-family: 'JetBrains Mono', monospace">${escapeHtml(t.lexema)}</code></td>`;
                html += `<td><strong>${t.token}</strong></td>`;
                html += `<td><span class="cat-badge cat-${categoria.toLowerCase().replace(/\s+/g, '-')}">${categoria}</span></td>`;
                html += `<td class="col-pos">${t.startLine}</td>`;
                html += `<td class="col-pos">${t.startCol}</td>`;
                html += `<td class="col-pos">${t.endCol}</td>`;
                html += `</tr>`;
            });
            html += "</tbody></table>";
            resultArea.innerHTML = html;

            // Clique em linha da tabela destaca no editor
            resultArea.querySelectorAll(".token-row").forEach(row => {
                row.addEventListener("click", () => {
                    const start = parseInt(row.dataset.start);
                    const end = parseInt(row.dataset.end);
                    inputExpr.focus();
                    inputExpr.setSelectionRange(start, end + 1);
                    // Highlight visual da linha
                    resultArea.querySelectorAll(".token-row").forEach(r => r.classList.remove("selected"));
                    row.classList.add("selected");
                });
            });
        } else {
            resultArea.innerHTML = '<p class="empty-state"><span class="material-symbols-rounded">info</span>Nenhum token encontrado.</p>';
        }

        // ── Tabela de Símbolos ──
        const tabelaSim = buildTabelaSimbolos(tokens);
        simbolosCountBadge.textContent = tabelaSim.size;

        if (tabelaSim.size > 0) {
            let shtml = '<p class="section-title">Tabela de Símbolos</p>';
            shtml += "<table class='token-table'>";
            shtml += "<thead><tr><th>Nº</th><th>Identificador</th><th>Ocorrências</th><th>Linhas</th></tr></thead><tbody>";
            let idx = 1;
            for (const [, entry] of tabelaSim) {
                shtml += `<tr>`;
                shtml += `<td>${idx++}</td>`;
                shtml += `<td><code style="font-family: 'JetBrains Mono', monospace">${escapeHtml(entry.nome)}</code></td>`;
                shtml += `<td class="col-pos">${entry.ocorrencias}</td>`;
                shtml += `<td class="col-pos">${entry.linhas.join(', ')}</td>`;
                shtml += `</tr>`;
            }
            shtml += "</tbody></table>";
            simbolosArea.innerHTML = shtml;
        } else {
            simbolosArea.innerHTML = '<p class="empty-state"><span class="material-symbols-rounded">info</span>Nenhum identificador encontrado.</p>';
        }

        // ── Estatísticas ──
        const stats = buildEstatisticas(tokens);
        let ehtml = '<p class="section-title">Estatísticas de Tokens</p>';
        ehtml += '<div class="stats-grid">';
        for (const [cat, count] of Object.entries(stats)) {
            if (count > 0) {
                const pct = ((count / tokens.length) * 100).toFixed(1);
                ehtml += `<div class="stat-card">`;
                ehtml += `<div class="stat-value">${count}</div>`;
                ehtml += `<div class="stat-label">${cat}</div>`;
                ehtml += `<div class="stat-bar"><div class="stat-bar-fill" style="width: ${pct}%"></div></div>`;
                ehtml += `<div class="stat-pct">${pct}%</div>`;
                ehtml += `</div>`;
            }
        }
        ehtml += `<div class="stat-card stat-total">`;
        ehtml += `<div class="stat-value">${tokens.length}</div>`;
        ehtml += `<div class="stat-label">Total de Tokens</div>`;
        ehtml += `</div>`;
        ehtml += '</div>';
        estatisticasArea.innerHTML = ehtml;

        // ── Erros ──
        _ultimosErros = erros;
        updateHighlight(erros);

        if (erros.length > 0) {
            let errHtml = `<div class="error-summary">`;
            errHtml += `<span class="material-symbols-rounded">warning</span>`;
            errHtml += `<span>${erros.length} erro${erros.length > 1 ? 's' : ''} léxico${erros.length > 1 ? 's' : ''} encontrado${erros.length > 1 ? 's' : ''}</span>`;
            errHtml += `</div>`;
            erros.forEach((e, i) => { errHtml += renderErrorItem(e, expr, i); });
            errorArea.innerHTML = errHtml;

            // Clique em erro: seleciona posição no editor
            errorArea.querySelectorAll('.error-clickable').forEach(item => {
                item.addEventListener('click', () => {
                    const idx = parseInt(item.dataset.errorIndex);
                    if (!isNaN(idx)) {
                        inputExpr.focus();
                        inputExpr.setSelectionRange(idx, idx + 1);
                    }
                });
            });

            switchToTab("outputErros");
        } else {
            errorArea.innerHTML = '<p class="empty-state"><span class="material-symbols-rounded">check_circle</span>Nenhum erro léxico encontrado.</p>';
            switchToTab("outputTokens");
        }
    });
});
