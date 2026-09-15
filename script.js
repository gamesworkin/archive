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

// Elementos do visualizador de arquivos compactados internos
const archiveContentSection = document.getElementById('archiveContentSection');
const archiveViewerTitle = document.getElementById('archiveViewerTitle');
const archiveFilesList = document.getElementById('archiveFilesList');
const backToFilesBtn = document.getElementById('backToFilesBtn');

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

async function openModal(identifier, title, mediaType, date, description, thumbUrl) {
    itemModal.classList.remove('hidden');
    modalLoading.classList.remove('hidden');
    modalContent.classList.add('hidden');
    archiveContentSection.classList.add('hidden');

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
        const metaUrl = `https://archive.org/metadata/${identifier}`;
        const response = await fetch(metaUrl);
        const data = await response.json();

        modalLoading.classList.add('hidden');
        modalContent.classList.remove('hidden');

        if (data && data.files && data.files.length > 0) {
            const server = data.server || '';
            const dir = data.dir || '';

            const mainFiles = data.files.filter(f => !f.name.endsWith('_meta.xml') && !f.name.endsWith('_reviews.xml'));

            mainFiles.forEach(file => {
                const fileName = file.name;
                const fileFormat = (file.format || '').toLowerCase();
                const fileSize = file.size ? formatBytes(file.size) : '';
                const downloadUrl = `https://${server}${dir}/${fileName}`;
                const lowerName = fileName.toLowerCase();

                const isCompressed = (
                    fileFormat.includes('zip') || 
                    fileFormat.includes('rar') || 
                    fileFormat.includes('7z') || 
                    fileFormat.includes('iso') || 
                    fileFormat.includes('tar') || 
                    fileFormat.includes('compressed') || 
                    fileFormat.includes('package') ||
                    lowerName.endsWith('.zip') || 
                    lowerName.endsWith('.rar') || 
                    lowerName.endsWith('.7z') || 
                    lowerName.endsWith('.iso') || 
                    lowerName.endsWith('.tar') || 
                    lowerName.endsWith('.tgz') || 
                    lowerName.endsWith('.gz')
                );

                const fileItem = document.createElement('div');
                fileItem.className = 'file-item';

                let actionsHtml = `<a href="${downloadUrl}" class="file-download-btn" download target="_blank" rel="noopener noreferrer">Baixar</a>`;

                if (isCompressed) {
                    actionsHtml = `
                        <div class="file-actions">
                            <button class="file-view-btn" data-filename="${escapeHtml(fileName)}">Ver conteúdo</button>
                            <a href="${downloadUrl}" class="file-download-btn" download target="_blank" rel="noopener noreferrer">Baixar</a>
                        </div>
                    `;
                }

                fileItem.innerHTML = `
                    <div class="file-info">
                        <span class="file-name" title="${escapeHtml(fileName)}">${escapeHtml(fileName)}</span>
                        <span class="file-meta">${escapeHtml(file.format || 'Arquivo')} ${fileSize ? '• ' + fileSize : ''}</span>
                    </div>
                    ${actionsHtml}
                `;

                const viewBtn = fileItem.querySelector('.file-view-btn');
                if (viewBtn) {
                    viewBtn.addEventListener('click', () => {
                        loadCompressedContent(server, dir, fileName, data.files);
                    });
                }

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

// Função corrigida para filtrar exatamente o conteúdo interno do arquivo compactado clicado
function loadCompressedContent(server, dir, archiveFileName, allFiles) {
    archiveViewerTitle.textContent = `Conteúdo de: ${archiveFileName}`;
    archiveFilesList.innerHTML = '';

    // Remove a extensão do arquivo principal para usar como prefixo de busca nos metadados do Archive
    const lastDotIndex = archiveFileName.lastIndexOf('.');
    const baseNameWithoutExt = lastDotIndex !== -1 ? archiveFileName.substring(0, lastDotIndex) : archiveFileName;

    // Filtra apenas os arquivos associados especificamente a este pacote/arquivo compactado
    const internalFiles = allFiles.filter(f => {
        if (f.name === archiveFileName || f.name.endsWith('_meta.xml') || f.name.endsWith('_reviews.xml')) {
            return false;
        }
        
        const fNameLower = f.name.toLowerCase();
        const baseLower = baseNameWithoutExt.toLowerCase();

        // Verifica se o nome do subarquivo começa com o nome base do arquivo compactado ou contém correlação direta
        return fNameLower.startsWith(baseLower) || f.name.includes(baseNameWithoutExt);
    });

    if (internalFiles.length > 0) {
        internalFiles.forEach(subFile => {
            const subName = subFile.name;
            const subSize = subFile.size ? formatBytes(subFile.size) : '';
            const subUrl = `https://${server}${dir}/${subName}`;

            const subItem = document.createElement('div');
            subItem.className = 'file-item';
            subItem.innerHTML = `
                <div class="file-info">
                    <span class="file-name" title="${escapeHtml(subName)}">${escapeHtml(subName)}</span>
                    <span class="file-meta">${escapeHtml(subFile.format || 'Arquivo interno')} ${subSize ? '• ' + subSize : ''}</span>
                </div>
                <a href="${subUrl}" class="file-download-btn" download target="_blank" rel="noopener noreferrer">Baixar</a>
            `;
            archiveFilesList.appendChild(subItem);
        });
    } else {
        const containerUrl = `https://${server}${dir}/${archiveFileName}`;
        const subItem = document.createElement('div');
        subItem.className = 'file-item';
        subItem.innerHTML = `
            <div class="file-info">
                <span class="file-name">Visualização interna detalhada indisponível para este arquivo específico</span>
                <span class="file-meta">Você pode baixar o arquivo completo abaixo</span>
            </div>
            <a href="${containerUrl}" class="file-download-btn" download target="_blank" rel="noopener noreferrer">Baixar Arquivo</a>
        `;
        archiveFilesList.appendChild(subItem);
    }

    modalFilesList.parentElement.classList.add('hidden');
    archiveContentSection.classList.remove('hidden');
}

backToFilesBtn.addEventListener('click', () => {
    archiveContentSection.classList.add('hidden');
    modalFilesList.parentElement.classList.remove('hidden');
});

closeModal.addEventListener('click', () => {
    itemModal.classList.add('hidden');
});

itemModal.addEventListener('click', (e) => {
    if (e.target === itemModal) {
        itemModal.classList.add('hidden');
    }
});

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
