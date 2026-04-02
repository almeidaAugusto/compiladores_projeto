(() => {
    const LALG = window.LALG = window.LALG || {};

    function isLetra(c) {
        return (c >= "a" && c <= "z") || (c >= "A" && c <= "Z") || c === "_";
    }

    function isDigito(c) {
        return c >= "0" && c <= "9";
    }

    function isWhitespace(c) {
        return c === " " || c === "\t" || c === "\n" || c === "\r";
    }

    LALG.isLetra = isLetra;
    LALG.isDigito = isDigito;
    LALG.isWhitespace = isWhitespace;
})();
