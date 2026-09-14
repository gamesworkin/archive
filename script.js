const searchForm = document.getElementById('searchForm');
const searchInput = document.getElementById('searchInput');
const resultsSection = document.getElementById('resultsSection');
const loading = document.getElementById('loading');

searchForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const query = searchInput.value.trim();
    
    if (!query) return;

    // Limpa resultados anteriores e exibe carregamento
    resultsSection.innerHTML = '';
    loading.classList.remove('hidden');

    try {
        // Monta a URL da API de busca avançada do Archive.org
        // Buscamos em título, descrição e assunto, limitando a 15 resultados em formato JSON
        const encodedQuery = encodeURIComponent(query);
        const url = `https://archive.org/advancedsearch.php?q=${encodedQuery}&fl[]=identifier,title,description,date,mediatype&rows=15&page=1&output=json`;

        const response = await fetch(url);
        const data = await response.json();
        
        loading.classList.add('hidden');

        const docs = data.response.docs;

        if (docs.length === 0) {
            resultsSection.innerHTML = `<div class="no-results">Nenhum resultado encontrado para "<strong>${escapeHtml(query)}</strong>". Tente outros termos.</div>`;
            return;
        }

        // Renderiza cada item encontrado
        docs.forEach(item => {
            const title = item.title || item.identifier;
            const description = item.description || 'Nenhuma descrição disponível para este item.';
            const date = item.date ? item.date.substring(0, 4) : 'Data não informada';
            const mediaType = item.mediatype ? capitalize(item.mediatype) : 'Item';
            
            // Link direto para abrir o item no archive.org numa nova aba
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

    } catch (error) {
        loading.classList.add('hidden');
        resultsSection.innerHTML = `<div class="no-results">Ocorreu um erro ao realizar a pesquisa. Tente novamente mais tarde.</div>`;
        console.error('Erro na busca do Archive:', error);
    }
});

// Funções utilitárias de segurança para evitar XSS básico
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
