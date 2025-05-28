// Variáveis globais e inicialização
let stream = null;
let currentSampleType = null;
let isMeasuring = false;
let currentCamera = 'environment';
let captureBlankBtn, captureStandardBtn, resetReferencesBtn;
let blankStatus, standardStatus, illuminationAlert;
let standardModal, knownAbsorbanceInput, confirmStandardBtn, cancelStandardBtn;
let dismissAlertBtn;
let hasBlankReference = false;
let hasStandardReference = false;
let isOpenCVReady = false;
let processingCanvas, processingCtx;

// Elementos DOM
let cameraFeed, measureBtn, switchCameraBtn, wavelengthSlider;
let currentWavelength, resultWavelength, absorbanceValue, currentSample;
let sampleWells, absorbanceGraph;

document.addEventListener('DOMContentLoaded', function() {
    // Inicializar elementos DOM
    cameraFeed = document.getElementById('cameraFeed');
    measureBtn = document.getElementById('measureBtn');
    switchCameraBtn = document.getElementById('switchCameraBtn');
    wavelengthSlider = document.getElementById('wavelengthSlider');
    currentWavelength = document.getElementById('currentWavelength');
    resultWavelength = document.getElementById('resultWavelength');
    absorbanceValue = document.getElementById('absorbanceValue');
    currentSample = document.getElementById('currentSample');
    sampleWells = document.querySelectorAll('.sample-well');
    absorbanceGraph = document.getElementById('absorbanceGraph');
    
    // Inicializar novos elementos DOM para calibração
    captureBlankBtn = document.getElementById('captureBlankBtn');
    captureStandardBtn = document.getElementById('captureStandardBtn');
    resetReferencesBtn = document.getElementById('resetReferencesBtn');
    blankStatus = document.getElementById('blankStatus');
    standardStatus = document.getElementById('standardStatus');
    illuminationAlert = document.getElementById('illuminationAlert');
    standardModal = document.getElementById('standardModal');
    knownAbsorbanceInput = document.getElementById('knownAbsorbance');
    confirmStandardBtn = document.getElementById('confirmStandardBtn');
    cancelStandardBtn = document.getElementById('cancelStandardBtn');
    dismissAlertBtn = document.getElementById('dismissAlertBtn');
    
    // Inicializar câmera
    initCamera(currentCamera);
    
    // Event listeners
    setupEventListeners();
    setupCalibrationListeners();
    
    // Inicializar gráfico
    initGraph();
    
    // Inicializar OpenCV
    initOpenCV();
});

function setupEventListeners() {
    wavelengthSlider.addEventListener('input', function() {
        const wavelength = this.value;
        currentWavelength.textContent = `${wavelength} nm`;
        resultWavelength.textContent = wavelength;
        
        // Simular mudança de cor no alvo
        const hue = wavelengthToHue(wavelength);
        document.getElementById('targetArea').style.borderColor = `hsl(${hue}, 100%, 70%)`;
    });
    
    measureBtn.addEventListener('click', measureAbsorbance);
    
    switchCameraBtn.addEventListener('click', function() {
        currentCamera = currentCamera === 'user' ? 'environment' : 'user';
        initCamera(currentCamera);
    });
    
    sampleWells.forEach(well => {
        well.addEventListener('click', function() {
            sampleWells.forEach(w => w.classList.remove('active'));
            this.classList.add('active');
            currentSampleType = this.dataset.sample;
            currentSample.textContent = this.dataset.sample === 'blank' ? 'Blank' : 
                                      this.dataset.sample === 'sample1' ? 'Amostra 1' : 'Amostra 2';
        });
    });
}

function setupCalibrationListeners() {
    // Capturar blank
    if (captureBlankBtn) {
        captureBlankBtn.addEventListener('click', function() {
            const wavelength = parseInt(wavelengthSlider.value);
            
            if (isOpenCVReady && cameraFeed.readyState === 4) {
                if (captureBlankReference(cameraFeed, wavelength)) {
                    updateBlankStatus(wavelength, true);
                    hasBlankReference = true;
                    
                    // Esconder alerta de iluminação se estiver visível
                    illuminationAlert.classList.add('hidden');
                } else {
                    alert('Falha ao capturar referência de blank. Verifique se a câmera está funcionando corretamente.');
                }
            } else {
                alert('OpenCV não está pronto ou a câmera não está inicializada.');
            }
        });
    }
    
    // Abrir modal para capturar padrão
    if (captureStandardBtn) {
        captureStandardBtn.addEventListener('click', function() {
            if (!hasBlankReference) {
                alert('Capture uma referência de blank antes de capturar um padrão.');
                return;
            }
            
            standardModal.classList.remove('hidden');
        });
    }
    
    // Confirmar captura de padrão
    if (confirmStandardBtn) {
        confirmStandardBtn.addEventListener('click', function() {
            const wavelength = parseInt(wavelengthSlider.value);
            const knownAbsorbance = parseFloat(knownAbsorbanceInput.value);
            
            if (isNaN(knownAbsorbance) || knownAbsorbance < 0 || knownAbsorbance > 2) {
                alert('Por favor, informe um valor de absorbância válido entre 0 e 2.');
                return;
            }
            
            if (isOpenCVReady && cameraFeed.readyState === 4) {
                if (captureStandardReference(cameraFeed, wavelength, knownAbsorbance)) {
                    updateStandardStatus(wavelength, knownAbsorbance);
                    hasStandardReference = true;
                    standardModal.classList.add('hidden');
                } else {
                    alert('Falha ao capturar referência padrão. Verifique se a câmera está funcionando corretamente.');
                }
            } else {
                alert('OpenCV não está pronto ou a câmera não está inicializada.');
            }
        });
    }
    
    // Cancelar captura de padrão
    if (cancelStandardBtn) {
        cancelStandardBtn.addEventListener('click', function() {
            standardModal.classList.add('hidden');
        });
    }
    
    // Resetar referências
    if (resetReferencesBtn) {
        resetReferencesBtn.addEventListener('click', function() {
            // Limpar todas as referências
            blankReferences = {};
            standardReferences = {};
            hasBlankReference = false;
            hasStandardReference = false;
            
            // Atualizar status
            updateBlankStatus(null, false);
            updateStandardStatus(null, null);
            
            // Esconder alerta de iluminação
            illuminationAlert.classList.add('hidden');
        });
    }
    
    // Dispensar alerta de iluminação
    if (dismissAlertBtn) {
        dismissAlertBtn.addEventListener('click', function() {
            illuminationAlert.classList.add('hidden');
        });
    }
    
    // Atualizar status quando o comprimento de onda mudar
    wavelengthSlider.addEventListener('change', function() {
        const wavelength = parseInt(this.value);
        updateCalibrationStatus(wavelength);
    });
}

function updateBlankStatus(wavelength, hasReference) {
    if (!blankStatus) return;
    
    if (hasReference) {
        blankStatus.innerHTML = `
            <span class="inline-block w-2 h-2 rounded-full bg-green-500 mr-1"></span>
            Blank: Calibrado para ${wavelength}nm
        `;
    } else {
        blankStatus.innerHTML = `
            <span class="inline-block w-2 h-2 rounded-full bg-gray-300 mr-1"></span>
            Blank: Não calibrado
        `;
    }
}

function updateStandardStatus(wavelength, absorbance) {
    if (!standardStatus) return;
    
    if (wavelength && absorbance !== null) {
        standardStatus.innerHTML = `
            <span class="inline-block w-2 h-2 rounded-full bg-green-500 mr-1"></span>
            Padrão: Calibrado para ${wavelength}nm (${absorbance.toFixed(2)} A)
        `;
    } else {
        standardStatus.innerHTML = `
            <span class="inline-block w-2 h-2 rounded-full bg-gray-300 mr-1"></span>
            Padrão: Não calibrado
        `;
    }
}

function measureAbsorbance() {
    if (!currentSampleType) {
        alert('Selecione uma amostra primeiro');
        return;
    }
    
    if (isMeasuring) return;
    
    // Verificar se a câmera está ativa
    if (!isCameraActive) {
        alert('A câmera não está ativa. Verifique se a câmera está conectada e funcionando corretamente.');
        return;
    }
    
    // Verificar se o OpenCV está pronto
    if (!isOpenCVReady) {
        alert('O OpenCV ainda não está pronto. Aguarde o carregamento completo.');
        return;
    }
    
    isMeasuring = true;
    measureBtn.classList.add('measuring');
    measureBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Medindo...';
    
    // Obter o comprimento de onda atual
    const wavelength = parseInt(wavelengthSlider.value);
    
    // Realizar medição
    setTimeout(() => {
        // Verificar novamente se a câmera ainda está ativa
        if (!isCameraActive) {
            alert('A câmera foi desconectada durante a medição. Tente novamente.');
            isMeasuring = false;
            measureBtn.classList.remove('measuring');
            measureBtn.innerHTML = '<i class="fas fa-play mr-2"></i> Medir absorbância';
            return;
        }
        
        // Realizar a medição real
        const absorbance = measureRealAbsorbance(cameraFeed, wavelength, currentSampleType);
        
        // Exibir resultado
        absorbanceValue.textContent = absorbance.toFixed(3);
        
        // Atualizar gráfico
        updateGraph(wavelength, absorbance);
        
        // Calcular concentração se houver uma curva de calibração
        let concentration = null;
        if (typeof calculateConcentration === 'function') {
            concentration = calculateConcentration(absorbance, wavelength);
        }
        
        // Adicionar ao histórico
        if (typeof addToHistory === 'function') {
            addToHistory(currentSampleType, wavelength, absorbance, concentration);
        }
        
        isMeasuring = false;
        measureBtn.classList.remove('measuring');
        measureBtn.innerHTML = '<i class="fas fa-play mr-2"></i> Medir absorbância';
    }, 1000);
}

// Adicionar função para calcular concentração baseada em curva de calibração
function calculateConcentration(absorbance, wavelength) {
    // Verificar se temos uma curva de calibração para este comprimento de onda
    if (!calibrationCurves || !calibrationCurves[wavelength]) {
        return null;
    }
    
    const curve = calibrationCurves[wavelength];
    
    // Aplicar equação da curva de calibração (geralmente linear: c = m*A + b)
    const concentration = curve.slope * absorbance + curve.intercept;
    
    // Retornar concentração com 2 casas decimais
    return Math.max(0, parseFloat(concentration.toFixed(2)));
}

// Variável para armazenar curvas de calibração
let calibrationCurves = {};

// Função para salvar curva de calibração
function saveCalibrationCurve(wavelength, slope, intercept, r2) {
    calibrationCurves[wavelength] = {
        slope: slope,
        intercept: intercept,
        r2: r2,
        timestamp: new Date().toISOString()
    };
    
    // Salvar no localStorage
    try {
        localStorage.setItem('calibration_curves', JSON.stringify(calibrationCurves));
    } catch (error) {
        console.error('Erro ao salvar curvas de calibração:', error);
    }
}

// Função para carregar curvas de calibração
function loadCalibrationCurves() {
    try {
        const saved = localStorage.getItem('calibration_curves');
        if (saved) {
            calibrationCurves = JSON.parse(saved);
            console.log(`Curvas de calibração carregadas: ${Object.keys(calibrationCurves).length} curvas`);
        }
    } catch (error) {
        console.error('Erro ao carregar curvas de calibração:', error);
        calibrationCurves = {};
    }
}

// Carregar curvas de calibração ao iniciar
document.addEventListener('DOMContentLoaded', function() {
    // Carregar curvas de calibração
    loadCalibrationCurves();
    
    // Inicializar câmera
    initCamera(currentCamera);
    
    // Event listeners
    setupEventListeners();
    setupCalibrationListeners();
    
    // Inicializar gráfico
    initGraph();
    
    // Inicializar OpenCV
    initOpenCV();
});

// Função para inicializar o OpenCV
function initOpenCV() {
    // Verificar se o OpenCV já está carregado
    if (typeof cv !== 'undefined' && cv.Mat) {
        isOpenCVReady = true;
        setupImageProcessing();
        updateOpenCVStatus(true);
        return;
    }
    
    // Configurar callback para quando o OpenCV estiver pronto
    window.onOpenCVReady = function() {
        console.log('OpenCV.js está pronto!');
        isOpenCVReady = true;
        setupImageProcessing();
        updateOpenCVStatus(true);
    };
    
    // Carregar OpenCV.js
    const script = document.createElement('script');
    script.setAttribute('async', '');
    script.setAttribute('src', 'https://docs.opencv.org/4.9.0/opencv.js');
    document.head.appendChild(script);
}

// Atualizar status do OpenCV na interface
function updateOpenCVStatus(isReady) {
    const opencvStatus = document.getElementById('opencvStatus');
    if (!opencvStatus) return;
    
    if (isReady) {
        opencvStatus.innerHTML = `
            <span class="inline-block w-2 h-2 rounded-full bg-green-500 mr-1"></span>
            OpenCV pronto
        `;
    } else {
        opencvStatus.innerHTML = `
            <span class="inline-block w-2 h-2 rounded-full bg-yellow-500 mr-1"></span>
            Carregando OpenCV...
        `;
    }
}

// Configurar processamento de imagem
function setupImageProcessing() {
    // Criar canvas para processamento
    processingCanvas = document.createElement('canvas');
    processingCanvas.width = 640;
    processingCanvas.height = 480;
    processingCtx = processingCanvas.getContext('2d');
    
    // Inicializar controles da ROI
    initROIControls();
    
    console.log('Processamento de imagem inicializado');
}


