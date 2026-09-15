const searchForm = document.getElementById('searchForm');
const searchInput = document.getElementById('searchInput');
const resultsSection = document.getElementById('resultsSection');
const paginationSection = document.getElementById('paginationSection');
const loading = document.getElementById('loading');

let currentQuery = '';
let currentPage = 1;
const rowsPerPage = 15; // Quantidade de itens por página
const maxVisiblePages = 5; // Quantos números de páginas mostrar por bloco

searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = searchInput.value.trim();
    if (!query) return;

    currentQuery = query;
    currentPage = 1; // Reseta para a primeira página na nova busca
    fetchResults(currentPage);
});

async function fetchResults(page) {
    resultsSection.innerHTML = '';
    paginationSection.classList.add('hidden');
    loading.classList.remove('hidden');

    try {
        const encodedQuery = encodeURIComponent(currentQuery);
        // O Archive.org usa parâmetro 'page' e 'rows'
        const url = `https://archive.org/advancedsearch.php?q=${encodedQuery}&fl[]=identifier,title,description,date,mediatype&rows=${rowsPerPage}&page=${page}&output=json`;

        const response = await fetch(url);
        const data = await response.json();
        
        loading.classList.add('hidden');

        const docs = data.response.docs;
        const totalFound = data.response.numFound || 0;

        if (docs.length === 0) {
            resultsSection.innerHTML = `<div class="no-results">Nenhum resultado encontrado para "<strong>${escapeHtml(currentQuery)}</strong>". Tente outros termos.</div>`;
            return;
        }

        // Renderiza os cards de resultados
        docs.forEach(item => {
            const title = item.title || item.identifier;
            const description = item.description || 'Nenhuma descrição disponível para este item.';
            const date = item.date ? item.date.substring(0, 4) : 'Data não informada';
            const mediaType = item.mediatype ? capitalize(item.mediatype) : 'Item';
            const itemUrl = `https://archive.org/details/${item.identifier}`;

            const card = document.createElement('div');
            card.className = 'result-card';
            
            card.innerHTML = `
                <div class="result-header">
                    <a href="${itemUrl}" target="_blank" rel="noopener noreferrer" class="result-title">${escapeHtml(title)}</a>
                </div>
                <div class="result-meta">
                    <span>Tipo: ${escapeHtml(mediaType)}</span>
                    <span>Ano: ${escapeHtml(date)}</span>
                </div>
                <p class="result-description">${escapeHtml(stripHtml(description))}</p>
            `;

            resultsSection.appendChild(card);
        });

        // Configura e exibe a paginação (limitando o total máximo para evitar estouro da API)
        const maxApiPages = Math.min(Math.ceil(totalFound / rowsPerPage), 100); // Limitado a 100 páginas para manter ótima performance
        if (maxApiPages > 1) {
            renderPagination(page, maxApiPages);
            paginationSection.classList.remove('hidden');
        }

        // Rola suavemente para o topo dos resultados ao trocar de página
        window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (error) {
        loading.classList.add('hidden');
        resultsSection.innerHTML = `<div class="no-results">Ocorreu um erro ao realizar a pesquisa. Tente novamente mais tarde.</div>`;
        console.error('Erro na busca do Archive:', error);
    }
}

function renderPagination(page, totalPages) {
    paginationSection.innerHTML = '';

    // Botão Anterior (<)
    const prevBtn = document.createElement('button');
    prevBtn.className = 'page-btn';
    prevBtn.innerHTML = '&lt;';
    prevBtn.disabled = page === 1;
    prevBtn.title = 'Página anterior';
    prevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            fetchResults(currentPage);
        }
    });
    paginationSection.appendChild(prevBtn);

    // Cálculo dos blocos de 5 páginas
    let startPage = Math.max(1, page - Math.floor(maxVisiblePages / 2));
    let endPage = startPage + maxVisiblePages - 1;

    if (endPage > totalPages) {
        endPage = totalPages;
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    // Indicador e reticências iniciais se necessário
    if (startPage > 1) {
        const firstPageBtn = document.createElement('button');
        firstPageBtn.className = 'page-btn';
        firstPageBtn.textContent = '1';
        firstPageBtn.addEventListener('click', () => {
            currentPage = 1;
            fetchResults(currentPage);
        });
        paginationSection.appendChild(firstPageBtn);

        if (startPage > 2) {
            const ellipsis = document.createElement('span');
            ellipsis.className = 'page-ellipsis';
            ellipsis.textContent = '...';
            paginationSection.appendChild(ellipsis);
        }
    }

    // Renderiza os números das páginas (máximo 5 por vez)
    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.className = `page-btn ${i === page ? 'active' : ''}`;
        pageBtn.textContent = i;
        pageBtn.addEventListener('click', () => {
            if (currentPage !== i) {
                currentPage = i;
                fetchResults(currentPage);
            }
        });
        paginationSection.appendChild(pageBtn);
    }

    // Reticências finais e última página se necessário
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            const ellipsis = document.createElement('span');
            ellipsis.className = 'page-ellipsis';
            ellipsis.textContent = '...';
            paginationSection.appendChild(ellipsis);
        }

        const lastPageBtn = document.createElement('button');
        lastPageBtn.className = 'page-btn';
        lastPageBtn.textContent = totalPages;
        lastPageBtn.addEventListener('click', () => {
            currentPage = totalPages;
            fetchResults(currentPage);
        });
        paginationSection.appendChild(lastPageBtn);
    }

    // Botão Próximo (>)
    const nextBtn = document.createElement('button');
    nextBtn.className = 'page-btn';
    nextBtn.innerHTML = '&gt;';
    nextBtn.disabled = page === totalPages;
    nextBtn.title = 'Próxima página';
    nextBtn.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            fetchResults(currentPage);
        }
    });
    paginationSection.appendChild(nextBtn);
}

// Funções utilitárias de segurança
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function stripHtml(html) {
    let tmp = document.implementation.createHTMLDocument('').body;
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
}

function capitalize(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}
