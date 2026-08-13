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
        return declaracoes.reduce((total, declaracao) => total + (declaracao.identificadores?.length ?? 0), 0);
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
            posLabel = erro.endLine != null && erro.endLine !== erro.line
                ? `${erro.line}:${erro.col}-${erro.endLine}:${erro.endCol}`
                : ((erro.endCol != null && erro.endCol !== erro.col)
                    ? `${erro.line}:${erro.col}-${erro.endCol}`
                    : `${erro.line}:${erro.col}`);
        }

        const dataIdx = erro.index != null ? ` data-error-index="${erro.index}"` : "";
        const dataEndIdx = erro.endIndex != null ? ` data-error-end-index="${erro.endIndex}"` : "";
        let html = `<div class="error-item error-clickable"${dataIdx}${dataEndIdx}>`;
        html += '<span class="material-symbols-rounded">error</span>';
        html += '<div class="error-body">';
        html += `<div class="error-header"><span class="error-pos">${posLabel}</span><span class="error-msg">ERRO L\u00c9XICO: ${escapeHtml(erro.mensagem)}</span></div>`;

        if (erro.index != null) {
            const comprimento = Math.max(1, (erro.endIndex ?? erro.index) - erro.index + 1);
            html += renderErrorContextRange(entrada, erro.index, comprimento);
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

        let html = '<p class="section-title">\u00cdndice de identificadores</p>';
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
                ? "Programa aceito pelo analisador sint\u00e1tico."
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

        if (declaracoes.length === 0) {
            const mensagem = resultado.ok
                ? "Nenhuma declara\u00e7\u00e3o de vari\u00e1vel foi encontrada."
                : "Nenhuma declara\u00e7\u00e3o de vari\u00e1vel foi reconhecida antes da recupera\u00e7\u00e3o.";
            html += `<p class="empty-state"><span class="material-symbols-rounded">info</span>${mensagem}</p>`;
            html += "</section>";
            return html;
        }

        html += "<table class='token-table declaration-table'>";
        html += "<thead><tr><th>N\u00ba</th><th>Tipo</th><th>Identificadores</th><th>Linha</th><th>Qtd. IDs</th><th>Situa\u00e7\u00e3o</th></tr></thead><tbody>";

        declaracoes.forEach((declaracao, idx) => {
            const linha = declaracao.tipo?.posicao?.linha ?? "-";
            const tipoNome = declaracao.tipo?.nome ?? "-";
            const identificadores = declaracao.identificadores ?? [];
            html += "<tr>";
            html += `<td>${idx + 1}</td>`;
            html += `<td><span class="cat-badge cat-identificador">${escapeHtml(tipoNome)}</span></td>`;
            html += '<td><div class="identifier-chip-list">';
            identificadores.forEach((identificador) => {
                html += `<span class="identifier-chip"><code>${escapeHtml(identificador.lexema)}</code></span>`;
            });
            html += "</div></td>";
            html += `<td class="col-pos">${linha}</td>`;
            html += `<td class="col-pos">${identificadores.length}</td>`;
            html += `<td><span class="status-chip ${resultado.ok ? "success" : "neutral"}">Reconhecida</span></td>`;
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
        const erros = resultado.erros?.length ? resultado.erros : [resultado.erro].filter(Boolean);
        let html = "<div class=\"error-summary\">";
        html += "<span class=\"material-symbols-rounded\">warning</span>";
        html += `<span>${erros.length} erro${erros.length > 1 ? "s" : ""} ${etapa.toLowerCase()} encontrado${erros.length > 1 ? "s" : ""}</span>`;
        html += "</div>";

        if (resultado.etapa === "lexico") {
            erros.forEach((erro) => {
                html += renderErrorItem(erro, entrada);
            });
            return html;
        }

        erros.forEach((erro) => {
            const token = erro?.detalhe?.encontrado;
            const posicao = token?.startLine != null && token?.startCol != null ? `${token.startLine}:${token.startCol}` : "\u2014";
            const erroMsg = escapeHtml(
                String(erro?.message ?? "Erro sint\u00e1tico").replace(/^Erro sintático:\s*/i, "")
            );
            const errorIndexAttr = token?.startIndex != null
                ? ` data-error-index="${token.startIndex}" data-error-end-index="${token.endIndex ?? token.startIndex}"`
                : "";

            html += `<div class="error-item error-clickable"${errorIndexAttr}>`;
            html += "<span class=\"material-symbols-rounded\">error</span>";
            html += "<div class=\"error-body\">";
            html += `<div class="error-header"><span class="error-pos">${posicao}</span><span class="error-msg">ERRO ${etapa}: ${erroMsg}</span></div>`;

            if (token?.lexema && token.lexema !== "<EOF>") {
                html += renderErrorContextRange(entrada, token.startIndex, token.lexema.length);
            }

            html += "</div></div>";
        });

        return html;
    }

    function renderSemanticoResumoArea(resultado) {
        const bloqueada = Boolean(resultado?.bloqueada);
        const statusTexto = !resultado
            ? "Aguardando"
            : (bloqueada
                ? `Bloqueada por erro ${resultado.etapa === "lexico" ? "léxico" : "sintático"}`
                : (resultado.ok ? "Válida" : "Inválida"));
        const statusClasse = !resultado
            ? "neutral"
            : ((!bloqueada && resultado.ok) ? "success" : "error");
        const statusAuxiliar = !resultado
            ? "Compile um programa para executar as verificações semânticas."
            : (bloqueada
                ? "A etapa semântica não foi executada porque a análise anterior encontrou erros."
                : (resultado.ok
                    ? "Programa semanticamente válido."
                    : "Foram encontradas inconsistências semânticas."));
        const totalSimbolos = resultado?.tabelaSimbolos?.length ?? 0;
        const totalEscopos = resultado?.escopos?.length ?? 0;
        const totalErros = resultado?.erros?.length ?? 0;
        const totalAvisos = resultado?.avisos?.length ?? 0;

        let html = '<section class="result-section">';
        html += renderSectionHeader("Resumo semântico");
        html += '<div class="summary-grid">';

        html += '<article class="summary-card status-card">';
        html += '<p class="summary-label">Status</p>';
        html += `<div class="summary-value-row"><span class="status-chip ${statusClasse}">${escapeHtml(statusTexto)}</span></div>`;
        html += `<p class="summary-meta">${escapeHtml(statusAuxiliar)}</p>`;
        html += "</article>";

        [
            ["Símbolos", totalSimbolos, "Entradas visíveis na tabela semântica."],
            ["Escopos", totalEscopos, "Escopos léxicos construídos na análise."],
            ["Erros", totalErros, "Erros da etapa que determinou o resultado."],
            ["Avisos", totalAvisos, "Avisos não tornam o programa inválido."],
        ].forEach(([titulo, total, descricao]) => {
            html += '<article class="summary-card">';
            html += `<p class="summary-label">${titulo}</p>`;
            html += `<p class="summary-number">${total}</p>`;
            html += `<p class="summary-meta">${descricao}</p>`;
            html += "</article>";
        });

        html += "</div></section>";
        return html;
    }

    function renderSemanticoSimbolosArea(resultado) {
        let html = '<section class="result-section">';
        html += renderSectionHeader("Tabela de símbolos", pluralizar(resultado?.tabelaSimbolos?.length ?? 0, "símbolo"));

        if (!resultado) {
            html += '<p class="empty-state"><span class="material-symbols-rounded">info</span>Compile um programa para construir a tabela de símbolos.</p>';
            return `${html}</section>`;
        }
        if (resultado.bloqueada) {
            html += '<p class="empty-state"><span class="material-symbols-rounded">block</span>Tabela indisponível: a análise semântica foi bloqueada pela etapa anterior.</p>';
            return `${html}</section>`;
        }
        if ((resultado.tabelaSimbolos?.length ?? 0) === 0) {
            html += '<p class="empty-state"><span class="material-symbols-rounded">info</span>Nenhum símbolo foi declarado.</p>';
            return `${html}</section>`;
        }

        html += "<table class='token-table declaration-table'>";
        html += "<thead><tr><th>Nome</th><th>Categoria</th><th>Tipo</th><th>Valor</th><th>Escopo</th><th>end_rel</th><th>Modo</th><th>Declaração</th><th>Utilizada</th><th>Parâmetros</th></tr></thead><tbody>";
        resultado.tabelaSimbolos.forEach((simbolo) => {
            const posicao = simbolo.linha != null ? `${simbolo.linha}:${simbolo.coluna}` : "pré-declarado";
            const modo = simbolo.modoParametro === "referencia" ? "var (referência)" : (simbolo.modoParametro ?? "—");
            const parametros = (simbolo.parametros ?? [])
                .map((parametro) => `${parametro.nome}: ${parametro.tipo}${parametro.modo === "referencia" ? " (var)" : ""}`)
                .join(", ") || "—";
            const utilizada = simbolo.preDeclarado ? "pré-declarado" : (simbolo.utilizada ? "sim" : "não");
            html += "<tr>";
            html += `<td><code>${escapeHtml(simbolo.nome)}</code></td>`;
            html += `<td><span class="cat-badge cat-identificador">${escapeHtml(simbolo.categoria)}</span></td>`;
            html += `<td>${escapeHtml(simbolo.tipo ?? "—")}</td>`;
            html += `<td>${escapeHtml(simbolo.valor == null ? "—" : String(simbolo.valor))}</td>`;
            html += `<td>${escapeHtml(simbolo.escopo ?? "—")}</td>`;
            html += `<td class="col-pos">${escapeHtml(String(simbolo.end_rel ?? "—"))}</td>`;
            html += `<td>${escapeHtml(modo)}</td>`;
            html += `<td class="col-pos">${escapeHtml(posicao)}</td>`;
            html += `<td>${escapeHtml(utilizada)}</td>`;
            html += `<td><code>${escapeHtml(parametros)}</code></td>`;
            html += "</tr>";
        });
        html += "</tbody></table></section>";
        return html;
    }

    function renderSemanticoEscoposArea(resultado) {
        let html = '<section class="result-section">';
        html += renderSectionHeader("Escopos", pluralizar(resultado?.escopos?.length ?? 0, "escopo"));

        if (!resultado) {
            html += '<p class="empty-state"><span class="material-symbols-rounded">info</span>Compile um programa para visualizar os escopos.</p>';
            return `${html}</section>`;
        }
        if (resultado.bloqueada) {
            html += '<p class="empty-state"><span class="material-symbols-rounded">block</span>Escopos indisponíveis: a análise semântica não foi executada.</p>';
            return `${html}</section>`;
        }

        html += "<table class='token-table declaration-table'>";
        html += "<thead><tr><th>Nome</th><th>Tipo</th><th>Escopo pai</th><th>Símbolos</th></tr></thead><tbody>";
        (resultado.escopos ?? []).forEach((escopo) => {
            html += "<tr>";
            html += `<td><code>${escapeHtml(escopo.nome)}</code></td>`;
            html += `<td>${escapeHtml(escopo.tipo)}</td>`;
            html += `<td>${escapeHtml(escopo.pai ?? "—")}</td>`;
            html += '<td><div class="identifier-chip-list">';
            (escopo.simbolos ?? []).forEach((simbolo) => {
                html += `<span class="identifier-chip"><code>${escapeHtml(simbolo.nome)}</code></span>`;
            });
            html += "</div></td></tr>";
        });
        html += "</tbody></table></section>";
        return html;
    }

    function renderDiagnosticosSemanticos(diagnosticos, entrada, rotulo, classeItem = "error-item") {
        if (diagnosticos.length === 0) {
            const vazio = rotulo === "AVISO" ? "Nenhum aviso semântico encontrado." : "Nenhum erro semântico encontrado.";
            return `<p class="empty-state"><span class="material-symbols-rounded">check_circle</span>${vazio}</p>`;
        }

        const plural = diagnosticos.length === 1 ? "encontrado" : "encontrados";
        const resumoClasse = rotulo === "AVISO" ? "warning-summary" : "error-summary";
        const icone = rotulo === "AVISO" ? "warning" : "error";
        let html = `<div class="${resumoClasse}"><span class="material-symbols-rounded">${icone}</span><span>${diagnosticos.length} ${rotulo.toLowerCase()}${diagnosticos.length === 1 ? "" : "s"} ${plural}</span></div>`;

        diagnosticos.forEach((diagnostico) => {
            const posicao = diagnostico.line != null && diagnostico.col != null ? `${diagnostico.line}:${diagnostico.col}` : "—";
            const inicio = diagnostico.index;
            const fim = diagnostico.endIndex ?? inicio;
            const comprimento = inicio != null && fim != null ? Math.max(1, fim - inicio + 1) : 1;
            const dataIndex = inicio != null ? ` data-error-index="${inicio}" data-error-end-index="${fim}"` : "";
            html += `<div class="${classeItem} error-clickable"${dataIndex}>`;
            html += `<span class="material-symbols-rounded">${icone}</span>`;
            html += '<div class="error-body">';
            const prefixoRepetido = rotulo === "AVISO" ? /^Aviso semântico:\s*/i : /^Erro semântico:\s*/i;
            const mensagem = String(diagnostico.message ?? "").replace(prefixoRepetido, "");
            html += `<div class="error-header"><span class="error-pos">${posicao}</span><span class="error-msg">${rotulo} SEMÂNTICO: ${escapeHtml(mensagem)}</span></div>`;
            html += renderErrorContextRange(entrada, inicio, comprimento);
            html += "</div></div>";
        });
        return html;
    }

    function renderSemanticoErroArea(resultado, entrada) {
        if (!resultado) {
            return '<p class="empty-state"><span class="material-symbols-rounded">info</span>Compile um programa para verificar erros.</p>';
        }
        if (resultado.bloqueada && resultado.etapa === "lexico") {
            return renderErrosArea(resultado.erros ?? [], entrada);
        }
        if (resultado.bloqueada && resultado.etapa === "sintatico") {
            return renderSintaticoErroArea(resultado, entrada);
        }
        return renderDiagnosticosSemanticos(resultado.erros ?? [], entrada, "ERRO");
    }

    function renderSemanticoAvisosArea(resultado, entrada) {
        if (!resultado) {
            return '<p class="empty-state"><span class="material-symbols-rounded">info</span>Compile um programa para verificar avisos.</p>';
        }
        if (resultado.bloqueada) {
            return '<p class="empty-state"><span class="material-symbols-rounded">block</span>Avisos indisponíveis: a análise semântica foi bloqueada.</p>';
        }
        return renderDiagnosticosSemanticos(resultado.avisos ?? [], entrada, "AVISO", "error-item warning-item");
    }

    function mensagemMepa(diagnostico, mensagemPadrao) {
        if (typeof diagnostico === "string") return diagnostico;
        return diagnostico?.message ?? diagnostico?.mensagem ?? mensagemPadrao;
    }

    function diagnosticosMepa(resultadoMepa) {
        const erros = (resultadoMepa?.erros ?? []).filter(Boolean);
        if (erros.length > 0) return erros;
        return resultadoMepa?.erro ? [resultadoMepa.erro] : [];
    }

    function contextoDiagnosticoMepa(diagnostico) {
        const instrucao = diagnostico?.instruction ?? diagnostico?.detalhes?.instruction ?? null;
        const pc = diagnostico?.pc ?? diagnostico?.detalhes?.pc ?? null;
        const opcode = diagnostico?.opcode ?? diagnostico?.detalhes?.opcode ?? instrucao?.opcode ?? null;
        const posicao = diagnostico?.sourcePosition
            ?? diagnostico?.detalhes?.sourcePosition
            ?? instrucao?.sourcePosition
            ?? diagnostico?.position
            ?? diagnostico?.detalhes?.position
            ?? null;
        const linha = posicao?.linha ?? posicao?.startLine ?? null;
        const coluna = posicao?.coluna ?? posicao?.startCol ?? null;
        const partes = [];
        if (pc != null) partes.push(`C[${pc}]`);
        if (opcode) partes.push(String(opcode));
        if (linha != null) partes.push(`linha ${linha}${coluna == null ? "" : `:${coluna}`}`);
        return partes.join(" · ");
    }

    function renderFalhaMepa(resultadoMepa, contexto) {
        const diagnosticos = diagnosticosMepa(resultadoMepa);
        const mensagens = diagnosticos.length > 0
            ? diagnosticos.map((diagnostico) => mensagemMepa(diagnostico, "Falha ao processar código MEPA."))
            : ["Falha ao processar código MEPA."];

        let html = '<div class="error-summary"><span class="material-symbols-rounded">error</span>';
        html += `<span>${escapeHtml(contexto)}</span></div>`;
        mensagens.forEach((mensagem, indice) => {
            const diagnostico = diagnosticos[indice] ?? null;
            const contextoDetalhado = contextoDiagnosticoMepa(diagnostico);
            html += '<div class="error-item">';
            html += '<span class="material-symbols-rounded">error</span>';
            html += '<div class="error-body"><div class="error-header">';
            if (contextoDetalhado) html += `<span class="error-pos">${escapeHtml(contextoDetalhado)}</span>`;
            html += `<span class="error-msg">${escapeHtml(mensagem)}</span></div></div>`;
            html += "</div>";
        });
        return html;
    }

    function formatarInstrucaoMepa(instrucao) {
        const rotulo = instrucao?.label == null || instrucao.label === ""
            ? ""
            : `${instrucao.label}: `;
        const opcode = instrucao?.opcode ?? "";
        const args = Array.isArray(instrucao?.args) ? instrucao.args : [];
        return [rotulo + opcode, ...args].filter((parte) => parte !== "").join(" ");
    }

    function obterTextoMepa(resultadoMepa) {
        if (typeof resultadoMepa?.codeText === "string") return resultadoMepa.codeText;
        return (resultadoMepa?.instructions ?? []).map(formatarInstrucaoMepa).join("\n");
    }

    function obterErroMepa(execucao, erroExecucao) {
        return erroExecucao ?? execucao?.error ?? null;
    }

    function obterPcMepa(execucao, erroExecucao) {
        if (Number.isInteger(execucao?.pc)) return execucao.pc;
        const pcDoErro = erroExecucao?.pc ?? erroExecucao?.detalhes?.pc;
        return Number.isInteger(pcDoErro) ? pcDoErro : null;
    }

    function obterInstrucoesMepa(resultadoMepa, execucao) {
        if (Array.isArray(execucao?.code)) return execucao.code;
        return Array.isArray(resultadoMepa?.instructions) ? resultadoMepa.instructions : [];
    }

    function formatarValorMepa(valor, valorPadrao = "—") {
        if (valor === undefined || valor === null) return valorPadrao;
        return String(valor);
    }

    function renderListaInstrucoesMepa(instructions, pcAtivo, erroExecucao = null) {
        if (!Array.isArray(instructions) || instructions.length === 0) {
            return '<p class="empty-state"><span class="material-symbols-rounded">info</span>Nenhuma instrução MEPA disponível.</p>';
        }

        const pcErro = obterPcMepa(null, erroExecucao);
        let html = '<div class="mepa-code mepa-code-list-container" role="region" aria-label="Área de código MEPA">';
        html += '<ol class="mepa-code-list">';
        instructions.forEach((instrucao, indice) => {
            const ativa = indice === pcAtivo;
            const comErro = indice === pcErro;
            const classes = ["mepa-code-line"];
            if (ativa) classes.push("active");
            if (comErro) classes.push("runtime-error");
            const ariaCurrent = ativa ? ' aria-current="true"' : "";
            html += `<li class="${classes.join(" ")}" data-mepa-pc="${indice}"${ariaCurrent}>`;
            html += `<span class="mepa-code-index">${indice}</span>`;
            html += `<code>${escapeHtml(formatarInstrucaoMepa(instrucao))}</code>`;
            html += "</li>";
        });
        html += "</ol></div>";
        return html;
    }

    function formatarPosicaoConstrutoFonte(posicao) {
        if (!posicao || typeof posicao !== "object") return "";
        const linha = posicao.linha ?? posicao.startLine ?? null;
        const coluna = posicao.coluna ?? posicao.startCol ?? null;
        if (linha == null) return "";
        return `linha ${linha}${coluna == null ? "" : `:${coluna}`}`;
    }

    function agruparInstrucoesPorConstrutoFonte(instructions) {
        const grupos = new Map();
        if (!Array.isArray(instructions)) return [];

        instructions.forEach((instrucao, indice) => {
            const construto = instrucao?.sourceConstruct;
            if (!construto || typeof construto !== "object" || typeof construto.id !== "string" || !construto.id) {
                return;
            }

            if (!grupos.has(construto.id)) {
                grupos.set(construto.id, {
                    id: construto.id,
                    kind: typeof construto.kind === "string" ? construto.kind : "Construto LALG",
                    label: typeof construto.label === "string" ? construto.label : "Origem LALG",
                    position: construto.position ?? null,
                    instructions: [],
                });
            }
            grupos.get(construto.id).instructions.push({ indice, instrucao });
        });

        return Array.from(grupos.values());
    }

    function renderMapeamentoFonteMepa(instructions) {
        const grupos = agruparInstrucoesPorConstrutoFonte(instructions);
        if (grupos.length === 0) return "";

        let html = '<details class="mepa-source-map">';
        html += '<summary><span>Relação LALG → MEPA</span>';
        html += `<span class="section-caption">${pluralizar(grupos.length, "construto", "construtos")}</span></summary>`;
        html += '<div class="mepa-source-map-groups">';
        grupos.forEach((grupo) => {
            const posicao = formatarPosicaoConstrutoFonte(grupo.position);
            html += '<article class="mepa-source-map-group">';
            html += '<div class="mepa-source-map-header">';
            html += `<span class="mepa-source-kind">${escapeHtml(grupo.kind)}</span>`;
            html += `<strong>${escapeHtml(grupo.label)}</strong>`;
            if (posicao) html += `<span class="mepa-source-position">${escapeHtml(posicao)}</span>`;
            html += "</div>";
            html += '<ol class="mepa-source-instructions">';
            grupo.instructions.forEach(({ indice, instrucao }) => {
                html += `<li><span>C[${indice}]</span><code>${escapeHtml(formatarInstrucaoMepa(instrucao))}</code></li>`;
            });
            html += "</ol></article>";
        });
        html += "</div></details>";
        return html;
    }

    function obterInstrucaoAtualMepa(execucao, erroExecucao) {
        if (execucao?.nextInstruction) return execucao.nextInstruction;
        const pc = obterPcMepa(execucao, erroExecucao);
        if (pc != null && Array.isArray(execucao?.code)) return execucao.code[pc] ?? null;
        return erroExecucao?.instruction ?? erroExecucao?.detalhes?.instruction ?? null;
    }

    function textoEstadoMepa(execucao, erroExecucao) {
        if (erroExecucao) return "Erro interrompeu a execução";
        if (execucao?.halted) return "Finalizada";
        if (Number(execucao?.steps ?? 0) > 0) return "Em execução";
        return "Pronta para executar";
    }

    function classeEstadoMepa(execucao, erroExecucao) {
        if (erroExecucao) return "error";
        if (execucao?.halted) return "success";
        return "neutral";
    }

    function renderMemoriaMepa(execucao) {
        const data = Array.isArray(execucao?.data) ? execucao.data : [];
        const sp = Number.isInteger(execucao?.sp) ? execucao.sp : -1;
        let html = '<section class="mepa-runtime-section mepa-memory-section">';
        html += renderSectionHeader("Área de dados D", sp >= 0 ? `topo s = ${sp}` : "pilha vazia");

        if (sp < 0) {
            html += '<p class="empty-state"><span class="material-symbols-rounded">layers_clear</span>Nenhuma célula ativa em D.</p>';
            html += "</section>";
            return html;
        }

        html += '<div class="mepa-memory-scroll"><table class="mepa-memory-table">';
        html += "<thead><tr><th>Posição</th><th>Valor</th><th>Marca</th></tr></thead><tbody>";
        for (let indice = 0; indice <= sp; indice += 1) {
            const ehTopo = indice === sp;
            html += `<tr class="${ehTopo ? "mepa-memory-top" : ""}">`;
            html += `<td>D[${indice}]</td>`;
            html += `<td><code>${escapeHtml(formatarValorMepa(data[indice]))}</code></td>`;
            html += `<td>${ehTopo ? '<span class="mepa-top-badge">topo s</span>' : ""}</td>`;
            html += "</tr>";
        }
        html += "</tbody></table></div></section>";
        return html;
    }

    function renderEntradaMepa(execucao) {
        const input = Array.isArray(execucao?.input) ? execucao.input : [];
        const inputPositionBruta = Number.isInteger(execucao?.inputPosition) ? execucao.inputPosition : 0;
        const inputPosition = Math.max(0, Math.min(inputPositionBruta, input.length));
        const entrada = input.length > 0 ? input.map((valor) => formatarValorMepa(valor, "")).join("\n") : "(nenhuma entrada)";
        let html = '<section class="mepa-runtime-section">';
        html += renderSectionHeader("Entrada", `Valores consumidos: ${inputPosition}/${input.length}`);
        html += `<p class="mepa-input-progress">Cursor de leitura: ${inputPosition}/${input.length}</p>`;
        html += `<pre class="mepa-runtime-input">${escapeHtml(entrada)}</pre>`;
        html += "</section>";
        return html;
    }

    function renderSaidaMepa(execucao) {
        const saida = typeof execucao?.outputText === "string"
            ? execucao.outputText
            : (Array.isArray(execucao?.output)
                ? execucao.output.map((item) => String(item)).join("")
                : String(execucao?.output ?? ""));
        let html = '<section class="mepa-runtime-section">';
        html += renderSectionHeader("Saída");
        html += `<pre class="mepa-output">${escapeHtml(saida || "(nenhuma saída)")}</pre>`;
        html += "</section>";
        return html;
    }

    function renderEstadoMaquinaMepa(execucao, erroExecucao) {
        const pc = obterPcMepa(execucao, erroExecucao);
        const sp = Number.isInteger(execucao?.sp) ? execucao.sp : -1;
        const instrucaoAtual = obterInstrucaoAtualMepa(execucao, erroExecucao);
        const instrucaoAnterior = execucao?.lastInstruction ?? null;
        const passos = execucao?.steps == null ? "—" : String(execucao.steps);
        const estado = textoEstadoMepa(execucao, erroExecucao);
        let html = '<section class="mepa-machine-state">';
        html += renderSectionHeader("Estado da máquina", `${passos} passo${passos === "1" ? "" : "s"}`);
        html += '<div class="mepa-state-cards">';
        html += '<article class="mepa-state-card mepa-current-instruction">';
        html += '<p class="mepa-state-label">Instrução atual</p>';
        html += `<code>${escapeHtml(instrucaoAtual ? formatarInstrucaoMepa(instrucaoAtual) : "—")}</code>`;
        html += "</article>";
        html += '<article class="mepa-state-card"><p class="mepa-state-label">Contador de programa</p>';
        html += `<p class="mepa-state-value">i = ${pc == null ? "—" : pc}</p></article>`;
        html += '<article class="mepa-state-card"><p class="mepa-state-label">Topo da pilha</p>';
        html += `<p class="mepa-state-value">s = ${sp}</p></article>`;
        html += '<article class="mepa-state-card"><p class="mepa-state-label">Estado</p>';
        html += `<span class="status-chip ${classeEstadoMepa(execucao, erroExecucao)}">${escapeHtml(estado)}</span></article>`;
        html += "</div>";
        if (instrucaoAnterior) {
            html += '<p class="mepa-last-instruction">Última executada: ';
            html += `<code>${escapeHtml(formatarInstrucaoMepa(instrucaoAnterior))}</code></p>`;
        }
        html += renderMemoriaMepa(execucao);
        html += "</section>";
        return html;
    }

    function renderMepaCodigoArea(resultadoMepa, execucao = null, erroExecucao = null) {
        if (!resultadoMepa) {
            return '<p class="empty-state"><span class="material-symbols-rounded">info</span>Compile um programa semanticamente válido para gerar o código MEPA.</p>';
        }
        if (!resultadoMepa.ok) {
            return renderFalhaMepa(resultadoMepa, "Geração MEPA indisponível.");
        }

        const instructions = obterInstrucoesMepa(resultadoMepa, execucao);
        const erro = obterErroMepa(execucao, erroExecucao);
        const pcAtivo = obterPcMepa(execucao, erro);
        let html = '<section class="result-section">';
        html += renderSectionHeader("Código MEPA", pluralizar(instructions.length, "instrução", "instruções"));
        html += renderListaInstrucoesMepa(instructions, pcAtivo, erro);
        html += renderMapeamentoFonteMepa(instructions);
        html += "</section>";
        return html;
    }

    function renderMepaExecucaoArea(resultadoMepa, execucao, erroExecucao) {
        if (!resultadoMepa) {
            return '<p class="empty-state"><span class="material-symbols-rounded">info</span>Compile um programa semanticamente válido antes de executar MEPA.</p>';
        }
        if (!resultadoMepa.ok) {
            return renderFalhaMepa(resultadoMepa, "Execução MEPA indisponível: a geração não foi concluída.");
        }
        const erro = obterErroMepa(execucao, erroExecucao);
        if (!execucao && !erro) {
            return '<p class="empty-state"><span class="material-symbols-rounded">play_circle</span>Código MEPA pronto. Informe a entrada, se necessária, e pressione Executar.</p>';
        }

        const snapshot = execucao ?? { error: erro };
        const instructions = obterInstrucoesMepa(resultadoMepa, snapshot);
        const pcAtivo = obterPcMepa(snapshot, erro);
        let html = '<section class="result-section mepa-runtime-panel">';
        html += renderSectionHeader("Execução MEPA", "C[i] → instrução → estado → próxima instrução");
        html += '<div class="mepa-runtime-grid">';
        html += '<section class="mepa-runtime-code">';
        html += renderSectionHeader("Código C", `${pluralizar(instructions.length, "instrução", "instruções")}`);
        html += renderListaInstrucoesMepa(instructions, pcAtivo, erro);
        html += "</section>";
        html += renderEstadoMaquinaMepa(snapshot, erro);
        html += "</div>";
        html += '<div class="mepa-runtime-io">';
        html += renderEntradaMepa(snapshot);
        html += renderSaidaMepa(snapshot);
        html += "</div>";
        if (erro) html += renderFalhaMepa({ erro }, "Erro de execução MEPA.");
        html += "</section>";
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
    LALG.renderSemanticoResumoArea = renderSemanticoResumoArea;
    LALG.renderSemanticoSimbolosArea = renderSemanticoSimbolosArea;
    LALG.renderSemanticoEscoposArea = renderSemanticoEscoposArea;
    LALG.renderSemanticoErroArea = renderSemanticoErroArea;
    LALG.renderSemanticoAvisosArea = renderSemanticoAvisosArea;
    LALG.renderMepaCodigoArea = renderMepaCodigoArea;
    LALG.renderMepaExecucaoArea = renderMepaExecucaoArea;
    LALG.getCategoriaCssClass = getCategoriaCssClass;
})();
