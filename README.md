# Espectrofotômetro Web

![Versão](https://img.shields.io/badge/versão-1.0.0-blue)
![Licença](https://img.shields.io/badge/licença-MIT-green)

## 📋 Visão Geral

O Espectrofotômetro Web é uma aplicação que permite realizar medições de absorbância de amostras líquidas utilizando a câmera do seu dispositivo. Este projeto simula o funcionamento de um espectrofotômetro real, permitindo selecionar diferentes comprimentos de onda e visualizar os resultados em tempo real.

![Screenshot do Espectrofotômetro Web](screenshot.png)

## 🌟 Funcionalidades

- **Medição de absorbância** em diferentes comprimentos de onda (380-750 nm)
- **Visualização em tempo real** da amostra através da câmera
- **Seleção de diferentes tipos de amostras** (Blank, Amostra 1, Amostra 2)
- **Gráfico espectral** mostrando a absorbância em função do comprimento de onda
- **Histórico de medições** para comparação de resultados
- **Interface responsiva** que funciona em dispositivos móveis e desktop
- **Suporte para câmeras frontal e traseira** em dispositivos móveis

## 🔧 Tecnologias Utilizadas

- **HTML5** - Estrutura da aplicação
- **CSS3** - Estilização e animações
- **JavaScript** - Lógica da aplicação e interatividade
- **Tailwind CSS** - Framework CSS para design responsivo
- **Chart.js** - Biblioteca para criação de gráficos
- **Font Awesome** - Ícones e elementos visuais
- **Web API de Câmera** - Acesso à câmera do dispositivo

## 📁 Estrutura do Projeto

```
espectrofotometro-web/
├── index.html              # Página principal da aplicação
├── css/
│   └── styles.css          # Estilos personalizados
├── js/
│   ├── main.js             # Inicialização e lógica principal
│   ├── camera.js           # Funções relacionadas à câmera
│   ├── wavelength.js       # Funções relacionadas ao comprimento de onda
│   └── graph.js            # Funções relacionadas aos gráficos
├── tailwind.config.js      # Configuração do Tailwind CSS
└── README.md               # Documentação do projeto
```

## 🚀 Como Usar

### Requisitos

- Navegador moderno com suporte a JavaScript ES6+
- Permissão de acesso à câmera do dispositivo
- Conexão à internet (para carregar as bibliotecas CDN)

### Instalação

1. Clone o repositório:
   ```bash
   git clone https://github.com/seu-usuario/espectrofotometro-web.git
   ```

2. Navegue até a pasta do projeto:
   ```bash
   cd espectrofotometro-web
   ```

3. Abra o arquivo `index.html` em seu navegador ou use um servidor local:
   ```bash
   # Usando Python para criar um servidor local
   python -m http.server 8000
   ```

4. Acesse `http://localhost:8000` em seu navegador.

### Uso Básico

1. **Permita o acesso à câmera** quando solicitado pelo navegador
2. **Selecione o comprimento de onda** desejado usando o controle deslizante
3. **Escolha o tipo de amostra** clicando em um dos poços de amostra
4. **Posicione a amostra** na frente da câmera dentro da área alvo circular
5. **Clique em "Medir absorbância"** para realizar a medição
6. **Visualize os resultados** no painel de resultados e no gráfico espectral

## 📊 Funcionamento Técnico

### Simulação de Absorbância

O projeto simula a absorbância de diferentes tipos de amostras em vários comprimentos de onda. A função `simulateAbsorbance()` no arquivo `wavelength.js` implementa modelos matemáticos para:

- **Blank**: Valores próximos a zero com pequenas variações aleatórias
- **Amostra 1**: Dois picos de absorbância em 280nm e 540nm
- **Amostra 2**: Um pico de absorbância em 260nm

### Processamento de Imagem

Na versão atual, o processamento de imagem é simulado. Em uma implementação real, seria necessário:

1. Capturar a imagem da área alvo
2. Extrair os valores RGB da região
3. Converter para valores de absorbância usando algoritmos de calibração
4. Aplicar correções para compensar variações de iluminação

## 🔍 Detalhes de Implementação

### Câmera

O acesso à câmera é gerenciado através da API `navigator.mediaDevices.getUserMedia()`. O código em `camera.js` implementa:

- Inicialização da câmera
- Alternância entre câmeras frontal e traseira
- Tratamento de erros quando a câmera não está disponível

### Gráfico Espectral

O gráfico é implementado usando SVG para desenhar a curva de absorbância. O código em `graph.js` gerencia:

- Criação do gráfico inicial com dados simulados
- Atualização do gráfico com novos pontos de medição
- Visualização do espectro completo de 380nm a 750nm

## 🔬 Processamento de Imagem Real

O Espectrofotômetro Web agora utiliza algoritmos reais de processamento de imagem para medir a absorbância das amostras. Esta implementação usa a biblioteca OpenCV.js para processar as imagens capturadas pela câmera.

### Como Funciona

1. **Captura de Imagem**: A imagem da câmera é capturada em tempo real.
2. **Extração da Região de Interesse (ROI)**: Uma região circular no centro da imagem é extraída.
3. **Conversão para Espaço de Cor HSV**: A imagem RGB é convertida para o espaço de cor HSV (Hue, Saturation, Value) para melhor análise de cores.
4. **Cálculo de Valores Médios**: Os valores médios de H, S e V são calculados na região de interesse.
5. **Conversão para Absorbância**: Os valores HSV são convertidos para absorbância usando uma aproximação da Lei de Beer-Lambert.
6. **Correção de Iluminação**: A leitura do blank é usada para calibrar e corrigir variações de iluminação.

### Algoritmos Implementados

- **Segmentação de Imagem**: Isolamento da região de interesse usando máscaras circulares.
- **Análise de Cor**: Extração de informações de cor usando o espaço HSV.
- **Calibração**: Uso de amostras blank para calibração do zero.
- **Correção de Iluminação**: Compensação para variações na iluminação ambiente.

### Limitações

- A precisão depende da qualidade da câmera e das condições de iluminação.
- A calibração é simplificada e pode não ser tão precisa quanto um espectrofotômetro real.
- Diferentes dispositivos podem produzir resultados ligeiramente diferentes devido às variações nas câmeras.

### Melhorias Futuras

- Implementação de algoritmos de machine learning para melhorar a precisão.
- Calibração avançada usando curvas de referência.
- Compensação automática para diferentes condições de iluminação.
- Detecção automática de amostras e posicionamento.

## 🛠️ Personalização

### Adicionando Novos Tipos de Amostras

Para adicionar um novo tipo de amostra:

1. Adicione uma nova opção no seletor de amostras em `index.html`
2. Adicione um novo caso na função `simulateAbsorbance()` em `wavelength.js`
3. Defina o perfil de absorbância para o novo tipo de amostra

### Modificando o Intervalo de Comprimento de Onda

Para alterar o intervalo de comprimento de onda:

1. Atualize os atributos `min` e `max` do slider em `index.html`
2. Ajuste as funções em `wavelength.js` para lidar com o novo intervalo
3. Atualize as legendas e o gradiente de cores conforme necessário

## 📝 Notas de Desenvolvimento

### Limitações Atuais

- A medição de absorbância é simulada e não reflete valores reais
- Não há calibração real com amostras conhecidas
- O processamento de imagem é simplificado

### Melhorias Futuras

- Implementar algoritmos reais de processamento de imagem
- Adicionar calibração com amostras de referência
- Implementar exportação de dados em formatos CSV/Excel
- Adicionar funcionalidade de salvar e carregar configurações
- Implementar modo offline com armazenamento local

## 👥 Contribuição

Contribuições são bem-vindas! Para contribuir:

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-funcionalidade`)
3. Faça commit das suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Faça push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.


