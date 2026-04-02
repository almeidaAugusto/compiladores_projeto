(() => {
    const LALG = window.LALG = window.LALG || {};

    class TokenStream {
        constructor(tokens) {
            this.tokens = tokens;
            this.pos = 0;
        }

        lookahead(offset = 0) {
            const index = this.pos + offset;
            if (index >= this.tokens.length) return this.tokens[this.tokens.length - 1];
            return this.tokens[index];
        }

        advance() {
            const atual = this.lookahead(0);
            if (this.pos < this.tokens.length - 1) {
                this.pos++;
            }
            return atual;
        }
    }

    LALG.TokenStream = TokenStream;
})();
