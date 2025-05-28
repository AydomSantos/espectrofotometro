// Funções relacionadas à câmera
async function initCamera(facingMode) {
    try {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        
        stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: facingMode,
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        });
        
        cameraFeed.srcObject = stream;
    } catch (err) {
        console.error('Erro ao acessar a câmera:', err);
        // Mostrar placeholder se a câmera não estiver disponível
        cameraFeed.srcObject = null;
        cameraFeed.poster = 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720"%3E%3Crect width="100%" height="100%" fill="%23222"/%3E%3Ctext x="50%" y="50%" fill="%23fff" font-family="Arial" font-size="24" text-anchor="middle" dominant-baseline="middle"%3ECâmera não disponível%3C/text%3E%3C/svg%3E';
    }
}