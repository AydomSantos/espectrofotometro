// Funções relacionadas ao gráfico

function initGraph() {
    // Limpar gráfico antes de desenhar
    absorbanceGraph.innerHTML = '';

    // Adicionar gradiente de fundo e área sob a curva
    const svgNS = 'http://www.w3.org/2000/svg';

    // Gradiente (opcional)
    const defs = document.createElementNS(svgNS, 'defs');
    const gradient = document.createElementNS(svgNS, 'linearGradient');
    gradient.setAttribute('id', 'wavelengthGradient');
    gradient.setAttribute('x1', '0');
    gradient.setAttribute('y1', '0');
    gradient.setAttribute('x2', '1');
    gradient.setAttribute('y2', '0');

    const colors = [
        { offset: '0%', color: '#7e22ce' },     
        { offset: '25%', color: '#2563eb' },    
        { offset: '50%', color: '#22c55e' },    
        { offset: '75%', color: '#facc15' },    
        { offset: '100%', color: '#dc2626' }    
    ];

    colors.forEach(c => {
        const stop = document.createElementNS(svgNS, 'stop');
        stop.setAttribute('offset', c.offset);
        stop.setAttribute('stop-color', c.color);
        gradient.appendChild(stop);
    });

    defs.appendChild(gradient);
    absorbanceGraph.appendChild(defs);

    const background = document.createElementNS(svgNS, 'rect');
    background.setAttribute('width', '100%');
    background.setAttribute('height', '100%');
    background.setAttribute('fill', 'url(#wavelengthGradient)');
    absorbanceGraph.appendChild(background);

    // Criar curva e preenchimento
    let pathData = 'M 0,100 ';
    for (let i = 0; i <= 100; i += 5) {
        const wavelength = 380 + (i / 100) * (750 - 380);
        const absorbance = simulateAbsorbance('sample1', wavelength) * 100;
        pathData += `L ${i},${100 - absorbance} `;
    }

    const fillPath = document.createElementNS(svgNS, 'path');
    fillPath.setAttribute('d', pathData + ' L 100,100 L 0,100 Z');
    fillPath.setAttribute('fill', 'rgba(59, 130, 246, 0.1)');
    absorbanceGraph.appendChild(fillPath);

    const path = document.createElementNS(svgNS, 'path');
    path.setAttribute('d', pathData);
    path.setAttribute('stroke', '#3B82F6');
    path.setAttribute('stroke-width', '1.5');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke-linejoin', 'round');
    path.setAttribute('stroke-linecap', 'round');
    absorbanceGraph.appendChild(path);
}

function updateGraph(wavelength, absorbance) {
    const svgNS = 'http://www.w3.org/2000/svg';
    wavelength = parseInt(wavelength);
    const x = ((wavelength - 380) / (750 - 380)) * 100;
    const y = 100 - (absorbance * 100);

    const circle = document.createElementNS(svgNS, 'circle');
    circle.setAttribute('cx', x);
    circle.setAttribute('cy', y);
    circle.setAttribute('r', '2.5');
    circle.setAttribute('fill', '#2563EB');
    circle.setAttribute('stroke', '#fff');
    circle.setAttribute('stroke-width', '0.8');
    absorbanceGraph.appendChild(circle);
}
