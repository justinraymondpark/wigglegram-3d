/**
 * Wigglegram 3D App
 * Main application logic
 */

class WigglegramApp {
    constructor() {
        // Core components
        this.mpoParser = new MPOParser();
        this.depthProcessor = new DepthProcessor();
        this.viewer = null;

        // DOM elements
        this.elements = {
            dropZone: document.getElementById('dropZone'),
            fileInput: document.getElementById('fileInput'),
            viewerArea: document.getElementById('viewerArea'),
            threeContainer: document.getElementById('threeContainer'),
            gyroIndicator: document.getElementById('gyroIndicator'),
            gyroDot: document.querySelector('.gyro-dot'),
            processingOverlay: document.getElementById('processingOverlay'),
            processingText: document.getElementById('processingText'),

            // Navigation
            prevBtn: document.getElementById('prevBtn'),
            nextBtn: document.getElementById('nextBtn'),
            currentIndex: document.getElementById('currentIndex'),
            totalCount: document.getElementById('totalCount'),

            // Toolbar
            calibrateBtn: document.getElementById('calibrateBtn'),
            toggleModeBtn: document.getElementById('toggleModeBtn'),
            addMoreBtn: document.getElementById('addMoreBtn'),

            // Settings
            settingsBtn: document.getElementById('settingsBtn'),
            settingsPanel: document.getElementById('settingsPanel'),
            closeSettingsBtn: document.getElementById('closeSettingsBtn'),
            sensitivitySlider: document.getElementById('sensitivitySlider'),
            sensitivityValue: document.getElementById('sensitivityValue'),
            smoothingSlider: document.getElementById('smoothingSlider'),
            smoothingValue: document.getElementById('smoothingValue'),
            depthSlider: document.getElementById('depthSlider'),
            depthValue: document.getElementById('depthValue'),
            meshResSelect: document.getElementById('meshResSelect'),
            showGyroToggle: document.getElementById('showGyroToggle'),

            // Permission modal
            permissionModal: document.getElementById('permissionModal'),
            requestPermBtn: document.getElementById('requestPermBtn'),
            skipPermBtn: document.getElementById('skipPermBtn'),

            // Toast
            toastContainer: document.getElementById('toastContainer')
        };

        // Initialize
        this.init();
    }

    /**
     * Initialize the app
     */
    init() {
        this.setupDropZone();
        this.setupFileInput();
        this.setupNavigation();
        this.setupToolbar();
        this.setupSettings();
        this.setupPermissionModal();

        console.log('Wigglegram 3D App initialized');
    }

    /**
     * Setup drop zone for file uploads
     */
    setupDropZone() {
        const { dropZone, fileInput } = this.elements;

        // Click to browse
        dropZone.addEventListener('click', () => fileInput.click());

        // Drag and drop
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('drag-over');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');

            const files = Array.from(e.dataTransfer.files);
            this.handleFiles(files);
        });
    }

    /**
     * Setup file input
     */
    setupFileInput() {
        this.elements.fileInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            this.handleFiles(files);
            e.target.value = ''; // Reset for re-selection
        });
    }

    /**
     * Setup navigation buttons
     */
    setupNavigation() {
        this.elements.prevBtn.addEventListener('click', () => {
            if (this.viewer) {
                this.viewer.prev();
                this.updateCounter();
            }
        });

        this.elements.nextBtn.addEventListener('click', () => {
            if (this.viewer) {
                this.viewer.next();
                this.updateCounter();
            }
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (this.elements.viewerArea.classList.contains('hidden')) return;

            if (e.key === 'ArrowLeft') {
                this.viewer?.prev();
                this.updateCounter();
            } else if (e.key === 'ArrowRight') {
                this.viewer?.next();
                this.updateCounter();
            }
        });
    }

    /**
     * Setup toolbar buttons
     */
    setupToolbar() {
        // Calibrate
        this.elements.calibrateBtn.addEventListener('click', () => {
            if (this.viewer) {
                this.viewer.calibrate();
                this.showToast('Gyroscope calibrated!', 'success');
            }
        });

        // Toggle mode
        this.elements.toggleModeBtn.addEventListener('click', () => {
            if (this.viewer) {
                const isGyro = this.viewer.toggleMode();
                this.elements.toggleModeBtn.querySelector('span').textContent = isGyro ? 'Gyro' : 'Touch';
                this.elements.toggleModeBtn.classList.toggle('active', isGyro);
                this.showToast(`${isGyro ? 'Gyroscope' : 'Touch/Mouse'} mode`, 'success');
            }
        });

        // Add more
        this.elements.addMoreBtn.addEventListener('click', () => {
            this.elements.fileInput.click();
        });
    }

    /**
     * Setup settings panel
     */
    setupSettings() {
        const {
            settingsBtn, settingsPanel, closeSettingsBtn,
            sensitivitySlider, sensitivityValue,
            smoothingSlider, smoothingValue,
            depthSlider, depthValue,
            meshResSelect, showGyroToggle
        } = this.elements;

        // Open/close settings
        settingsBtn.addEventListener('click', () => {
            settingsPanel.classList.toggle('hidden');
        });

        closeSettingsBtn.addEventListener('click', () => {
            settingsPanel.classList.add('hidden');
        });

        // Sensitivity
        sensitivitySlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            sensitivityValue.textContent = `${value.toFixed(1)}x`;
            if (this.viewer) this.viewer.setSensitivity(value);
        });

        // Smoothing
        smoothingSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            smoothingValue.textContent = value.toFixed(2);
            if (this.viewer) this.viewer.setSmoothing(value);
        });

        // Depth intensity
        depthSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            depthValue.textContent = value.toFixed(1);
            if (this.viewer) this.viewer.setDepthIntensity(value);
        });

        // Mesh resolution
        meshResSelect.addEventListener('change', (e) => {
            const value = parseInt(e.target.value);
            if (this.viewer) this.viewer.setMeshResolution(value);
        });

        // Gyro indicator toggle
        showGyroToggle.addEventListener('change', (e) => {
            this.elements.gyroIndicator.classList.toggle('hidden', !e.target.checked);
        });
    }

    /**
     * Setup permission modal
     */
    setupPermissionModal() {
        const { permissionModal, requestPermBtn, skipPermBtn } = this.elements;

        requestPermBtn.addEventListener('click', async () => {
            permissionModal.classList.add('hidden');

            if (this.viewer) {
                const granted = await this.viewer.startGyroscope();

                if (granted) {
                    this.showToast('Gyroscope enabled!', 'success');
                } else {
                    this.showToast('Permission denied, using touch mode', 'warning');
                    this.viewer.startMouseInput();
                    this.elements.toggleModeBtn.querySelector('span').textContent = 'Touch';
                    this.elements.toggleModeBtn.classList.remove('active');
                }
            }
        });

        skipPermBtn.addEventListener('click', () => {
            permissionModal.classList.add('hidden');
            if (this.viewer) {
                this.viewer.startMouseInput();
                this.elements.toggleModeBtn.querySelector('span').textContent = 'Touch';
                this.elements.toggleModeBtn.classList.remove('active');
            }
            this.showToast('Using touch/mouse mode', 'success');
        });
    }

    /**
     * Show processing overlay
     */
    showProcessing(text) {
        this.elements.processingText.textContent = text;
        this.elements.processingOverlay.classList.remove('hidden');
    }

    /**
     * Hide processing overlay
     */
    hideProcessing() {
        this.elements.processingOverlay.classList.add('hidden');
    }

    /**
     * Handle uploaded files
     */
    async handleFiles(files) {
        if (files.length === 0) return;

        // Initialize viewer if not already
        if (!this.viewer) {
            this.viewer = new WiggleViewer(this.elements.threeContainer, {
                meshResolution: parseInt(this.elements.meshResSelect.value),
                sensitivity: parseFloat(this.elements.sensitivitySlider.value),
                smoothing: parseFloat(this.elements.smoothingSlider.value),
                depthIntensity: parseFloat(this.elements.depthSlider.value)
            });

            // Set up rotation update callback for gyro indicator
            this.viewer.onRotationUpdate = (x, y) => {
                this.updateGyroIndicator(x, y);
            };
        }

        // Show viewer area
        this.elements.dropZone.classList.add('hidden');
        this.elements.viewerArea.classList.remove('hidden');

        try {
            for (const file of files) {
                const ext = file.name.toLowerCase().split('.').pop();

                if (ext === 'mpo') {
                    await this.processMPOFile(file);
                } else if (['jpg', 'jpeg', 'png'].includes(ext)) {
                    await this.processSingleImage(file);
                }
            }

            // Update counter
            this.updateCounter();

            // Start viewer
            this.viewer.start();

            // Check for gyroscope permission
            this.checkGyroscope();

        } catch (error) {
            console.error('Error processing files:', error);
            this.showToast('Error: ' + error.message, 'error');
            this.hideProcessing();
        }
    }

    /**
     * Process an MPO file
     */
    async processMPOFile(file) {
        this.showProcessing('Extracting stereo pair...');

        // Parse MPO file
        const images = await this.mpoParser.parseFile(file);

        if (images.length < 2) {
            // Only one image - use fallback depth
            const img = await this.loadImage(images[0].url);
            await this.processWithFallbackDepth(img, file.name);
        } else {
            // Load both images
            const leftImg = await this.loadImage(images[0].url);
            const rightImg = await this.loadImage(images[1].url);

            this.showProcessing('Computing depth map from stereo pair...');

            // Compute depth map from stereo pair
            const { depthCanvas } = await this.depthProcessor.computeDepthMap(leftImg, rightImg, {
                blockSize: 11,
                maxDisparity: 64,
                smoothing: true
            });

            this.showProcessing('Creating 3D mesh...');

            // Add to viewer (use left image as color)
            await this.viewer.addImageSet(leftImg, depthCanvas);

            this.showToast(`Loaded ${file.name}`, 'success');
        }

        this.hideProcessing();
    }

    /**
     * Process a single image (use fallback depth estimation)
     */
    async processSingleImage(file) {
        this.showProcessing('Loading image...');

        const url = URL.createObjectURL(file);
        const img = await this.loadImage(url);

        await this.processWithFallbackDepth(img, file.name);

        URL.revokeObjectURL(url);
        this.hideProcessing();
    }

    /**
     * Process image with fallback depth estimation
     */
    async processWithFallbackDepth(img, filename) {
        this.showProcessing('Estimating depth...');

        // Use fallback depth (edge + radial gradient)
        const { depthCanvas } = this.depthProcessor.createFallbackDepthMap(img, {
            centerBias: 0.4,
            edgeWeight: 0.6
        });

        this.showProcessing('Creating 3D mesh...');

        // Add to viewer
        await this.viewer.addImageSet(img, depthCanvas);

        this.showToast(`Loaded ${filename} (estimated depth)`, 'success');
    }

    /**
     * Load an image from URL
     */
    loadImage(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = url;
        });
    }

    /**
     * Check for gyroscope and request permission if needed
     */
    async checkGyroscope() {
        // Check if we're on a device that might have gyroscope
        const hasOrientation = 'DeviceOrientationEvent' in window;

        if (!hasOrientation) {
            // No gyroscope available - use mouse
            this.viewer.startMouseInput();
            this.elements.toggleModeBtn.querySelector('span').textContent = 'Touch';
            this.elements.toggleModeBtn.classList.remove('active');
            return;
        }

        // Check if permission is needed (iOS 13+)
        if (typeof DeviceOrientationEvent.requestPermission === 'function') {
            // Show permission modal
            this.elements.permissionModal.classList.remove('hidden');
        } else {
            // Permission not required - start gyro
            const success = await this.viewer.startGyroscope();
            if (!success) {
                this.viewer.startMouseInput();
                this.elements.toggleModeBtn.querySelector('span').textContent = 'Touch';
                this.elements.toggleModeBtn.classList.remove('active');
            }
        }
    }

    /**
     * Update image counter display
     */
    updateCounter() {
        if (this.viewer) {
            this.elements.currentIndex.textContent = this.viewer.getCurrentIndex() + 1;
            this.elements.totalCount.textContent = this.viewer.getTotalCount();
        }
    }

    /**
     * Update gyro indicator
     */
    updateGyroIndicator(x, y) {
        if (this.elements.gyroDot) {
            const indicatorSize = 15;
            this.elements.gyroDot.style.transform =
                `translate(${y * indicatorSize}px, ${x * indicatorSize}px)`;
        }
    }

    /**
     * Show a toast notification
     */
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;

        this.elements.toastContainer.appendChild(toast);

        // Auto-remove after 3 seconds
        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new WigglegramApp();
});
