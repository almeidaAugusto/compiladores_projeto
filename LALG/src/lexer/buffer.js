(() => {
    const LALG = window.LALG = window.LALG || {};

    class Buffer {
        constructor(entrada) {
            this.entrada = entrada;
            this.pos = 0;
            this.line = 1;
            this.col = 1;
            this._anterior = null;
            this._ultimaLeitura = null;
        }

        ler() {
            if (this.pos >= this.entrada.length) return null;
            const c = this.entrada[this.pos];
            this._anterior = { pos: this.pos, line: this.line, col: this.col };
            this._ultimaLeitura = { pos: this.pos, line: this.line, col: this.col };
            this.pos++;
            if (c === "\n") {
                this.line++;
                this.col = 1;
            } else {
                this.col++;
            }
            return c;
        }

        retroceder() {
            if (!this._anterior) return;
            this.pos = this._anterior.pos;
            this.line = this._anterior.line;
            this.col = this._anterior.col;
            this._anterior = null;
        }

        getInfoLeitura() {
            return this._ultimaLeitura;
        }

        lookahead() {
            if (this.pos >= this.entrada.length) return null;
            return this.entrada[this.pos];
        }

        eof() {
            return this.pos >= this.entrada.length;
        }
    }

    LALG.Buffer = Buffer;
})();
