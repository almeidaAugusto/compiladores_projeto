(() => {
    const LALG = window.LALG = window.LALG || {};
    const { escapeHtml, getErrorContext } = LALG;
    const EOF_TOKEN = "EOF";

    function getCategoriaCssClass(categoria) {
        return `cat-${categoria.toLowerCase().replace(/\s+/g, "-")}`;
    }

    function pluralizar(valor, singular, plural = `${singular}s`) {
        return `${valor} ${valor === 1 ? singular : plural}`;
    }

    function filtrarTokensVisiveis(tokens) {
        return tokens.filter((token) => token && token.token !== EOF_TOKEN && token.cod !== EOF_TOKEN);
    }

    function agruparTokensPorLinha(tokens) {
        const grupos = new Map();

        tokens.forEach((token) => {
            const linha = token.startLine ?? 0;
            if (!grupos.has(linha)) grupos.set(linha, []);
            grupos.get(linha).push(token);
        });

        return Array.from(grupos.entries()).sort((a, b) => a[0] - b[0]);
    }

    function contarIdentificadoresDeclaracoes(declaracoes) {
        return declaracoes.reduce((total, declaracao) => total + declaracao.identificadores.length, 0);
    }

    function renderErrorContextRange(entrada, startIndex, length = 1) {
        if (startIndex == null || startIndex < 0 || startIndex >= entrada.length) return "";

        const ctx = getErrorContext(entrada, startIndex);
        if (!ctx) return "";

        const safeLength = Math.max(1, Math.min(length, ctx.lineText.length - ctx.colInLine));
        const before = escapeHtml(ctx.lineText.substring(0, ctx.colInLine));
        const marked = escapeHtml(ctx.lineText.substring(ctx.colInLine, ctx.colInLine + safeLength));
        const after = escapeHtml(ctx.lineText.substring(ctx.colInLine + safeLength));

        return `<div class="error-context"><code>${before}<mark>${marked}</mark>${after}</code></div>`;
    }

    function renderSectionHeader(title, caption = "") {
        let html = '<div class="section-header">';
        html += `<p class="section-title">${escapeHtml(title)}</p>`;
        if (caption) {
            html += `<span class="section-caption">${escapeHtml(caption)}</span>`;
        }
        html += "</div>";
        return html;
    }

    function renderErrorItem(erro, entrada) {
        let posLabel = "\u2014";
        if (erro.line != null) {
            posLabel = (erro.endCol != null && erro.endCol !== erro.col)
                ? `${erro.line}:${erro.col}-${erro.endCol}`
                : `${erro.line}:${erro.col}`;
        }

        const dataIdx = erro.index != null ? ` data-error-index="${erro.index}"` : "";
        let html = `<div class="error-item error-clickable"${dataIdx}>`;
        html += '<span class="material-symbols-rounded">error</span>';
        html += '<div class="error-body">';
        html += `<div class="error-header"><span class="error-pos">${posLabel}</span><span class="error-msg">ERRO L\u00c9XICO: ${escapeHtml(erro.mensagem)}</span></div>`;

        if (erro.index != null) {
            const ctx = getErrorContext(entrada, erro.index);
            if (ctx) {
                const before = escapeHtml(ctx.lineText.substring(0, ctx.colInLine));
                const ch = escapeHtml(ctx.lineText[ctx.colInLine] || "");
                const after = escapeHtml(ctx.lineText.substring(ctx.colInLine + 1));
                html += `<div class="error-context"><code>${before}<mark>${ch}</mark>${after}</code></div>`;
            }
        }

        html += "</div></div>";
        return html;
    }

    function renderTokensArea(tokens, getTokenCategoria) {
        if (tokens.length === 0) {
            return '<p class="empty-state"><span class="material-symbols-rounded">info</span>Nenhum token encontrado.</p>';
        }

        let html = '<p class="section-title">Tabela de an\u00e1lise l\u00e9xica</p>';
        html += "<table class='token-table'>";
        html += "<thead><tr><th>N\u00ba</th><th>Lexema</th><th>Token</th><th>Categoria</th><th>Linha</th><th>Col. Ini</th><th>Col. Fim</th></tr></thead><tbody>";
        tokens.forEach((t, idx) => {
            const categoria = getTokenCategoria(t.cod);
            const categoriaClass = getCategoriaCssClass(categoria);
            html += `<tr class="token-row" data-start="${t.startIndex}" data-end="${t.endIndex}">`;
            html += `<td>${idx + 1}</td>`;
            html += `<td><code style="font-family: 'JetBrains Mono', monospace">${escapeHtml(t.lexema)}</code></td>`;
            html += `<td><strong>${t.token}</strong></td>`;
            html += `<td><span class="cat-badge ${categoriaClass}">${categoria}</span></td>`;
            html += `<td class="col-pos">${t.startLine}</td>`;
            html += `<td class="col-pos">${t.startCol}</td>`;
            html += `<td class="col-pos">${t.endCol}</td>`;
            html += "</tr>";
        });
        html += "</tbody></table>";
        return html;
    }

    function renderSimbolosArea(tabelaSimbolos) {
        if (tabelaSimbolos.size === 0) {
            return '<p class="empty-state"><span class="material-symbols-rounded">info</span>Nenhum identificador encontrado.</p>';
        }

        let html = '<p class="section-title">Tabela de S\u00edmbolos</p>';
        html += "<table class='token-table'>";
        html += "<thead><tr><th>N\u00ba</th><th>Identificador</th><th>Ocorr\u00eancias</th><th>Linhas</th></tr></thead><tbody>";
        let idx = 1;
        for (const [, entry] of tabelaSimbolos) {
            html += "<tr>";
            html += `<td>${idx++}</td>`;
            html += `<td><code style="font-family: 'JetBrains Mono', monospace">${escapeHtml(entry.nome)}</code></td>`;
            html += `<td class="col-pos">${entry.ocorrencias}</td>`;
            html += `<td class="col-pos">${entry.linhas.join(", ")}</td>`;
            html += "</tr>";
        }
        html += "</tbody></table>";
        return html;
    }

    function renderErrosArea(erros, entrada) {
        if (erros.length === 0) {
            return '<p class="empty-state"><span class="material-symbols-rounded">check_circle</span>Nenhum erro l\u00e9xico encontrado.</p>';
        }

        let html = "<div class=\"error-summary\">";
        html += "<span class=\"material-symbols-rounded\">warning</span>";
        html += `<span>${erros.length} erro${erros.length > 1 ? "s" : ""} l\u00e9xico${erros.length > 1 ? "s" : ""} encontrado${erros.length > 1 ? "s" : ""}</span>`;
        html += "</div>";
        erros.forEach((erro) => {
            html += renderErrorItem(erro, entrada);
        });
        return html;
    }

    function renderSintaticoResumoArea(resultado) {
        const declaracoes = resultado?.declaracoes ?? [];
        const totalIdentificadores = contarIdentificadoresDeclaracoes(declaracoes);
        const statusTexto = !resultado ? "Aguardando" : (resultado.ok ? "V\u00e1lida" : "Inv\u00e1lida");
        const statusClasse = !resultado ? "neutral" : (resultado.ok ? "success" : "error");
        const statusAuxiliar = !resultado
            ? "Execute a compila\u00e7\u00e3o para validar a entrada."
            : (resultado.ok
                ? "Declara\u00e7\u00f5es aceitas pelo analisador."
                : `Falha ${resultado.etapa === "lexico" ? "l\u00e9xica" : "sint\u00e1tica"} detectada.`);

        let html = '<section class="result-section">';
        html += renderSectionHeader("Resumo sint\u00e1tico");
        html += '<div class="summary-grid">';

        html += '<article class="summary-card status-card">';
        html += '<p class="summary-label">Status</p>';
        html += `<div class="summary-value-row"><span class="status-chip ${statusClasse}">${statusTexto}</span></div>`;
        html += `<p class="summary-meta">${escapeHtml(statusAuxiliar)}</p>`;
        html += "</article>";

        html += '<article class="summary-card">';
        html += '<p class="summary-label">Declara\u00e7\u00f5es</p>';
        html += `<p class="summary-number">${declaracoes.length}</p>`;
        html += '<p class="summary-meta">Total reconhecido na entrada atual.</p>';
        html += "</article>";

        html += '<article class="summary-card">';
        html += '<p class="summary-label">Identificadores</p>';
        html += `<p class="summary-number">${totalIdentificadores}</p>`;
        html += '<p class="summary-meta">Quantidade total de nomes declarados.</p>';
        html += "</article>";

        html += "</div>";
        html += "</section>";
        return html;
    }

    function renderSintaticoTokensArea(resultado, getTokenCategoria) {
        const tokens = filtrarTokensVisiveis(resultado?.resultadoLexico?.tokens ?? []);
        let html = '<section class="result-section">';
        html += renderSectionHeader("Sequ\u00eancia de tokens", pluralizar(tokens.length, "token"));

        if (!resultado) {
            html += '<p class="empty-state"><span class="material-symbols-rounded">info</span>Compile a entrada para visualizar a sequ\u00eancia de tokens.</p>';
            html += "</section>";
            return html;
        }

        if (tokens.length === 0) {
            html += '<p class="empty-state"><span class="material-symbols-rounded">info</span>Nenhum token dispon\u00edvel para exibir.</p>';
            html += "</section>";
            return html;
        }

        html += '<div class="token-sequence-groups">';
        agruparTokensPorLinha(tokens).forEach(([linha, grupo]) => {
            html += '<div class="token-line-group">';
            html += `<div class="token-line-label">Linha ${linha}</div>`;
            html += '<div class="token-chip-list">';

            grupo.forEach((token) => {
                const categoria = getTokenCategoria(token.cod);
                const categoriaClass = getCategoriaCssClass(categoria);
                html += `<div class="syntax-token-chip ${categoriaClass}">`;
                html += `<code class="syntax-token-lexeme">${escapeHtml(token.lexema)}</code>`;
                html += `<span class="syntax-token-meta">${escapeHtml(token.token)}</span>`;
                html += "</div>";
            });

            html += "</div>";
            html += "</div>";
        });
        html += "</div>";
        html += "</section>";
        return html;
    }

    function renderSintaticoDeclaracoesArea(resultado) {
        const declaracoes = resultado?.declaracoes ?? [];
        let html = '<section class="result-section">';
        html += renderSectionHeader("Declara\u00e7\u00f5es reconhecidas", pluralizar(declaracoes.length, "declara\u00e7\u00e3o", "declara\u00e7\u00f5es"));

        if (!resultado) {
            html += '<p class="empty-state"><span class="material-symbols-rounded">table_chart</span>Compile a entrada para preencher a tabela principal.</p>';
            html += "</section>";
            return html;
        }

        if (!resultado.ok) {
            html += '<p class="empty-state"><span class="material-symbols-rounded">warning</span>A tabela principal fica dispon\u00edvel apenas quando a entrada \u00e9 v\u00e1lida.</p>';
            html += "</section>";
            return html;
        }

        html += "<table class='token-table declaration-table'>";
        html += "<thead><tr><th>N\u00ba</th><th>Tipo</th><th>Identificadores</th><th>Linha</th><th>Qtd. IDs</th><th>Situa\u00e7\u00e3o</th></tr></thead><tbody>";

        declaracoes.forEach((declaracao, idx) => {
            const linha = declaracao.tipo?.posicao?.linha ?? "-";
            html += "<tr>";
            html += `<td>${idx + 1}</td>`;
            html += `<td><span class="cat-badge cat-palavra-reservada">${escapeHtml(declaracao.tipo.nome)}</span></td>`;
            html += '<td><div class="identifier-chip-list">';
            declaracao.identificadores.forEach((identificador) => {
                html += `<span class="identifier-chip"><code>${escapeHtml(identificador.lexema)}</code></span>`;
            });
            html += "</div></td>";
            html += `<td class="col-pos">${linha}</td>`;
            html += `<td class="col-pos">${declaracao.identificadores.length}</td>`;
            html += '<td><span class="status-chip success">Reconhecida</span></td>';
            html += "</tr>";
        });

        html += "</tbody></table>";
        html += "</section>";
        return html;
    }

    function renderSintaticoErroArea(resultado, entrada) {
        if (!resultado) {
            return '<p class="empty-state"><span class="material-symbols-rounded">info</span>Compile a entrada para verificar erros.</p>';
        }

        if (resultado.ok) {
            return '<p class="empty-state"><span class="material-symbols-rounded">check_circle</span>Nenhum erro encontrado.</p>';
        }

        const etapa = resultado.etapa === "lexico" ? "L\u00c9XICO" : "SINT\u00c1TICO";
        let html = "<div class=\"error-summary\">";
        html += "<span class=\"material-symbols-rounded\">warning</span>";
        html += `<span>1 erro ${etapa.toLowerCase()} encontrado</span>`;
        html += "</div>";

        if (resultado.etapa === "lexico") {
            html += renderErrorItem(resultado.erro, entrada);
            return html;
        }

        const token = resultado.erro?.detalhe?.encontrado;
        const posicao = token?.startLine != null && token?.startCol != null ? `${token.startLine}:${token.startCol}` : "\u2014";
        const erroMsg = escapeHtml(resultado.erro?.message ?? "Erro sint\u00e1tico");
        const errorIndexAttr = token?.startIndex != null ? ` data-error-index="${token.startIndex}"` : "";

        html += `<div class="error-item error-clickable"${errorIndexAttr}>`;
        html += "<span class=\"material-symbols-rounded\">error</span>";
        html += "<div class=\"error-body\">";
        html += `<div class="error-header"><span class="error-pos">${posicao}</span><span class="error-msg">ERRO ${etapa}: ${erroMsg}</span></div>`;

        if (token?.lexema && token.lexema !== "<EOF>") {
            html += renderErrorContextRange(entrada, token.startIndex, token.lexema.length);
        }

        html += "</div></div>";
        return html;
    }

    LALG.renderErrorItem = renderErrorItem;
    LALG.renderTokensArea = renderTokensArea;
    LALG.renderSimbolosArea = renderSimbolosArea;
    LALG.renderErrosArea = renderErrosArea;
    LALG.renderSintaticoResumoArea = renderSintaticoResumoArea;
    LALG.renderSintaticoTokensArea = renderSintaticoTokensArea;
    LALG.renderSintaticoDeclaracoesArea = renderSintaticoDeclaracoesArea;
    LALG.renderSintaticoErroArea = renderSintaticoErroArea;
    LALG.getCategoriaCssClass = getCategoriaCssClass;
})();
