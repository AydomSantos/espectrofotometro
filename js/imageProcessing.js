// Funções de processamento de imagem para o Espectrofotômetro Web

// Variáveis globais
let cv = null; // Referência para o OpenCV.js
let processingCanvas = null;
let processingCtx = null;
let isOpenCVReady = false;
let roiPosition = { x: 50, y: 50, radius: 10 }; // Posição padrão (em porcentagem)
let isDraggingROI = false;
let roiStartDragPos = { x: 0, y: 0 };

// Modelo de calibração
let calibrationModel = {
    // Valores iniciais - serão substituídos após calibração
    a: 0.02,  // Coeficiente para H
    b: -0.01, // Coeficiente para S
    c: 1.85,  // Coeficiente para -log10(V)
    intercept: 0.05,
    // Fatores de correção por comprimento de onda
    wavelengthFactors: {}
};

// Inicializar o processamento de imagem
function initImageProcessing() {
    // Criar canvas oculto para processamento
    processingCanvas = document.createElement('canvas');
    processingCanvas.width = 320;
    processingCanvas.height = 240;
    processingCtx = processingCanvas.getContext('2d');
    
    // Verificar se o OpenCV já está carregado
    if (window.cv) {
        cv = window.cv;
        isOpenCVReady = true;
        console.log('OpenCV.js já está carregado');
        updateOpenCVStatus(true);
    } else {
        // Aguardar o carregamento do OpenCV
        console.log('Aguardando carregamento do OpenCV.js...');
        updateOpenCVStatus(false);
    }
    
    // Inicializar fatores de correção por comprimento de onda
    initWavelengthFactors();
}

// Função chamada quando o OpenCV.js é carregado
function onOpenCVReady() {
    cv = window.cv;
    isOpenCVReady = true;
    console.log('OpenCV.js carregado com sucesso');
    updateOpenCVStatus(true);
}

// Atualizar status do OpenCV na interface
function updateOpenCVStatus(ready) {
    const statusElement = document.getElementById('opencvStatus');
    if (statusElement) {
        if (ready) {
            statusElement.innerHTML = '<span class="inline-block w-2 h-2 rounded-full bg-green-500 mr-1"></span> OpenCV pronto';
            statusElement.classList.remove('text-gray-500');
            statusElement.classList.add('text-green-600');
        } else {
            statusElement.innerHTML = '<span class="inline-block w-2 h-2 rounded-full bg-yellow-500 mr-1"></span> Carregando OpenCV...';
        }
    }
}

// Inicializar fatores de correção por comprimento de onda
function initWavelengthFactors() {
    // Criar fatores de correção para cada comprimento de onda (380-750nm)
    for (let wavelength = 380; wavelength <= 750; wavelength++) {
        calibrationModel.wavelengthFactors[wavelength] = calculateWavelengthFactor(wavelength);
    }
}

// Função para verificar se a imagem da câmera é válida para processamento
function isValidCameraImage(videoElement) {
    if (!videoElement || !isOpenCVReady) return false;
    
    try {
        // Criar canvas temporário
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = 32; // Tamanho pequeno para verificação rápida
        tempCanvas.height = 32;
        const tempCtx = tempCanvas.getContext('2d');
        
        // Capturar um frame da câmera
        tempCtx.drawImage(videoElement, 0, 0, 32, 32);
        
        // Verificar se a imagem contém dados reais
        const imageData = tempCtx.getImageData(0, 0, 32, 32);
        const data = imageData.data;
        
        // Verificar se a imagem não é toda preta ou toda branca
        let sumBrightness = 0;
        let allSame = true;
        const firstPixel = [data[0], data[1], data[2]];
        
        for (let i = 0; i < data.length; i += 4) {
            // Calcular brilho médio
            sumBrightness += (data[i] + data[i+1] + data[i+2]) / 3;
            
            // Verificar se todos os pixels são iguais
            if (allSame && (data[i] !== firstPixel[0] || 
                            data[i+1] !== firstPixel[1] || 
                            data[i+2] !== firstPixel[2])) {
                allSame = false;
            }
        }
        
        const avgBrightness = sumBrightness / (data.length / 4);
        
        // Se a imagem for toda preta, toda branca ou todos os pixels iguais,
        // provavelmente não é uma imagem válida da câmera
        if (avgBrightness < 5 || avgBrightness > 250 || allSame) {
            return false;
        }
        
        return true;
    } catch (err) {
        console.error('Erro ao verificar imagem da câmera:', err);
        return false;
    }
}

// Extrair região de interesse (ROI) da imagem da câmera
function extractROI(videoElement) {
    if (!isOpenCVReady) {
        console.warn('OpenCV.js ainda não está pronto');
        return null;
    }
    
    // Verificar se a imagem da câmera é válida
    if (!isValidCameraImage(videoElement)) {
        console.warn('Imagem da câmera inválida ou não disponível');
        return null;
    }
    
    try {
        // Desenhar o frame atual no canvas de processamento
        processingCtx.drawImage(videoElement, 0, 0, processingCanvas.width, processingCanvas.height);
        
        // Converter para formato Mat do OpenCV
        let src = cv.imread(processingCanvas);
        
        // Converter para HSV para melhor segmentação de cores
        let hsv = new cv.Mat();
        cv.cvtColor(src, hsv, cv.COLOR_RGBA2RGB);
        cv.cvtColor(hsv, hsv, cv.COLOR_RGB2HSV);
        
        // Calcular coordenadas do ROI usando a posição global
        const centerX = Math.floor(src.cols * (roiPosition.x / 100));
        const centerY = Math.floor(src.rows * (roiPosition.y / 100));
        const roiRadius = Math.floor(Math.min(src.cols, src.rows) * (roiPosition.radius / 100));
        
        // Criar máscara circular
        let mask = new cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC1);
        let center = new cv.Point(centerX, centerY);
        cv.circle(mask, center, roiRadius, new cv.Scalar(255, 255, 255), -1);
        
        // Aplicar máscara
        let roi = new cv.Mat();
        cv.bitwise_and(hsv, hsv, roi, mask);
        
        // Calcular valores médios na região
        let means = cv.mean(roi, mask);
        
        // Visualizar a região de interesse
        visualizeROI(src, centerX, centerY, roiRadius);
        
        // Liberar memória
        src.delete();
        hsv.delete();
        mask.delete();
        roi.delete();
        
        return {
            h: means[0],
            s: means[1],
            v: means[2]
        };
    } catch (err) {
        console.error('Erro no processamento de imagem:', err);
        return null;
    }
}

// Visualizar a região de interesse no canvas de debug (opcional)
function visualizeROI(src, centerX, centerY, radius) {
    // Verificar se existe um canvas de debug
    const debugCanvas = document.getElementById('debugCanvas');
    if (debugCanvas) {
        // Criar cópia da imagem para visualização
        let visImg = src.clone();
        
        // Desenhar círculo na região de interesse
        let color = new cv.Scalar(0, 255, 0, 255); // Verde
        cv.circle(visImg, new cv.Point(centerX, centerY), radius, color, 2);
        
        // Adicionar cruz no centro para facilitar o posicionamento
        cv.line(visImg, 
            new cv.Point(centerX - 10, centerY), 
            new cv.Point(centerX + 10, centerY), 
            color, 1);
        cv.line(visImg, 
            new cv.Point(centerX, centerY - 10), 
            new cv.Point(centerX, centerY + 10), 
            color, 1);
        
        // Mostrar no canvas de debug
        cv.imshow('debugCanvas', visImg);
        
        // Liberar memória
        visImg.delete();
    }
}

// Converter valores HSV para absorbância usando modelo multivariado
function hsvToAbsorbance(hsv, wavelength) {
    if (!hsv) return 0;
    
    // Normalizar valores HSV
    const hNorm = hsv.h / 180; // Hue varia de 0-180 no OpenCV
    const sNorm = hsv.s / 255; // Saturation varia de 0-255
    const vNorm = Math.max(0.01, hsv.v / 255); // Value varia de 0-255, evitar log(0)
    
    // Obter fator de correção para o comprimento de onda específico
    const wavelengthFactor = calibrationModel.wavelengthFactors[wavelength] || 1.0;
    
    // Calcular absorbância usando modelo multivariado
    // A = a*H + b*S + c*(-log10(V)) + intercept
    let absorbance = (
        calibrationModel.a * hNorm +
        calibrationModel.b * sNorm +
        calibrationModel.c * (-Math.log10(vNorm)) +
        calibrationModel.intercept
    ) * wavelengthFactor;
    
    return Math.min(2.0, Math.max(0, absorbance)); // Limitar entre 0 e 2.0
}

// Calcular fator de correção baseado no comprimento de onda
function calculateWavelengthFactor(wavelength) {
    // Diferentes comprimentos de onda têm diferentes sensibilidades
    // Esta é uma aproximação baseada em curvas de resposta espectral típicas
    wavelength = parseInt(wavelength);
    
    if (wavelength >= 380 && wavelength < 450) {
        // Região violeta/azul
        return 1.2;
    } else if (wavelength >= 450 && wavelength < 500) {
        // Região azul/ciano
        return 1.1;
    } else if (wavelength >= 500 && wavelength < 570) {
        // Região verde
        return 1.0;
    } else if (wavelength >= 570 && wavelength < 590) {
        // Região amarela
        return 0.9;
    } else if (wavelength >= 590 && wavelength < 650) {
        // Região laranja/vermelha
        return 0.85;
    } else {
        // Região vermelha profunda
        return 0.8;
    }
}

// Aplicar correção de iluminação
function applyLightingCorrection(absorbance, blankAbsorbance) {
    // Corrigir variações de iluminação usando a leitura do blank
    // Em um espectrofotômetro real, o blank é usado para calibrar o zero
    return Math.max(0, absorbance - blankAbsorbance);
}

// Calibrar o modelo usando amostras conhecidas
function calibrateModel(knownSamples) {
    // knownSamples: Array de objetos { hsv: {h, s, v}, absorbance: valor, wavelength: valor }
    if (!knownSamples || knownSamples.length < 3) {
        console.warn('Calibração requer pelo menos 3 amostras conhecidas');
        return false;
    }
    
    try {
        // Preparar dados para regressão linear
        let sumX1 = 0, sumX2 = 0, sumX3 = 0, sumY = 0;
        let sumX1X1 = 0, sumX1X2 = 0, sumX1X3 = 0, sumX1Y = 0;
        let sumX2X2 = 0, sumX2X3 = 0, sumX2Y = 0;
        let sumX3X3 = 0, sumX3Y = 0;
        const n = knownSamples.length;
        
        // Calcular somas para regressão multivariada
        for (let i = 0; i < n; i++) {
            const sample = knownSamples[i];
            const hNorm = sample.hsv.h / 180;
            const sNorm = sample.hsv.s / 255;
            const vLog = -Math.log10(Math.max(0.01, sample.hsv.v / 255));
            const absorbance = sample.absorbance;
            
            // Variáveis independentes
            const x1 = hNorm;
            const x2 = sNorm;
            const x3 = vLog;
            const y = absorbance;
            
            // Somas para matriz de coeficientes
            sumX1 += x1;
            sumX2 += x2;
            sumX3 += x3;
            sumY += y;
            
            sumX1X1 += x1 * x1;
            sumX1X2 += x1 * x2;
            sumX1X3 += x1 * x3;
            sumX1Y += x1 * y;
            
            sumX2X2 += x2 * x2;
            sumX2X3 += x2 * x3;
            sumX2Y += x2 * y;
            
            sumX3X3 += x3 * x3;
            sumX3Y += x3 * y;
        }
        
        // Resolver sistema de equações lineares (método simplificado)
        // Na prática, você usaria uma biblioteca como math.js ou numeric.js
        
        // Matriz de coeficientes
        const A = [
            [n, sumX1, sumX2, sumX3],
            [sumX1, sumX1X1, sumX1X2, sumX1X3],
            [sumX2, sumX1X2, sumX2X2, sumX2X3],
            [sumX3, sumX1X3, sumX2X3, sumX3X3]
        ];
        
        // Vetor de termos independentes
        const b = [sumY, sumX1Y, sumX2Y, sumX3Y];
        
        // Resolver sistema Ax = b (simplificado - em produção use uma biblioteca)
        // Este é um método de eliminação de Gauss simplificado
        const x = solveLinearSystem(A, b);
        
        if (x) {
            // Atualizar modelo de calibração
            calibrationModel.intercept = x[0];
            calibrationModel.a = x[1];
            calibrationModel.b = x[2];
            calibrationModel.c = x[3];
            
            console.log('Modelo calibrado:', calibrationModel);
            return true;
        } else {
            console.error('Falha na calibração do modelo');
            return false;
        }
    } catch (err) {
        console.error('Erro na calibração:', err);
        return false;
    }
}

// Resolver sistema de equações lineares (método simplificado)
function solveLinearSystem(A, b) {
    // Implementação simplificada do método de eliminação de Gauss
    // Para uso em produção, recomenda-se usar uma biblioteca matemática
    
    // Número de equações
    const n = A.length;
    
    // Criar matriz aumentada [A|b]
    const augMatrix = [];
    for (let i = 0; i < n; i++) {
        augMatrix.push([...A[i], b[i]]);
    }
    
    // Eliminação para frente
    for (let i = 0; i < n; i++) {
        // Encontrar pivô máximo
        let maxRow = i;
        for (let j = i + 1; j < n; j++) {
            if (Math.abs(augMatrix[j][i]) > Math.abs(augMatrix[maxRow][i])) {
                maxRow = j;
            }
        }
        
        // Trocar linhas
        if (maxRow !== i) {
            [augMatrix[i], augMatrix[maxRow]] = [augMatrix[maxRow], augMatrix[i]];
        }
        
        // Verificar se a matriz é singular
        if (Math.abs(augMatrix[i][i]) < 1e-10) {
            console.error('Matriz singular, não é possível resolver');
            return null;
        }
        
        // Eliminar variáveis
        for (let j = i + 1; j < n; j++) {
            const factor = augMatrix[j][i] / augMatrix[i][i];
            for (let k = i; k <= n; k++) {
                augMatrix[j][k] -= factor * augMatrix[i][k];
            }
        }
    }
    
    // Substituição para trás
    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
        x[i] = augMatrix[i][n];
        for (let j = i + 1; j < n; j++) {
            x[i] -= augMatrix[i][j] * x[j];
        }
        x[i] /= augMatrix[i][i];
    }
    
    return x;
}

// Medir absorbância real usando a câmera
function measureRealAbsorbance(videoElement, wavelength, sampleType, blankValue) {
    // Extrair região de interesse usando a posição global da ROI
    const hsv = extractROI(videoElement);
    
    if (!hsv) {
        return simulateAbsorbance(sampleType, wavelength); // Fallback para simulação
    }
    
    // Converter HSV para absorbância usando modelo calibrado
    let absorbance = hsvToAbsorbance(hsv, wavelength);
    
    // Aplicar correção de iluminação se tivermos um valor de blank
    if (blankValue !== undefined && blankValue !== null) {
        absorbance = applyLightingCorrection(absorbance, blankValue);
    }
    
    // Adicionar pequena variação aleatória para simular ruído do sensor
    absorbance += (Math.random() - 0.5) * 0.02;
    
    return absorbance;
}

// Função para calibrar o sistema usando amostras de referência
function calibrateSystem() {
    // Esta função seria chamada com amostras de referência
    // Em um sistema real, você teria amostras com absorbâncias conhecidas
    
    // Exemplo de amostras de calibração (simuladas)
    const calibrationSamples = [
        // Blank (água destilada)
        { 
            hsv: { h: 90, s: 10, v: 240 }, 
            absorbance: 0.0, 
            wavelength: 540 
        },
        // Solução 0.2 A
        { 
            hsv: { h: 100, s: 50, v: 200 }, 
            absorbance: 0.2, 
            wavelength: 540 
        },
        // Solução 0.5 A
        { 
            hsv: { h: 110, s: 100, v: 150 }, 
            absorbance: 0.5, 
            wavelength: 540 
        },
        // Solução 1.0 A
        { 
            hsv: { h: 120, s: 150, v: 100 }, 
            absorbance: 1.0, 
            wavelength: 540 
        }
    ];
    
    // Calibrar o modelo
    return calibrateModel(calibrationSamples);
}

// Funções para manipulação interativa da ROI
function initROIControls() {
    const targetArea = document.getElementById('targetArea');
    const cameraContainer = document.querySelector('.camera-container');
    
    if (!targetArea || !cameraContainer) return;
    
    // Tornar a área alvo arrastável
    targetArea.style.cursor = 'move';
    
    // Evento de mouse down para iniciar o arrasto
    targetArea.addEventListener('mousedown', startDragROI);
    targetArea.addEventListener('touchstart', handleTouchStart);
    
    // Eventos de mouse move e up para continuar e finalizar o arrasto
    document.addEventListener('mousemove', dragROI);
    document.addEventListener('mouseup', stopDragROI);
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);
    
    // Adicionar controles de tamanho da ROI
    const roiSizeControl = document.getElementById('roiSizeControl');
    if (roiSizeControl) {
        roiSizeControl.addEventListener('input', function() {
            roiPosition.radius = parseFloat(this.value);
            updateTargetAreaSize();
        });
    }
    
    // Inicializar tamanho da área alvo
    updateTargetAreaSize();
}

// Atualizar o tamanho visual da área alvo
function updateTargetAreaSize() {
    const targetArea = document.getElementById('targetArea');
    if (!targetArea) return;
    
    // Calcular tamanho em pixels baseado na porcentagem
    const cameraContainer = document.querySelector('.camera-container');
    const minDimension = Math.min(cameraContainer.offsetWidth, cameraContainer.offsetHeight);
    const sizeInPixels = minDimension * (roiPosition.radius / 100);
    
    // Atualizar tamanho do elemento
    targetArea.style.width = `${sizeInPixels}px`;
    targetArea.style.height = `${sizeInPixels}px`;
    
    // Atualizar posição
    updateTargetAreaPosition();
}

// Atualizar a posição visual da área alvo
function updateTargetAreaPosition() {
    const targetArea = document.getElementById('targetArea');
    if (!targetArea) return;
    
    // Converter porcentagem para posição relativa ao contêiner
    const cameraContainer = document.querySelector('.camera-container');
    const left = (roiPosition.x / 100) * cameraContainer.offsetWidth;
    const top = (roiPosition.y / 100) * cameraContainer.offsetHeight;
    
    // Centralizar o elemento na posição
    targetArea.style.left = `${left}px`;
    targetArea.style.top = `${top}px`;
    targetArea.style.transform = 'translate(-50%, -50%)';
}

// Iniciar o arrasto da ROI
function startDragROI(e) {
    e.preventDefault();
    isDraggingROI = true;
    
    // Salvar posição inicial do mouse
    roiStartDragPos = {
        x: e.clientX,
        y: e.clientY,
        initialX: roiPosition.x,
        initialY: roiPosition.y
    };
}

// Manipular evento de toque inicial
function handleTouchStart(e) {
    if (e.touches.length === 1) {
        e.preventDefault();
        isDraggingROI = true;
        
        // Salvar posição inicial do toque
        roiStartDragPos = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY,
            initialX: roiPosition.x,
            initialY: roiPosition.y
        };
    }
}

// Arrastar a ROI
function dragROI(e) {
    if (!isDraggingROI) return;
    
    // Calcular o deslocamento
    const deltaX = e.clientX - roiStartDragPos.x;
    const deltaY = e.clientY - roiStartDragPos.y;
    
    // Converter o deslocamento para porcentagem
    const cameraContainer = document.querySelector('.camera-container');
    const deltaXPercent = (deltaX / cameraContainer.offsetWidth) * 100;
    const deltaYPercent = (deltaY / cameraContainer.offsetHeight) * 100;
    
    // Atualizar posição da ROI
    roiPosition.x = Math.min(100, Math.max(0, roiStartDragPos.initialX + deltaXPercent));
    roiPosition.y = Math.min(100, Math.max(0, roiStartDragPos.initialY + deltaYPercent));
    
    // Atualizar visualmente
    updateTargetAreaPosition();
}

// Manipular evento de movimento de toque
function handleTouchMove(e) {
    if (!isDraggingROI || e.touches.length !== 1) return;
    
    // Calcular o deslocamento
    const deltaX = e.touches[0].clientX - roiStartDragPos.x;
    const deltaY = e.touches[0].clientY - roiStartDragPos.y;
    
    // Converter o deslocamento para porcentagem
    const cameraContainer = document.querySelector('.camera-container');
    const deltaXPercent = (deltaX / cameraContainer.offsetWidth) * 100;
    const deltaYPercent = (deltaY / cameraContainer.offsetHeight) * 100;
    
    // Atualizar posição da ROI
    roiPosition.x = Math.min(100, Math.max(0, roiStartDragPos.initialX + deltaXPercent));
    roiPosition.y = Math.min(100, Math.max(0, roiStartDragPos.initialY + deltaYPercent));
    
    // Atualizar visualmente
    updateTargetAreaPosition();
}

// Parar o arrasto da ROI
function stopDragROI() {
    isDraggingROI = false;
}

// Manipular evento de fim de toque
function handleTouchEnd() {
    isDraggingROI = false;
}


