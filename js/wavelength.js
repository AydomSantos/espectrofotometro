// Funções relacionadas ao comprimento de onda
function wavelengthToHue(wavelength) {
    // Converter nm para HSL hue (simplificado)
    wavelength = parseInt(wavelength);
    if (wavelength >= 380 && wavelength < 440) {
        return 280 + (wavelength - 380) * 0.5;
    } else if (wavelength >= 440 && wavelength < 490) {
        return 240 - (wavelength - 440) * 1.2;
    } else if (wavelength >= 490 && wavelength < 510) {
        return 120;
    } else if (wavelength >= 510 && wavelength < 580) {
        return 120 - (wavelength - 510) * 0.7;
    } else if (wavelength >= 580 && wavelength < 645) {
        return 60 - (wavelength - 580) * 0.5;
    } else if (wavelength >= 645 && wavelength <= 750) {
        return 0;
    }
    return 0;
}

function simulateAbsorbance(sampleType, wavelength) {
    // Simular valores de absorbância baseados no tipo de amostra e comprimento de onda
    wavelength = parseInt(wavelength);
    
    if (sampleType === 'blank') {
        return Math.random() * 0.05;
    }
    
    if (sampleType === 'sample1') {
        const peak1 = 280;
        const peak2 = 540;
        const a1 = Math.exp(-Math.pow((wavelength - peak1)/30, 2)) * 0.8;
        const a2 = Math.exp(-Math.pow((wavelength - peak2)/40, 2)) * 0.6;
        return a1 + a2 + (Math.random() * 0.05);
    } else if (sampleType === 'sample2') {
        const peak = 260;
        const a = Math.exp(-Math.pow((wavelength - peak)/25, 2)) * 1.2;
        return a + (Math.random() * 0.05);
    }
    
    return 0;
}