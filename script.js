// Clase principal optimizada para móvil
class MobileQRScanner {
    constructor() {
        this.scanning = false;
        this.stream = null;
        // Detectar automáticamente el entorno
        this.apiBaseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
            ? 'http://localhost:3009'  // Desarrollo
            : '';  // Producción - usar rutas relativas
        this.registeredGuests = [];
        this.currentStats = { total: 0, attended: 0, pending: 0 };
        
        // Elementos del DOM
        this.video = document.getElementById('video');
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.startBtn = document.getElementById('startBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.scannerStatus = document.getElementById('scanner-status');
        
        // Elementos de resultado
        this.guestCard = document.getElementById('guest-card');
        this.duplicateAlert = document.getElementById('duplicate-alert');
        this.simpleStatus = document.getElementById('simple-status');
        
        // Elementos de la tarjeta de invitado
        this.statusIcon = document.getElementById('status-icon');
        this.statusText = document.getElementById('status-text');
        this.guestName = document.getElementById('guest-name');
        this.guestDetails = document.getElementById('guest-details');
        this.registrationTime = document.getElementById('registration-time');
        
        // Elementos de alerta de duplicado
        this.duplicateName = document.getElementById('duplicate-name');
        this.duplicateTime = document.getElementById('duplicate-time');
        
        this.setupEventListeners();
        this.loadRegisteredGuests();
        this.initializeAudio();
        
        console.log('🚀 Mobile QR Scanner inicializado');
    }
    
    setupEventListeners() {
        this.startBtn.addEventListener('click', () => this.startScanning());
        this.stopBtn.addEventListener('click', () => this.stopScanning());
        
        // Configurar canvas
        this.canvas.width = 640;
        this.canvas.height = 480;
    }
    
    async startScanning() {
        try {
            console.log('📹 Iniciando escáner...');
            
            // Solicitar acceso a la cámara
            this.stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    facingMode: 'environment',
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                } 
            });
            
            this.video.srcObject = this.stream;
            this.video.play();
            
            this.scanning = true;
            this.startBtn.style.display = 'none';
            this.stopBtn.style.display = 'flex';
            
            this.updateScannerStatus('🔍 Buscando códigos QR...');
            
            // Iniciar el bucle de escaneo
            this.scanLoop();
            
        } catch (error) {
            console.error('❌ Error accediendo a la cámara:', error);
            this.updateScannerStatus('❌ Error de cámara');
            alert('No se pudo acceder a la cámara. Verifica los permisos.');
        }
    }
    
    stopScanning() {
        console.log('⏹️ Deteniendo escáner...');
        
        this.scanning = false;
        
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        
        this.video.srcObject = null;
        this.startBtn.style.display = 'flex';
        this.stopBtn.style.display = 'none';
        
        this.updateScannerStatus('📷 Cámara detenida');
    }
    
    scanLoop() {
        if (!this.scanning) return;
        
        if (this.video.readyState === this.video.HAVE_ENOUGH_DATA) {
            this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
            const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height);
            
            if (code) {
                console.log('🎯 QR detectado:', code.data);
                this.onQRDetected(code.data);
                return; // Detener el bucle hasta que se procese
            }
        }
        
        // Continuar escaneando
        requestAnimationFrame(() => this.scanLoop());
    }
    
    async onQRDetected(qrText) {
        if (!this.scanning) return;
        
        console.log('📝 Procesando QR:', qrText);
        this.updateScannerStatus('✅ Código detectado');
        
        // Detener escaneo temporalmente
        this.scanning = false;
        
        // Vibración de feedback
        if (navigator.vibrate) {
            navigator.vibrate([100, 50, 100]);
        }
        
        // Verificar duplicados locales
        const existingGuest = this.findExistingGuest(qrText);
        if (existingGuest) {
            this.showDuplicateAlert(existingGuest);
            return;
        }
        
        // Procesar check-in
        await this.checkInGuest(qrText);
    }
    
    async checkInGuest(qrText) {
        try {
            const payload = {
                qr_code: qrText,
                device_info: JSON.stringify({
                    type: 'mobile_scanner',
                    user_agent: navigator.userAgent,
                    timestamp: new Date().toISOString()
                }),
                location: 'Aplicación Móvil',
                notes: 'Check-in desde app móvil'
            };
            
            const response = await fetch(`${this.apiBaseUrl}/api/check-in`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            const data = await response.json();
            
            if (data.success) {
                if (data.guest.is_duplicate) {
                    // Para duplicados, asegurarnos de que tenemos la información de tiempo
                    const duplicateGuest = {
                        ...data.guest,
                        check_in_time: data.guest.check_in_time || data.guest.last_check_in || data.existing_check_in_time
                    };
                    console.log('🔄 Duplicado detectado:', duplicateGuest);
                    this.showDuplicateAlert(duplicateGuest);
                    
                    // 🎵 Sonido de notificación para duplicado
                    this.playNotificationSound();
                    this.vibrate([200]); // Vibración corta para notificación
                } else {
                    // ✅ Check-in exitoso
                    this.showGuestCard(data.guest);
                    this.registerLocalGuest(data.guest);
                    
                    // 🔊 Reproducir sonido de éxito y vibrar
                    this.playSuccessSound();
                    this.vibrate([100, 50, 100]); // Patrón de vibración de éxito
                }
                
                // Actualizar estadísticas inmediatamente
                console.log('🔄 Actualizando estadísticas después de check-in exitoso');
                await this.loadStats();
                
                // Segunda actualización por si acaso
                setTimeout(() => {
                    console.log('🔄 Segunda actualización de estadísticas');
                    this.loadStats();
                }, 2000);
                
                // Enviar a webhook como respaldo
                this.sendToWebhook(qrText);
                
            } else {
                console.warn('⚠️ Check-in falló:', data.message);
                
                // 🚨 Reproducir sonido de error
                this.playErrorSound();
                this.vibrate([300, 100, 300]); // Patrón de vibración de error
                
                await this.handleCheckInError(qrText, data.message);
            }
            
        } catch (error) {
            console.error('❌ Error en check-in:', error);
            
            // 🚨 Reproducir sonido de error para excepciones
            this.playErrorSound();
            this.vibrate([300, 100, 300, 100, 300]); // Patrón de vibración de error crítico
            
            await this.handleCheckInError(qrText, error.message);
        }
    }
    
    async handleCheckInError(qrText, originalError) {
        console.log('🔄 Intentando webhook como respaldo...');
        
        try {
            const webhookSuccess = await this.sendToWebhook(qrText);
            if (webhookSuccess) {
                const guestInfo = {
                    name: this.parseGuestName(webhookSuccess) || 'Invitado',
                    qr_code: qrText,
                    company: 'N/A',
                    email: 'N/A',
                    offline_mode: true,
                    timestamp: new Date().toISOString()
                };
                
                this.showGuestCard(guestInfo);
                this.registerLocalGuest(guestInfo);
                
                // 🔊 Sonido de éxito para webhook
                this.playSuccessSound();
                this.vibrate([100, 50, 100]);
            } else {
                this.showOfflineMode(qrText, originalError);
            }
        } catch (error) {
            console.error('❌ Webhook también falló:', error);
            this.showOfflineMode(qrText, originalError);
        }
    }
    
    showOfflineMode(qrText, error) {
        const guestInfo = {
            name: 'Modo Offline',
            qr_code: qrText,
            company: 'Verificar conexión',
            email: 'N/A',
            offline_mode: true,
            error: error,
            timestamp: new Date().toISOString()
        };
        
        this.showGuestCard(guestInfo);
        this.registerLocalGuest(guestInfo);
        
        // 🔊 Sonido de éxito para modo offline
        this.playSuccessSound();
        this.vibrate([100, 50, 100]);
    }
    
    async sendToWebhook(qrText) {
        try {
            const response = await fetch('https://hook.us2.make.com/cqe3co24ose5u9tvuretnuawdtbihqq2', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ qr_code: qrText })
            });
            
            if (response.ok) {
                const text = await response.text();
                console.log('✅ Webhook exitoso:', text);
                return text;
            } else {
                console.warn('⚠️ Webhook falló:', response.status);
                return null;
            }
        } catch (error) {
            console.error('❌ Error de webhook:', error);
            return null;
        }
    }
    
    parseGuestName(responseText) {
        const match = responseText.match(/Bienvenido\\s+(.+)/);
        return match ? match[1].trim() : null;
    }

    // 🔊 ==================== FUNCIONES DE AUDIO ====================
    
    // 🔊 Sonido de éxito - Tono ascendente alegre (Do-Mi-Sol)
    playSuccessSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Crear múltiples tonos para un sonido más rico
            const frequencies = [523, 659, 784]; // Do, Mi, Sol (acorde mayor)
            
            frequencies.forEach((freq, index) => {
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                // Configurar oscilador
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
                
                // Configurar ganancia con fade in/out
                const startTime = audioContext.currentTime + (index * 0.1);
                const duration = 0.4;
                
                gainNode.gain.setValueAtTime(0, startTime);
                gainNode.gain.linearRampToValueAtTime(0.15, startTime + 0.05);
                gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
                
                // Conectar nodos
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                // Reproducir
                oscillator.start(startTime);
                oscillator.stop(startTime + duration);
            });
            
            console.log('🔊 Reproduciendo sonido de éxito');
        } catch (error) {
            console.log('🔇 Audio no disponible:', error);
        }
    }

    // 🚨 Sonido de error - Tono descendente de alerta
    playErrorSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Crear sonido de error con dos tonos descendentes
            const oscillator1 = audioContext.createOscillator();
            const oscillator2 = audioContext.createOscillator();
            const gainNode1 = audioContext.createGain();
            const gainNode2 = audioContext.createGain();
            
            // Primer tono - más alto
            oscillator1.type = 'square';
            oscillator1.frequency.setValueAtTime(400, audioContext.currentTime);
            oscillator1.frequency.exponentialRampToValueAtTime(300, audioContext.currentTime + 0.3);
            
            // Segundo tono - más bajo, ligeramente desfasado
            oscillator2.type = 'square';
            oscillator2.frequency.setValueAtTime(350, audioContext.currentTime + 0.1);
            oscillator2.frequency.exponentialRampToValueAtTime(250, audioContext.currentTime + 0.4);
            
            // Configurar ganancia para ambos tonos
            gainNode1.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode1.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            
            gainNode2.gain.setValueAtTime(0, audioContext.currentTime + 0.1);
            gainNode2.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.15);
            gainNode2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
            
            // Conectar nodos
            oscillator1.connect(gainNode1);
            oscillator2.connect(gainNode2);
            gainNode1.connect(audioContext.destination);
            gainNode2.connect(audioContext.destination);
            
            // Reproducir
            oscillator1.start(audioContext.currentTime);
            oscillator1.stop(audioContext.currentTime + 0.3);
            
            oscillator2.start(audioContext.currentTime + 0.1);
            oscillator2.stop(audioContext.currentTime + 0.4);
            
            console.log('🚨 Reproduciendo sonido de error');
        } catch (error) {
            console.log('🔇 Audio no disponible:', error);
        }
    }

    // 🎵 Sonido de notificación - Para duplicados
    playNotificationSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            // Configurar oscilador para sonido neutral
            oscillator.type = 'triangle';
            oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
            oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
            oscillator.frequency.setValueAtTime(500, audioContext.currentTime + 0.2);
            
            // Configurar ganancia
            gainNode.gain.setValueAtTime(0.08, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            
            // Conectar nodos
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // Reproducir
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
            
            console.log('🎵 Reproduciendo sonido de notificación');
        } catch (error) {
            console.log('🔇 Audio no disponible:', error);
        }
    }

    // 📳 Vibración para dispositivos móviles
    vibrate(pattern = [100, 50, 100]) {
        try {
            if (navigator.vibrate) {
                navigator.vibrate(pattern);
                console.log('📳 Vibrando dispositivo');
            }
        } catch (error) {
            console.log('📳 Vibración no disponible:', error);
        }
    }

    // 🎵 Inicializar contexto de audio (requerido por algunos navegadores)
    initializeAudio() {
        try {
            // Crear contexto de audio silencioso para "despertar" el audio
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Algunos navegadores requieren interacción del usuario primero
            if (this.audioContext.state === 'suspended') {
                const resumeAudio = () => {
                    this.audioContext.resume().then(() => {
                        console.log('🎵 Contexto de audio activado');
                        document.removeEventListener('touchstart', resumeAudio);
                        document.removeEventListener('click', resumeAudio);
                    });
                };
                
                document.addEventListener('touchstart', resumeAudio, { once: true });
                document.addEventListener('click', resumeAudio, { once: true });
            }
        } catch (error) {
            console.log('🔇 No se pudo inicializar el contexto de audio:', error);
        }
    }
    
    showGuestCard(guestInfo) {
        // Pausar escaneo temporalmente
        this.scanning = false;
        
        // Actualizar contenido de la tarjeta
        this.statusIcon.textContent = guestInfo.offline_mode ? '📱' : '✅';
        this.statusText.textContent = guestInfo.offline_mode ? 
            '¡Registrado (Offline)!' : '¡Invitado Registrado!';
        this.guestName.textContent = guestInfo.name;
        
        // Crear detalles más ricos
        let detailsHTML = '';
        if (guestInfo.company && guestInfo.company !== 'N/A') {
            detailsHTML += `<p><strong>Empresa:</strong> ${guestInfo.company}</p>`;
        }
        if (guestInfo.category) {
            detailsHTML += `<p><strong>Categoría:</strong> ${guestInfo.category}</p>`;
        }
        if (guestInfo.table_number) {
            detailsHTML += `<p><strong>Mesa:</strong> ${guestInfo.table_number}</p>`;
        }
        if (guestInfo.special_requirements) {
            detailsHTML += `<p><strong>Requerimientos:</strong> ${guestInfo.special_requirements}</p>`;
        }
        if (!detailsHTML) {
            detailsHTML = `<p>QR: ${guestInfo.qr_code || 'N/A'}</p>`;
        }
        
        // Agregar botón de descarga de ticket
        detailsHTML += `
            <div class="ticket-download-section">
                <button onclick="qrScanner.downloadTicket('${guestInfo.qr_code || ''}', '${(guestInfo.name || '').replace(/'/g, "\\'")}');" class="ticket-download-btn">
                    🎫 Descargar Ticket
                </button>
            </div>
        `;
        
        this.guestDetails.innerHTML = detailsHTML;
        
        const checkInTime = guestInfo.check_in_time || guestInfo.timestamp || new Date();
        this.registrationTime.textContent = `Registrado: ${new Date(checkInTime).toLocaleString()}`;
        
        // Mostrar tarjeta con animación
        this.hideAllCards();
        this.guestCard.style.display = 'block';
        
        // Vibración si está disponible
        if (navigator.vibrate) {
            navigator.vibrate([100, 50, 100]);
        }
        
        console.log('💚 Mostrando tarjeta de invitado registrado');
    }
    
    showDuplicateAlert(existingGuest) {
        // Pausar escaneo temporalmente
        this.scanning = false;
        
        // Calcular tiempo transcurrido de forma más robusta
        let timeText = 'recientemente';
        
        try {
            const checkInTime = existingGuest.check_in_time || existingGuest.timestamp || existingGuest.last_check_in;
            
            if (checkInTime) {
                const checkInDate = new Date(checkInTime);
                const now = new Date();
                
                // Verificar que las fechas son válidas
                if (!isNaN(checkInDate.getTime()) && !isNaN(now.getTime())) {
                    const diffMs = now - checkInDate;
                    const diffMinutes = Math.floor(diffMs / (1000 * 60));
                    
                    if (diffMinutes < 1) {
                        timeText = 'hace menos de 1 minuto';
                    } else if (diffMinutes < 60) {
                        timeText = `hace ${diffMinutes} minuto${diffMinutes > 1 ? 's' : ''}`;
                    } else {
                        const diffHours = Math.floor(diffMinutes / 60);
                        if (diffHours < 24) {
                            timeText = `hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
                        } else {
                            const diffDays = Math.floor(diffHours / 24);
                            timeText = `hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
                        }
                    }
                } else {
                    console.warn('Fecha de check-in inválida:', checkInTime);
                    timeText = 'anteriormente';
                }
            } else {
                console.warn('No se encontró fecha de check-in en:', existingGuest);
                timeText = 'anteriormente';
            }
        } catch (error) {
            console.error('Error calculando tiempo transcurrido:', error);
            timeText = 'anteriormente';
        }
        
        // Actualizar contenido de la alerta
        this.duplicateName.textContent = existingGuest.name || 'Invitado';
        this.duplicateTime.textContent = `Registrado ${timeText}`;
        
        // Mostrar alerta
        this.hideAllCards();
        this.duplicateAlert.style.display = 'block';
        
        // Vibración más intensa para duplicados
        if (navigator.vibrate) {
            navigator.vibrate([200, 100, 200, 100, 200]);
        }
        
        console.log('⚠️ Mostrando alerta de duplicado para:', existingGuest.name, 'registrado', timeText);
        console.log('🔍 Debug - Datos del invitado duplicado:', {
            name: existingGuest.name,
            check_in_time: existingGuest.check_in_time,
            timestamp: existingGuest.timestamp,
            last_check_in: existingGuest.last_check_in,
            calculated_time: timeText
        });
    }
    
    continueScanning() {
        this.hideAllCards();
        this.scanning = true;
        this.scanLoop();
        console.log('🔄 Continuando escaneo...');
    }
    
    dismissDuplicateAlert() {
        this.hideAllCards();
        this.scanning = true;
        this.scanLoop();
        console.log('👍 Alerta de duplicado descartada');
    }
    
    hideAllCards() {
        this.guestCard.style.display = 'none';
        this.duplicateAlert.style.display = 'none';
        this.simpleStatus.style.display = 'none';
    }
    
    downloadTicket(qrCode, guestName) {
        // URL de descarga de tickets de Welcu
        const ticketUrl = `https://welcu.com/4dei/4dei-foro-distrito-de-emprendimiento-e-innovacion/tickets/${qrCode}`;
        
        // Abrir en nueva ventana/pestaña
        window.open(ticketUrl, '_blank');
        
        console.log(`🎫 Abriendo ticket para ${guestName} (${qrCode})`);
    }
    
    registerLocalGuest(guestInfo) {
        const guestRecord = {
            qr_code: guestInfo.qr_code,
            name: guestInfo.name,
            timestamp: guestInfo.timestamp || new Date().toISOString(),
            check_in_time: guestInfo.check_in_time || new Date().toISOString(),
            offline_mode: guestInfo.offline_mode || false
        };
        
        this.registeredGuests.push(guestRecord);
        
        // Guardar en localStorage
        try {
            localStorage.setItem('registeredGuests', JSON.stringify(this.registeredGuests));
        } catch (error) {
            console.warn('No se pudo guardar en localStorage:', error);
        }
        
        console.log('💾 Invitado registrado localmente:', guestRecord);
    }
    
    findExistingGuest(qrText) {
        return this.registeredGuests.find(guest => guest.qr_code === qrText);
    }
    
    updateScannerStatus(message) {
        if (this.scannerStatus) {
            this.scannerStatus.textContent = message;
        }
    }
    
    async loadStats() {
        try {
            // Forzar actualización sin caché
            const timestamp = new Date().getTime();
            const response = await fetch(`${this.apiBaseUrl}/api/stats?_t=${timestamp}`, {
                method: 'GET',
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                }
            });
            
            const data = await response.json();
            console.log('📊 Estadísticas recibidas del servidor:', data.stats);
            
            if (data.success) {
                this.currentStats = data.stats;
                this.updateStatsDisplay();
            } else {
                console.error('❌ Error en datos del servidor:', data);
            }
        } catch (error) {
            console.error('❌ Error cargando estadísticas:', error);
        }
    }
    
    updateStatsDisplay() {
        const elements = {
            totalGuests: document.getElementById('totalGuests'),
            attendedGuests: document.getElementById('attendedGuests'),
            pendingGuests: document.getElementById('pendingGuests'),
            attendancePercentage: document.getElementById('attendancePercentage')
        };
        
        // Debug: mostrar datos recibidos
        console.log('📊 Actualizando estadísticas:', this.currentStats);
        
        const totalGuests = this.currentStats.total_guests || 0;
        const attendedGuests = this.currentStats.attended_guests || 0;
        const pendingGuests = totalGuests - attendedGuests;
        
        if (elements.totalGuests) {
            elements.totalGuests.textContent = totalGuests;
            console.log('📊 Total invitados actualizado:', totalGuests);
        }
        if (elements.attendedGuests) {
            elements.attendedGuests.textContent = attendedGuests;
            console.log('📊 Asistieron actualizado:', attendedGuests);
        }
        if (elements.pendingGuests) {
            elements.pendingGuests.textContent = pendingGuests;
            console.log('📊 Pendientes actualizado:', pendingGuests);
        }
        if (elements.attendancePercentage) {
            const percentage = parseFloat(this.currentStats.attendance_rate) || 0;
            elements.attendancePercentage.textContent = percentage.toFixed(1) + '%';
            console.log('📊 Porcentaje actualizado:', percentage + '%');
        }
        
        // Verificar si los elementos existen en el DOM
        if (!elements.totalGuests) {
            console.warn('⚠️ Elemento totalGuests no encontrado en el DOM');
        }
        if (!elements.attendedGuests) {
            console.warn('⚠️ Elemento attendedGuests no encontrado en el DOM');
        }
    }
    
    loadRegisteredGuests() {
        try {
            const stored = localStorage.getItem('registeredGuests');
            this.registeredGuests = stored ? JSON.parse(stored) : [];
            console.log(`📚 Cargados ${this.registeredGuests.length} invitados del historial`);
        } catch (error) {
            console.warn('No se pudo cargar el historial de invitados:', error);
            this.registeredGuests = [];
        }
    }
}

// Variables globales para la nueva UI
let currentStats = { total: 0, attended: 0, pending: 0 };

// Funciones de navegación
function toggleMenu() {
    const nav = document.getElementById('mobileNav');
    const toggle = document.querySelector('.menu-toggle');
    
    nav.classList.toggle('active');
    toggle.classList.toggle('active');
}

function showSection(sectionId) {
    // Ocultar todas las secciones
    document.querySelectorAll('.app-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Mostrar la sección seleccionada
    document.getElementById(sectionId).classList.add('active');
    
    // Actualizar navegación
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const targetNav = document.querySelector(`[data-section="${sectionId.replace('-section', '')}"]`);
    if (targetNav) {
        targetNav.classList.add('active');
    }
    
    // Cerrar menú en móvil
    const nav = document.getElementById('mobileNav');
    const toggle = document.querySelector('.menu-toggle');
    nav.classList.remove('active');
    toggle.classList.remove('active');
}

function showScanner() {
    showSection('scanner-section');
    if (qrScanner && !qrScanner.scanning) {
        // No iniciar automáticamente, dejar que el usuario presione el botón
        qrScanner.updateScannerStatus('📷 Presiona "Iniciar Escáner"');
    }
}

function showManualCheck() {
    showSection('manual-section');
    if (qrScanner && qrScanner.scanning) {
        qrScanner.stopScanning();
    }
}

function showStats() {
    showSection('stats-section');
    if (qrScanner) {
        qrScanner.loadStats();
        if (qrScanner.scanning) {
            qrScanner.stopScanning();
        }
    }
}

function showSettings() {
    // Mostrar configuración o abrir panel de admin
    openAdminPanel();
}

function openAdminPanel() {
    window.open('admin.html', '_blank');
}

function quickScan() {
    showScanner();
    
    // Iniciar automáticamente desde el FAB
    setTimeout(() => {
        if (qrScanner && !qrScanner.scanning) {
            qrScanner.startScanning();
        }
    }, 300);
    
    // Animación del FAB
    const fab = document.getElementById('quickScanFab');
    fab.style.transform = 'scale(0.9)';
    setTimeout(() => {
        fab.style.transform = 'scale(1)';
    }, 200);
}

// Funciones de búsqueda y check-in manual
async function searchGuests() {
    const query = document.getElementById('guestSearch').value.trim();
    if (!query) return;
    
    try {
        const response = await fetch(`${qrScanner.apiBaseUrl}/api/guests?search=${encodeURIComponent(query)}&limit=10`);
        const data = await response.json();
        
        if (data.success) {
            displaySearchResults(data.guests);
        }
    } catch (error) {
        console.error('Error buscando invitados:', error);
    }
}

function displaySearchResults(guests) {
    const resultsContainer = document.getElementById('searchResults');
    
    if (guests.length === 0) {
        resultsContainer.innerHTML = '<p style="text-align: center; color: #7f8c8d; padding: 20px;">No se encontraron invitados</p>';
        return;
    }
    
    resultsContainer.innerHTML = guests.map(guest => `
        <div class="guest-result">
            <div class="guest-info">
                <h4>${guest.name}</h4>
                <p>${guest.company || ''} ${guest.email ? '• ' + guest.email : ''}</p>
            </div>
            <div class="guest-actions">
                ${guest.has_attended ? 
                    '<span style="color: #4CAF50; font-weight: 600;">✅ Asistió</span>' :
                    `<button onclick="manualCheckin(${guest.id})" class="action-btn primary">Check-in</button>`
                }
            </div>
        </div>
    `).join('');
}

async function manualCheckin(guestId) {
    try {
        const response = await fetch(`${qrScanner.apiBaseUrl}/api/manual-checkin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ guest_id: guestId })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Mostrar confirmación
            showGuestRegistered(data.guest);
            // Actualizar resultados de búsqueda
            searchGuests();
            // Actualizar estadísticas
            if (qrScanner) qrScanner.loadStats();
        } else {
            alert('Error: ' + data.message);
        }
    } catch (error) {
        console.error('Error en check-in manual:', error);
        alert('Error de conexión');
    }
}

function showGuestRegistered(guest) {
    // Usar la tarjeta existente para mostrar el invitado registrado
    if (qrScanner) {
        qrScanner.showGuestCard({
            ...guest,
            name: guest.name,
            company: guest.company,
            email: guest.email,
            qr_code: guest.qr_code,
            check_in_time: new Date().toISOString()
        });
    }
}

// Modal para nuevo invitado
function showNewGuestForm() {
    document.getElementById('newGuestModal').classList.add('active');
}

function closeNewGuestModal() {
    document.getElementById('newGuestModal').classList.remove('active');
    document.getElementById('newGuestForm').reset();
}

// Inicializar la aplicación
let qrScanner;

document.addEventListener('DOMContentLoaded', () => {
    qrScanner = new MobileQRScanner();
    
    // Cargar estadísticas iniciales
    setTimeout(() => {
        if (qrScanner) qrScanner.loadStats();
    }, 1000);
    
    // Configurar búsqueda en tiempo real
    const searchInput = document.getElementById('guestSearch');
    if (searchInput) {
        searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                searchGuests();
            }
        });
    }
    
    // Manejar envío de formulario de nuevo invitado
    const form = document.getElementById('newGuestForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(form);
            const guestData = {
                name: formData.get('name'),
                email: formData.get('email'),
                phone: formData.get('phone'),
                company: formData.get('company'),
                auto_checkin: formData.get('auto_checkin') === 'on'
            };
            
            try {
                const response = await fetch(`${qrScanner.apiBaseUrl}/api/create-guest`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(guestData)
                });
                
                const data = await response.json();
                
                if (data.success) {
                    closeNewGuestModal();
                    showGuestRegistered(data.guest);
                    if (qrScanner) qrScanner.loadStats();
                } else {
                    alert('Error: ' + data.message);
                }
            } catch (error) {
                console.error('Error creando invitado:', error);
                alert('Error de conexión');
            }
        });
    }
    
    console.log('🎉 Aplicación móvil inicializada correctamente');
});

// Cerrar modal al hacer clic fuera
document.addEventListener('click', (e) => {
    const modal = document.getElementById('newGuestModal');
    if (e.target === modal) {
        closeNewGuestModal();
    }
});

// Manejar la visibilidad de la página
document.addEventListener('visibilitychange', () => {
    if (document.hidden && qrScanner && qrScanner.scanning) {
        console.log('📱 Página oculta, pausando escáner');
        qrScanner.stopScanning();
    }
});