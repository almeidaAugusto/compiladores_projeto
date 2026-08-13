(() => {
    const LALG = window.LALG = window.LALG || {};

    class Buffer {
        constructor(entrada) {
            this.entrada = entrada;
            this.pos = 0;
            this.line = 1;
            this.col = 1;
            this._ultimoFoiCR = false;
            this._anterior = null;
            this._ultimaLeitura = null;
        }

        ler() {
            if (this.pos >= this.entrada.length) return null;
            const c = this.entrada[this.pos];
            this._anterior = { pos: this.pos, line: this.line, col: this.col, ultimoFoiCR: this._ultimoFoiCR };
            this._ultimaLeitura = { pos: this.pos, line: this.line, col: this.col };
            this.pos++;
            if (c === "\r") {
                this.line++;
                this.col = 1;
                this._ultimoFoiCR = true;
            } else if (c === "\n") {
                if (!this._ultimoFoiCR) this.line++;
                this.col = 1;
            } else {
                this.col++;
            }
            if (c !== "\r") this._ultimoFoiCR = false;
            return c;
        }

        retroceder() {
            if (!this._anterior) return;
            this.pos = this._anterior.pos;
            this.line = this._anterior.line;
            this.col = this._anterior.col;
            this._ultimoFoiCR = this._anterior.ultimoFoiCR;
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
