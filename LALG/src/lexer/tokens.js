(() => {
    const LALG = window.LALG = window.LALG || {};

    const TOKENS = Object.freeze({
        PROGRAM: 0,
        BEGIN: 1,
        END: 2,
        PROCEDURE: 3,
        VAR: 4,
        IF: 5,
        THEN: 6,
        ELSE: 7,
        WHILE: 8,
        DO: 9,
        NOT: 10,
        OR: 11,
        AND: 12,
        DIV: 13,
        READ: 14,
        WRITE: 15,
        TRUE: 16,
        FALSE: 17,
        INT: 18,
        BOOLEAN: 19,
        IDENTIFICADOR: 20,
        NUMERO: 21,
        ATRIBUICAO: 22,
        PONTO_VIRGULA: 23,
        PONTO_FINAL: 24,
        VIRGULA: 25,
        DOIS_PONTOS: 26,
        ABRE_PAR: 27,
        FECHA_PAR: 28,
        ABRE_COL: 29,
        FECHA_COL: 30,
        IGUAL: 31,
        DIFERENTE: 32,
        MENOR: 33,
        MENOR_IGUAL: 34,
        MAIOR: 35,
        MAIOR_IGUAL: 36,
        MAIS: 37,
        MENOS: 38,
        VEZES: 39,
    });

    const TOKEN_NOMES = {
        [TOKENS.PROGRAM]: "PROGRAM",
        [TOKENS.BEGIN]: "BEGIN",
        [TOKENS.END]: "END",
        [TOKENS.PROCEDURE]: "PROCEDURE",
        [TOKENS.VAR]: "VAR",
        [TOKENS.IF]: "IF",
        [TOKENS.THEN]: "THEN",
        [TOKENS.ELSE]: "ELSE",
        [TOKENS.WHILE]: "WHILE",
        [TOKENS.DO]: "DO",
        [TOKENS.NOT]: "NOT",
        [TOKENS.OR]: "OR",
        [TOKENS.AND]: "AND",
        [TOKENS.DIV]: "DIV",
        [TOKENS.READ]: "READ",
        [TOKENS.WRITE]: "WRITE",
        [TOKENS.TRUE]: "TRUE",
        [TOKENS.FALSE]: "FALSE",
        [TOKENS.INT]: "INT",
        [TOKENS.BOOLEAN]: "BOOLEAN",
        [TOKENS.IDENTIFICADOR]: "IDENTIFICADOR",
        [TOKENS.NUMERO]: "NUMERO",
        [TOKENS.ATRIBUICAO]: "ATRIBUICAO",
        [TOKENS.PONTO_VIRGULA]: "PONTO_VIRGULA",
        [TOKENS.PONTO_FINAL]: "PONTO_FINAL",
        [TOKENS.VIRGULA]: "VIRGULA",
        [TOKENS.DOIS_PONTOS]: "DOIS_PONTOS",
        [TOKENS.ABRE_PAR]: "ABRE_PAR",
        [TOKENS.FECHA_PAR]: "FECHA_PAR",
        [TOKENS.ABRE_COL]: "ABRE_COL",
        [TOKENS.FECHA_COL]: "FECHA_COL",
        [TOKENS.IGUAL]: "IGUAL",
        [TOKENS.DIFERENTE]: "DIFERENTE",
        [TOKENS.MENOR]: "MENOR",
        [TOKENS.MENOR_IGUAL]: "MENOR_IGUAL",
        [TOKENS.MAIOR]: "MAIOR",
        [TOKENS.MAIOR_IGUAL]: "MAIOR_IGUAL",
        [TOKENS.MAIS]: "MAIS",
        [TOKENS.MENOS]: "MENOS",
        [TOKENS.VEZES]: "VEZES",
    };

    const PALAVRAS_RESERVADAS = new Map([
        ["program", TOKENS.PROGRAM],
        ["begin", TOKENS.BEGIN],
        ["end", TOKENS.END],
        ["procedure", TOKENS.PROCEDURE],
        ["var", TOKENS.VAR],
        ["if", TOKENS.IF],
        ["then", TOKENS.THEN],
        ["else", TOKENS.ELSE],
        ["while", TOKENS.WHILE],
        ["do", TOKENS.DO],
        ["not", TOKENS.NOT],
        ["or", TOKENS.OR],
        ["and", TOKENS.AND],
        ["div", TOKENS.DIV],
        ["read", TOKENS.READ],
        ["write", TOKENS.WRITE],
        ["true", TOKENS.TRUE],
        ["false", TOKENS.FALSE],
        ["int", TOKENS.INT],
        ["boolean", TOKENS.BOOLEAN],
    ]);

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

    function getTokenCategoria(cod) {
        if (cod >= TOKENS.PROGRAM && cod <= TOKENS.BOOLEAN) return "Palavra Reservada";
        if (cod === TOKENS.IDENTIFICADOR) return "Identificador";
        if (cod === TOKENS.NUMERO) return "N\u00famero";
        if (cod === TOKENS.ATRIBUICAO) return "Atribui\u00e7\u00e3o";
        if (cod >= TOKENS.PONTO_VIRGULA && cod <= TOKENS.FECHA_COL) return "Delimitador";
        if (cod >= TOKENS.IGUAL && cod <= TOKENS.MAIOR_IGUAL) return "Operador Relacional";
        if (cod === TOKENS.MAIS || cod === TOKENS.MENOS || cod === TOKENS.VEZES) return "Operador Aritm\u00e9tico";
        return "Desconhecido";
    }

    LALG.TOKENS = TOKENS;
    LALG.TOKEN_NOMES = TOKEN_NOMES;
    LALG.PALAVRAS_RESERVADAS = PALAVRAS_RESERVADAS;
    LALG.CODIGO_EXEMPLO = CODIGO_EXEMPLO;
    LALG.getTokenCategoria = getTokenCategoria;
})();
