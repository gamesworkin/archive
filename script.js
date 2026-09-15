const searchForm = document.getElementById('searchForm');
const searchInput = document.getElementById('searchInput');
const resultsSection = document.getElementById('resultsSection');
const paginationSection = document.getElementById('paginationSection');
const loading = document.getElementById('loading');

// Elementos do Modal
const itemModal = document.getElementById('itemModal');
const closeModal = document.getElementById('closeModal');
const modalLoading = document.getElementById('modalLoading');
const modalContent = document.getElementById('modalContent');
const modalThumb = document.getElementById('modalThumb');
const modalMediaType = document.getElementById('modalMediaType');
const modalTitle = document.getElementById('modalTitle');
const modalDate = document.getElementById('modalDate');
const modalDescription = document.getElementById('modalDescription');
const modalFilesList = document.getElementById('modalFilesList');

let currentQuery = '';
let currentPage = 1;
const rowsPerPage = 15;
const maxVisiblePages = 5;

const FALLBACK_LOGO = 'https://archive.org/images/glogo.png';

searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = searchInput.value.trim();
    if (!query) return;

    currentQuery = query;
    currentPage = 1;
    fetchResults(currentPage);
});

async function fetchResults(page) {
    resultsSection.innerHTML = '';
    paginationSection.classList.add('hidden');
    loading.classList.remove('hidden');

    try {
        const encodedQuery = encodeURIComponent(currentQuery);
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

        docs.forEach(item => {
            const title = item.title || item.identifier;
            const description = item.description || 'Nenhuma descrição disponível para este item.';
            const date = item.date ? item.date.substring(0, 4) : 'Data não informada';
            const mediaType = item.mediatype ? capitalize(item.mediatype) : 'Item';
            const thumbUrl = `https://archive.org/services/img/${item.identifier}`;

            const card = document.createElement('div');
            card.className = 'result-card';
            
            card.innerHTML = `
                <div class="result-thumbnail">
                    <img src="${thumbUrl}" alt="Capa" loading="lazy" onerror="this.onerror=null; this.src='${FALLBACK_LOGO}'; this.classList.add('fallback-logo');">
                </div>
                <div class="result-content">
                    <div class="result-header">
                        <h2 class="result-title">${escapeHtml(title)}</h2>
                    </div>
                    <div class="result-meta">
                        <span>Tipo: ${escapeHtml(mediaType)}</span>
                        <span>Ano: ${escapeHtml(date)}</span>
                    </div>
                    <p class="result-description">${escapeHtml(stripHtml(description))}</p>
                </div>
            `;

            // Ao clicar no card, abre o modal interno com as informações completas
            card.addEventListener('click', () => {
                openModal(item.identifier, title, mediaType, date, description, thumbUrl);
            });

            resultsSection.appendChild(card);
        });

        const maxApiPages = Math.min(Math.ceil(totalFound / rowsPerPage), 100);
        if (maxApiPages > 1) {
            renderPagination(page, maxApiPages);
            paginationSection.classList.remove('hidden');
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (error) {
        loading.classList.add('hidden');
        resultsSection.innerHTML = `<div class="no-results">Ocorreu um erro ao realizar a pesquisa. Tente novamente mais tarde.</div>`;
        console.error('Erro na busca do Archive:', error);
    }
}

// Lógica para Abrir e Preencher o Modal Internamente
async function openModal(identifier, title, mediaType, date, description, thumbUrl) {
    // Exibe o modal e o estado de carregamento interno
    itemModal.classList.remove('hidden');
    modalLoading.classList.remove('hidden');
    modalContent.classList.add('hidden');

    // Preenche dados básicos iniciais
    modalTitle.textContent = title;
    modalMediaType.textContent = mediaType;
    modalDate.textContent = `Ano: ${date}`;
    modalDescription.textContent = stripHtml(description);
    
    modalThumb.src = thumbUrl;
    modalThumb.className = 'modal-thumb';
    modalThumb.onerror = function() {
        this.onerror = null;
        this.src = FALLBACK_LOGO;
        this.classList.add('fallback-logo');
    };

    modalFilesList.innerHTML = '';

    try {
        // Busca a API de metadados completa do item para obter a lista de arquivos para download
        const metaUrl = `https://archive.org/metadata/${identifier}`;
        const response = await fetch(metaUrl);
        const data = await response.json();

        modalLoading.classList.add('hidden');
        modalContent.classList.remove('hidden');

        if (data && data.files && data.files.length > 0) {
            const server = data.server || '';
            const dir = data.dir || '';

            data.files.forEach(file => {
                const fileName = file.name;
                const fileFormat = file.format || 'Arquivo';
                const fileSize = file.size ? formatBytes(file.size) : '';
                
                // Monta o link direto de download do servidor do archive.org
                const downloadUrl = `https://${server}${dir}/${fileName}`;

                const fileItem = document.createElement('div');
                fileItem.className = 'file-item';

                fileItem.innerHTML = `
                    <div class="file-info">
                        <span class="file-name" title="${escapeHtml(fileName)}">${escapeHtml(fileName)}</span>
                        <span class="file-meta">${escapeHtml(fileFormat)} ${fileSize ? '• ' + fileSize : ''}</span>
                    </div>
                    <a href="${downloadUrl}" class="file-download-btn" download target="_blank" rel="noopener noreferrer">Baixar</a>
                `;

                modalFilesList.appendChild(fileItem);
            });
        } else {
            modalFilesList.innerHTML = '<div class="file-item"><span class="file-name">Nenhum arquivo direto disponível para download.</span></div>';
        }

    } catch (error) {
        modalLoading.classList.add('hidden');
        modalContent.classList.remove('hidden');
        modalFilesList.innerHTML = '<div class="file-item"><span class="file-name">Erro ao carregar arquivos para download.</span></div>';
        console.error('Erro ao buscar metadados do item:', error);
    }
}

// Fechar Modal
closeModal.addEventListener('click', () => {
    itemModal.classList.add('hidden');
});

// Fechar modal ao clicar fora da caixa central
itemModal.addEventListener('click', (e) => {
    if (e.target === itemModal) {
        itemModal.classList.add('hidden');
    }
});

// Fechar modal ao apertar a tecla ESC
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !itemModal.classList.contains('hidden')) {
        itemModal.classList.add('hidden');
    }
});

function renderPagination(page, totalPages) {
    paginationSection.innerHTML = '';

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

    let startPage = Math.max(1, page - Math.floor(maxVisiblePages / 2));
    let endPage = startPage + maxVisiblePages - 1;

    if (endPage > totalPages) {
        endPage = totalPages;
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

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

// Funções utilitárias
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

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
