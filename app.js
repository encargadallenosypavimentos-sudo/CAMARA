document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('camera-feed');
    const canvas = document.getElementById('photo-canvas');
    const captureBtn = document.getElementById('capture-btn');
    const switchCameraBtn = document.getElementById('switch-camera-btn');
    const appsheetBtn = document.getElementById('appsheet-btn');
    const flashEffect = document.getElementById('flash-effect');

    const customNotesText = document.getElementById('custom-notes');
    const photographerLabelText = document.getElementById('photographer-label');
    const dateTimeText = document.getElementById('date-time');
    const locationDataText = document.getElementById('location-data');

    // Modal & Settings UI
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeModalX = document.getElementById('close-modal-x');
    const saveSettingsBtn = document.getElementById('save-settings-btn');

    const resolutionSelect = document.getElementById('resolution-select');
    const dateFormatSelect = document.getElementById('date-format-select');
    const fontFamilySelect = document.getElementById('font-family');
    const textColorInput = document.getElementById('text-color');
    const labelColorInput = document.getElementById('label-color');
    const fontSizeRange = document.getElementById('font-size');
    const fontSizeVal = document.getElementById('size-val');

    const photographerInput = document.getElementById('photographer-input');
    const notesInput = document.getElementById('notes-input');
    const locationCheckbox = document.getElementById('location-checkbox');
    const notification = document.getElementById('notification');
    const orderList = document.getElementById('order-list');

    let currentStream = null;
    let facingMode = 'environment';

    // Configuración base
    let config = {
        resolution: '1920x1080',
        dateFormat: 'TEXT',
        photographer: '',
        notes: '',
        useLocation: true,
        fontFamily: 'Inter, sans-serif',
        textColor: '#ffffff',
        labelColor: '#0d8ad0',
        fontSizeMult: 1.0,
        order: ['notes', 'label', 'datetime', 'location']
    };
    let currentLocation = null;
    let locationWatchId = null;

    // ----- ACTUALIZACIÓN DEL VALOR DEL SLIDER -----
    fontSizeRange.addEventListener('input', (e) => {
        fontSizeVal.textContent = e.target.value;
    });

    // ----- BOTON APPSHEET -----
    appsheetBtn.addEventListener('click', () => {
        // Asombrosa integración - redirigir o abrir un URL intent para AppSheet
        window.open('https://www.appsheet.com/', '_blank');
        // Alternativamente, si hay deep link personalizado de AppSheet, puedes reemplazar la URL
    });

    // ----- REORDENAMIENTO EN UI -----
    orderList.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-up')) {
            const item = e.target.closest('.order-item');
            if (item.previousElementSibling) item.parentNode.insertBefore(item, item.previousElementSibling);
        } else if (e.target.classList.contains('btn-down')) {
            const item = e.target.closest('.order-item');
            if (item.nextElementSibling) item.parentNode.insertBefore(item.nextElementSibling, item);
        }
    });

    // ----- RELOJ Y FORMATO -----
    function updateClock() {
        if (settingsModal.classList.contains('hidden') === false) return; // Pausar visual cuando el modal está abierto para evitar tirones

        const now = new Date();
        const dd = String(now.getDate()).padStart(2, '0');
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const yyyy = now.getFullYear();
        let datePart = "";
        let timePart = "";

        // Componentes de Tiempo
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');

        let format = config.dateFormat;

        // Analizar parte de fecha
        if (format.startsWith('DD/MM/YYYY')) datePart = `${dd}/${mm}/${yyyy}`;
        else if (format.startsWith('MM/DD/YYYY')) datePart = `${mm}/${dd}/${yyyy}`;
        else if (format.startsWith('YYYY-MM-DD')) datePart = `${yyyy}-${mm}-${dd}`;
        else if (format.startsWith('TEXT')) {
            const optionsDate = { year: 'numeric', month: 'short', day: '2-digit' };
            datePart = now.toLocaleDateString('es-ES', optionsDate).toUpperCase();
        }

        // Analizar parte de hora
        if (format.endsWith('_TIME')) {
            timePart = `${hours}:${minutes}:${seconds}`;
        } else if (format.endsWith('_HM')) {
            timePart = `${hours}:${minutes}`;
        }

        // Combinar string
        if (timePart !== "") {
            dateTimeText.innerHTML = `${datePart}<br>${timePart}`;
        } else {
            dateTimeText.innerHTML = `${datePart}`;
        }
    }

    setInterval(updateClock, 1000);
    updateClock();

    // ----- GPS / UBICACIÓN -----
    function startLocation() {
        if (!navigator.geolocation) {
            locationDataText.textContent = 'GPS no soportado';
            return;
        }

        locationDataText.textContent = 'Obteniendo ubicación...';
        locationWatchId = navigator.geolocation.watchPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                const latStr = Math.abs(lat).toFixed(4) + (lat >= 0 ? '° N' : '° S');
                const lonStr = Math.abs(lon).toFixed(4) + (lon >= 0 ? '° E' : '° W');
                locationDataText.textContent = `${latStr}, ${lonStr}`;
            },
            (error) => { locationDataText.textContent = 'Ubicación no disponible'; },
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
    }

    function stopLocation() {
        if (locationWatchId !== null) {
            navigator.geolocation.clearWatch(locationWatchId);
            locationWatchId = null;
        }
        locationDataText.textContent = '';
    }

    if (config.useLocation) startLocation();

    // ----- ACTUALIZAR VISUALMENTE LA UI -----
    function updateOverlayVisually() {
        photographerLabelText.textContent = config.photographer;
        customNotesText.textContent = config.notes;

        const overlayNode = document.getElementById('timestamp-overlay');
        overlayNode.style.fontFamily = config.fontFamily;
        overlayNode.style.transform = `scale(${config.fontSizeMult})`;

        dateTimeText.style.color = config.textColor;
        locationDataText.style.color = config.textColor;
        customNotesText.style.color = config.textColor;
        photographerLabelText.style.color = config.labelColor;

        config.order.forEach((id, index) => {
            if (id === 'notes') customNotesText.style.order = index;
            if (id === 'label') photographerLabelText.style.order = index;
            if (id === 'datetime') dateTimeText.style.order = index;
            if (id === 'location') locationDataText.style.order = index;
        });
    }

    // ----- CÁMARA -----
    async function startCamera(mode, width = 1920, height = 1080) {
        if (currentStream) currentStream.getTracks().forEach(track => track.stop());
        try {
            const constraints = {
                video: { facingMode: mode, width: { ideal: width }, height: { ideal: height } },
                audio: false
            };
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            currentStream = stream;
            video.srcObject = stream;
            video.style.transform = mode === 'user' ? 'scaleX(-1)' : 'none';
        } catch (err) {
            showNotification('Error al acceder a la cámara o resolución no soportada.');
            console.error(err);
        }
    }

    switchCameraBtn.addEventListener('click', () => {
        facingMode = facingMode === 'environment' ? 'user' : 'environment';
        const [w, h] = config.resolution.split('x').map(Number);
        startCamera(facingMode, w, h);
    });

    // ----- MODAL -----
    function openModal() {
        resolutionSelect.value = config.resolution;
        dateFormatSelect.value = config.dateFormat;
        fontFamilySelect.value = config.fontFamily;
        textColorInput.value = config.textColor;
        labelColorInput.value = config.labelColor;
        fontSizeRange.value = config.fontSizeMult * 100;
        fontSizeVal.textContent = fontSizeRange.value;

        photographerInput.value = config.photographer;
        notesInput.value = config.notes;
        locationCheckbox.checked = config.useLocation;

        config.order.forEach(id => {
            const el = orderList.querySelector(`[data-id="${id}"]`);
            if (el) orderList.appendChild(el);
        });

        settingsModal.classList.remove('hidden');
    }

    function closeModal() {
        settingsModal.classList.add('hidden');
        updateClock();
    }

    function saveSettings() {
        const oldRes = config.resolution;

        config.resolution = resolutionSelect.value;
        config.dateFormat = dateFormatSelect.value;
        config.fontFamily = fontFamilySelect.value;
        config.textColor = textColorInput.value;
        config.labelColor = labelColorInput.value;
        config.fontSizeMult = parseInt(fontSizeRange.value) / 100;

        config.photographer = photographerInput.value.trim();
        config.notes = notesInput.value.trim();

        const oldLog = config.useLocation;
        config.useLocation = locationCheckbox.checked;
        if (config.useLocation && !oldLog) startLocation();
        else if (!config.useLocation && oldLog) stopLocation();

        config.order = Array.from(orderList.querySelectorAll('.order-item')).map(el => el.dataset.id);

        if (oldRes !== config.resolution) {
            const [w, h] = config.resolution.split('x').map(Number);
            startCamera(facingMode, w, h);
        }

        updateOverlayVisually();
        updateClock();
        closeModal();
        showNotification('Guardado y aplicado');
    }

    settingsBtn.addEventListener('click', openModal);
    closeModalX.addEventListener('click', closeModal);
    saveSettingsBtn.addEventListener('click', saveSettings);
    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) closeModal();
    });

    // ----- DIBUJAR (CANVAS) -----
    captureBtn.addEventListener('click', () => {
        if (!currentStream) return;
        flashEffect.classList.add('active');
        setTimeout(() => flashEffect.classList.remove('active'), 100);
        takePhoto();
    });

    function wrapText(context, text, x, y, maxWidth, lineHeight) {
        if (!text) return y;
        const words = text.split(' ');
        let line = '';
        let currentY = y;
        const lines = [];

        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const testWidth = context.measureText(testLine).width;
            if (testWidth > maxWidth && n > 0) {
                lines.push(line); line = words[n] + ' ';
            } else { line = testLine; }
        }
        lines.push(line);

        for (let j = lines.length - 1; j >= 0; j--) {
            context.fillText(lines[j], x, currentY);
            currentY -= lineHeight;
        }
        return currentY;
    }

    function takePhoto() {
        const context = canvas.getContext('2d');
        canvas.width = video.videoWidth || 1920;
        canvas.height = video.videoHeight || 1080;

        if (facingMode === 'user') { context.translate(canvas.width, 0); context.scale(-1, 1); }
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        if (facingMode === 'user') { context.setTransform(1, 0, 0, 1, 0, 0); }

        let padding = canvas.width * 0.04;
        let xPos = canvas.width - padding;
        let yPos = canvas.height - padding;
        // Text wrapper ancho máximo es ancho total - padding del izq - padding del derecho (se ajusta al 92% para cubrir toda la cam)
        const maxWidth = canvas.width - (padding * 2);

        context.textAlign = 'right';
        context.textBaseline = 'bottom';
        context.shadowColor = 'rgba(0,0,0,0.9)';
        context.shadowBlur = 12;
        context.shadowOffsetX = 3;
        context.shadowOffsetY = 3;

        const m = config.fontSizeMult;

        const drawFns = {
            'location': () => {
                if (!config.useLocation || !locationDataText.textContent) return;
                const bs = Math.max(24, Math.floor(canvas.width * 0.025)) * m;
                context.font = `600 ${bs}px ${config.fontFamily}`;
                context.fillStyle = config.textColor;
                yPos = wrapText(context, locationDataText.textContent, xPos, yPos, maxWidth, bs * 1.3);
                yPos -= (bs * 0.3);
            },
            'datetime': () => {
                const parts = dateTimeText.innerHTML.replace('<br>', '\n').split('\n');
                // Fecha tamaño pequeño 24px igual a location
                const bs = Math.max(24, Math.floor(canvas.width * 0.025)) * m;
                context.font = `600 ${bs}px ${config.fontFamily}`;
                context.fillStyle = config.textColor;

                // Tratar hora y fecha individualmente para wrap:
                if (parts[1]) {
                    yPos = wrapText(context, parts[1], xPos, yPos, maxWidth, bs * 1.3);
                    yPos -= (bs * 0.2);
                }
                if (parts[0]) {
                    yPos = wrapText(context, parts[0], xPos, yPos, maxWidth, bs * 1.3);
                    yPos -= (bs * 0.4);
                }
            },
            'label': () => {
                if (!config.photographer) return;
                const bs = Math.max(28, Math.floor(canvas.width * 0.03)) * m;
                context.font = `600 ${bs}px ${config.fontFamily}`;
                context.fillStyle = config.labelColor;
                yPos = wrapText(context, config.photographer, xPos, yPos, maxWidth, bs * 1.3);
                yPos -= (bs * 0.4);
            },
            'notes': () => {
                if (!config.notes) return;
                // Notas tamaño grande 34px igual a vieja fecha
                const bs = Math.max(34, Math.floor(canvas.width * 0.045)) * m;
                context.font = `800 ${bs}px ${config.fontFamily}`;
                context.fillStyle = config.textColor;
                yPos = wrapText(context, config.notes, xPos, yPos, maxWidth, bs * 1.3);
                yPos -= (bs * 0.4);
            }
        };

        for (let i = config.order.length - 1; i >= 0; i--) {
            if (drawFns[config.order[i]]) {
                drawFns[config.order[i]]();
            }
        }

        const dataURL = canvas.toDataURL('image/jpeg', 0.95);
        const link = document.createElement('a');
        link.download = `IMG_TS_${new Date().getTime()}.jpg`;
        link.href = dataURL;
        link.click();

        showNotification('Foto guardada');
    }

    function showNotification(msg) {
        notification.textContent = msg;
        notification.classList.remove('hidden');
        setTimeout(() => notification.classList.add('hidden'), 2000);
    }

    startCamera(facingMode, 1920, 1080);
    updateOverlayVisually();

    document.fonts.ready.then(() => updateOverlayVisually());
});
