// Funções de processamento de imagem para o Espectrofotômetro Web

// Variáveis globais
let cv = null; // Referência para o OpenCV.js
let processingCanvas = null;
let processingCtx = null;
let isOpenCVReady = false;

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
    } else {
        // Aguardar o carregamento do OpenCV
        console.log('Aguardando carregamento do OpenCV.js...');
    }
}

// Função chamada quando o OpenCV.js é carregado
function onOpenCVReady() {
    cv = window.cv;
    isOpenCVReady = true;
    console.log('OpenCV.js carregado com sucesso');
}

// Extrair região de interesse (ROI) da imagem da câmera
function extractROI(videoElement, x, y, radius) {
    if (!isOpenCVReady) {
        console.warn('OpenCV.js ainda não está pronto');
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
        
        // Calcular coordenadas do ROI
        const centerX = Math.floor(src.cols * (x / 100));
        const centerY = Math.floor(src.rows * (y / 100));
        const roiRadius = Math.floor(Math.min(src.cols, src.rows) * (radius / 100));
        
        // Criar máscara circular
        let mask = new cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC1);
        let center = new cv.Point(centerX, centerY);
        cv.circle(mask, center, roiRadius, new cv.Scalar(255, 255, 255), -1);
        
        // Aplicar máscara
        let roi = new cv.Mat();
        cv.bitwise_and(hsv, hsv, roi, mask);
        
        // Calcular valores médios na região
        let means = cv.mean(roi, mask);
        
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

// Converter valores HSV para absorbância
function hsvToAbsorbance(hsv, wavelength) {
    if (!hsv) return 0;
    
    // Normalizar valores HSV
    const h = hsv.h / 180; // Hue varia de 0-180 no OpenCV
    const s = hsv.s / 255; // Saturation varia de 0-255
    const v = hsv.v / 255; // Value varia de 0-255
    
    // Calcular absorbância baseada nos valores HSV e comprimento de onda
    // Esta é uma aproximação simplificada - em um sistema real, você precisaria
    // de uma calibração adequada com amostras conhecidas
    
    // Fator de correção baseado no comprimento de onda
    const wavelengthFactor = calculateWavelengthFactor(wavelength);
    
    // Calcular absorbância (Lei de Beer-Lambert simplificada)
    // A = -log10(T) onde T é a transmitância (aproximada por v)
    // Quanto menor o valor (mais escuro), maior a absorbância
    let transmittance = Math.max(0.01, v); // Evitar log(0)
    let absorbance = -Math.log10(transmittance) * wavelengthFactor;
    
    // Ajustar com base na saturação (cores mais saturadas geralmente têm maior absorbância)
    absorbance *= (1 + s * 0.5);
    
    return Math.min(2.0, Math.max(0, absorbance)); // Limitar entre 0 e 2.0
}

// Calcular fator de correção baseado no comprimento de onda
function calculateWavelengthFactor(wavelength) {
    // Diferentes comprimentos de onda têm diferentes sensibilidades
    // Esta é uma aproximação simplificada
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

// Medir absorbância real usando a câmera
function measureRealAbsorbance(videoElement, wavelength, sampleType, blankValue) {
    // Extrair região central da imagem (50% do centro, com raio de 10%)
    const hsv = extractROI(videoElement, 50, 50, 10);
    
    if (!hsv) {
        return simulateAbsorbance(sampleType, wavelength); // Fallback para simulação
    }
    
    // Converter HSV para absorbância
    let absorbance = hsvToAbsorbance(hsv, wavelength);
    
    // Aplicar correção de iluminação se tivermos um valor de blank
    if (blankValue !== undefined && blankValue !== null) {
        absorbance = applyLightingCorrection(absorbance, blankValue);
    }
    
    // Adicionar pequena variação aleatória para simular ruído do sensor
    absorbance += (Math.random() - 0.5) * 0.02;
    
    return absorbance;
}