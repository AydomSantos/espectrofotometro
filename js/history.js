// Sistema de histórico para o espectrofotômetro
let measurementHistory = [];
const MAX_HISTORY_ITEMS = 100; // Limite máximo de itens no histórico
const HISTORY_STORAGE_KEY = 'spectrophotometer_history';

// Carregar histórico do localStorage
function loadHistory() {
    try {
        const savedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
        if (savedHistory) {
            measurementHistory = JSON.parse(savedHistory);
            console.log(`Histórico carregado: ${measurementHistory.length} itens`);
            return true;
        }
    } catch (error) {
        console.error('Erro ao carregar histórico:', error);
    }
    
    // Se não houver histórico ou ocorrer um erro, iniciar com array vazio
    measurementHistory = [];
    return false;
}

// Salvar histórico no localStorage
function saveHistory() {
    try {
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(measurementHistory));
        return true;
    } catch (error) {
        console.error('Erro ao salvar histórico:', error);
        return false;
    }
}

// Adicionar uma medição ao histórico
function addToHistory(sampleType, wavelength, absorbance, concentration = null) {
    // Criar objeto de medição
    const measurement = {
        id: Date.now(), // ID único baseado no timestamp
        timestamp: new Date().toISOString(),
        sampleType: sampleType,
        sampleName: getSampleName(sampleType),
        wavelength: wavelength,
        absorbance: absorbance,
        concentration: concentration
    };
    
    // Adicionar ao início do array (mais recente primeiro)
    measurementHistory.unshift(measurement);
    
    // Limitar o tamanho do histórico
    if (measurementHistory.length > MAX_HISTORY_ITEMS) {
        measurementHistory = measurementHistory.slice(0, MAX_HISTORY_ITEMS);
    }
    
    // Salvar no localStorage
    saveHistory();
    
    // Atualizar a interface
    updateHistoryUI();
    
    return measurement;
}

// Obter nome amigável para o tipo de amostra
function getSampleName(sampleType) {
    switch(sampleType) {
        case 'blank': return 'Blank';
        case 'sample1': return 'Amostra 1';
        case 'sample2': return 'Amostra 2';
        default: return sampleType;
    }
}

// Limpar todo o histórico
function clearHistory() {
    if (confirm('Tem certeza que deseja apagar todo o histórico de medições?')) {
        measurementHistory = [];
        saveHistory();
        updateHistoryUI();
        return true;
    }
    return false;
}

// Remover um item específico do histórico
function removeHistoryItem(id) {
    const index = measurementHistory.findIndex(item => item.id === id);
    if (index !== -1) {
        measurementHistory.splice(index, 1);
        saveHistory();
        updateHistoryUI();
        return true;
    }
    return false;
}

// Atualizar a interface do usuário com o histórico atual
function updateHistoryUI() {
    const historyContainer = document.getElementById('historyContainer');
    if (!historyContainer) return;
    
    // Limpar conteúdo atual
    historyContainer.innerHTML = '';
    
    // Verificar se há itens no histórico
    if (measurementHistory.length === 0) {
        historyContainer.innerHTML = `
            <div class="text-center py-4 text-gray-500">
                <i class="fas fa-history text-gray-300 text-2xl mb-2"></i>
                <p class="text-sm">Nenhuma medição no histórico</p>
            </div>
        `;
        return;
    }
    
    // Adicionar cada item do histórico
    measurementHistory.forEach(item => {
        const date = new Date(item.timestamp);
        const formattedDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
        
        const historyItem = document.createElement('div');
        historyItem.className = 'p-2 bg-gray-50 rounded flex justify-between items-center mb-2 group';
        historyItem.innerHTML = `
            <div>
                <div class="text-sm font-medium">${item.sampleName}</div>
                <div class="text-xs text-gray-500">${item.wavelength} nm - ${formattedDate}</div>
            </div>
            <div class="flex items-center">
                <div class="text-blue-600 font-medium mr-3">${item.absorbance.toFixed(3)}</div>
                <button class="delete-history-item text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" 
                        data-id="${item.id}" title="Remover item">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        historyContainer.appendChild(historyItem);
        
        // Adicionar event listener para o botão de exclusão
        const deleteBtn = historyItem.querySelector('.delete-history-item');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                const id = parseInt(this.getAttribute('data-id'));
                removeHistoryItem(id);
            });
        }
        
        // Tornar o item clicável para mostrar detalhes
        historyItem.addEventListener('click', function() {
            showHistoryItemDetails(item);
        });
    });
    
    // Adicionar botão para limpar histórico
    const clearButton = document.createElement('button');
    clearButton.className = 'text-xs text-red-500 hover:text-red-700 mt-2 flex items-center';
    clearButton.innerHTML = '<i class="fas fa-trash-alt mr-1"></i> Limpar histórico';
    clearButton.addEventListener('click', clearHistory);
    
    historyContainer.appendChild(clearButton);
}

// Mostrar detalhes de um item do histórico
function showHistoryItemDetails(item) {
    // Criar modal de detalhes
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.id = 'historyDetailModal';
    
    const date = new Date(item.timestamp);
    const formattedDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
    
    modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-semibold text-gray-800">Detalhes da Medição</h3>
                <button id="closeDetailModal" class="text-gray-500 hover:text-gray-700">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div class="space-y-3">
                <div>
                    <span class="text-sm text-gray-500">Amostra:</span>
                    <span class="font-medium">${item.sampleName}</span>
                </div>
                <div>
                    <span class="text-sm text-gray-500">Comprimento de onda:</span>
                    <span class="font-medium">${item.wavelength} nm</span>
                </div>
                <div>
                    <span class="text-sm text-gray-500">Absorbância:</span>
                    <span class="font-medium text-blue-600">${item.absorbance.toFixed(3)}</span>
                </div>
                ${item.concentration ? `
                <div>
                    <span class="text-sm text-gray-500">Concentração:</span>
                    <span class="font-medium">${item.concentration} mg/mL</span>
                </div>` : ''}
                <div>
                    <span class="text-sm text-gray-500">Data e hora:</span>
                    <span class="font-medium">${formattedDate}</span>
                </div>
            </div>
            
            <div class="mt-6 flex justify-end space-x-2">
                <button id="plotItemBtn" class="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200">
                    <i class="fas fa-chart-line mr-1"></i> Plotar
                </button>
                <button id="deleteItemBtn" class="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200">
                    <i class="fas fa-trash-alt mr-1"></i> Excluir
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Adicionar event listeners
    document.getElementById('closeDetailModal').addEventListener('click', function() {
        document.body.removeChild(modal);
    });
    
    document.getElementById('deleteItemBtn').addEventListener('click', function() {
        removeHistoryItem(item.id);
        document.body.removeChild(modal);
    });
    
    document.getElementById('plotItemBtn').addEventListener('click', function() {
        // Plotar o ponto no gráfico
        updateGraph(item.wavelength, item.absorbance);
        document.body.removeChild(modal);
    });
    
    // Fechar ao clicar fora do modal
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });
}

// Exportar histórico como CSV
function exportHistoryAsCSV() {
    if (measurementHistory.length === 0) {
        alert('Não há dados para exportar.');
        return;
    }
    
    // Criar cabeçalho CSV
    let csv = 'Data,Hora,Amostra,Comprimento de Onda (nm),Absorbância';
    if (measurementHistory.some(item => item.concentration)) {
        csv += ',Concentração (mg/mL)';
    }
    csv += '\n';
    
    // Adicionar linhas de dados
    measurementHistory.forEach(item => {
        const date = new Date(item.timestamp);
        const dateStr = date.toLocaleDateString();
        const timeStr = date.toLocaleTimeString();
        
        csv += `${dateStr},${timeStr},${item.sampleName},${item.wavelength},${item.absorbance.toFixed(3)}`;
        if (measurementHistory.some(item => item.concentration)) {
            csv += item.concentration ? `,${item.concentration}` : ',';
        }
        csv += '\n';
    });
    
    // Criar blob e link para download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    // Configurar link
    link.setAttribute('href', url);
    link.setAttribute('download', `espectrofotometro_historico_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    
    // Adicionar à página, clicar e remover
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Inicializar o sistema de histórico
document.addEventListener('DOMContentLoaded', function() {
    // Carregar histórico salvo
    loadHistory();
    
    // Atualizar a interface
    updateHistoryUI();
    
    // Adicionar botão de exportação
    const historyHeader = document.querySelector('.history-header');
    if (historyHeader) {
        const exportBtn = document.createElement('button');
        exportBtn.className = 'text-xs text-blue-500 hover:text-blue-700 flex items-center';
        exportBtn.innerHTML = '<i class="fas fa-download mr-1"></i> Exportar CSV';
        exportBtn.addEventListener('click', exportHistoryAsCSV);
        
        historyHeader.appendChild(exportBtn);
    }
});