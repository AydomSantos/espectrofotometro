// Variáveis globais e inicialização
let stream = null;
let currentSampleType = null;
let isMeasuring = false;
let currentCamera = 'environment';

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
    
    // Inicializar câmera
    initCamera(currentCamera);
    
    // Event listeners
    setupEventListeners();
    
    // Inicializar gráfico
    initGraph();
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
    
    measureBtn.addEventListener('click', function() {
        if (!currentSampleType) {
            alert('Selecione uma amostra primeiro');
            return;
        }
        
        if (isMeasuring) return;
        
        isMeasuring = true;
        measureBtn.classList.add('measuring');
        measureBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Medindo...';
        
        // Simular medição
        setTimeout(() => {
            const wavelength = wavelengthSlider.value;
            const absorbance = simulateAbsorbance(currentSampleType, wavelength);
            
            absorbanceValue.textContent = absorbance.toFixed(3);
            updateGraph(wavelength, absorbance);
            
            isMeasuring = false;
            measureBtn.classList.remove('measuring');
            measureBtn.innerHTML = '<i class="fas fa-play mr-2"></i> Medir absorbância';
        }, 1500);
    });
    
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