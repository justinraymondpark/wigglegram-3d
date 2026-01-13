/**
 * Wigglegram 3D Viewer
 * Three.js-based depth-displacement renderer with improved parallax effect
 */

class WiggleViewer {
    constructor(container, options = {}) {
        this.container = container;

        // Options
        this.meshResolution = options.meshResolution || 128;
        this.depthIntensity = options.depthIntensity || 0.8;
        this.sensitivity = options.sensitivity || 1.5;
        this.smoothing = options.smoothing || 0.85;

        // Three.js components
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.mesh = null;
        this.material = null;

        // Image sets
        this.imageSets = [];
        this.currentIndex = 0;

        // Input state
        this.targetRotationX = 0;
        this.targetRotationY = 0;
        this.currentRotationX = 0;
        this.currentRotationY = 0;

        // Control mode
        this.useGyroscope = false;
        this.hasGyroPermission = false;
        this.gyroAvailable = false;

        // Calibration
        this.calibrationBeta = 0;
        this.calibrationGamma = 0;
        this.isCalibrated = false;

        // Animation
        this.isRunning = false;
        this.animationId = null;

        // Callbacks
        this.onRotationUpdate = null;

        // Bind methods
        this.animate = this.animate.bind(this);
        this.handleResize = this.handleResize.bind(this);
        this.handleDeviceOrientation = this.handleDeviceOrientation.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleTouchMove = this.handleTouchMove.bind(this);

        // Initialize
        this.init();
    }

    /**
     * Initialize Three.js scene
     */
    init() {
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a0f);

        // Create camera
        const aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 1000);
        this.camera.position.z = 1.5;

        // Create renderer
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true
        });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.container.appendChild(this.renderer.domElement);

        // Event listeners
        window.addEventListener('resize', this.handleResize);

        // Initial render
        this.renderer.render(this.scene, this.camera);

        console.log('WiggleViewer initialized');
    }

    /**
     * Create the depth-displaced mesh for an image
     */
    createMesh(colorTexture, depthTexture, aspectRatio) {
        // Remove existing mesh
        if (this.mesh) {
            this.scene.remove(this.mesh);
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
        }

        // Create plane geometry with subdivisions
        const baseSize = 1.8;
        const width = aspectRatio > 1 ? baseSize : baseSize * aspectRatio;
        const height = aspectRatio > 1 ? baseSize / aspectRatio : baseSize;

        const segmentsX = this.meshResolution;
        const segmentsY = Math.max(1, Math.floor(this.meshResolution / aspectRatio));

        const geometry = new THREE.PlaneGeometry(width, height, segmentsX, segmentsY);

        // Custom shader material with improved parallax
        this.material = new THREE.ShaderMaterial({
            uniforms: {
                colorMap: { value: colorTexture },
                depthMap: { value: depthTexture },
                depthScale: { value: this.depthIntensity * 0.1 },
                parallaxOffset: { value: new THREE.Vector2(0, 0) },
                time: { value: 0 }
            },
            vertexShader: `
                uniform sampler2D depthMap;
                uniform float depthScale;
                uniform vec2 parallaxOffset;
                
                varying vec2 vUv;
                varying float vDepth;
                
                void main() {
                    vUv = uv;
                    
                    // Sample depth at this UV
                    float depth = texture2D(depthMap, uv).r;
                    vDepth = depth;
                    
                    // Create displaced position
                    vec3 pos = position;
                    
                    // Push vertices forward based on depth (brighter = closer)
                    pos.z = depth * depthScale * 0.5;
                    
                    // Apply parallax displacement based on depth
                    // Objects with more depth move more
                    float parallaxAmount = depth * depthScale * 2.0;
                    pos.x += parallaxOffset.x * parallaxAmount;
                    pos.y += parallaxOffset.y * parallaxAmount;
                    
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D colorMap;
                uniform sampler2D depthMap;
                uniform vec2 parallaxOffset;
                uniform float depthScale;
                
                varying vec2 vUv;
                varying float vDepth;
                
                void main() {
                    // Sample depth for additional UV parallax
                    float depth = vDepth;
                    
                    // Apply subtle UV-based parallax for smoother effect
                    vec2 uvOffset = parallaxOffset * depth * 0.02;
                    vec2 finalUv = vUv + uvOffset;
                    
                    // Clamp UV to prevent edge artifacts
                    finalUv = clamp(finalUv, 0.005, 0.995);
                    
                    // Sample color
                    vec4 color = texture2D(colorMap, finalUv);
                    
                    // Subtle depth-based shading for more 3D feel
                    float shade = 0.92 + depth * 0.08;
                    color.rgb *= shade;
                    
                    gl_FragColor = color;
                }
            `,
            side: THREE.FrontSide
        });

        this.mesh = new THREE.Mesh(geometry, this.material);
        this.scene.add(this.mesh);

        // Adjust camera based on aspect
        this.camera.position.z = aspectRatio > 1 ? 1.4 : 1.6;

        console.log('Created mesh with resolution', segmentsX, 'x', segmentsY);
    }

    /**
     * Load an image set (color image + depth map)
     */
    async addImageSet(colorImg, depthCanvas) {
        // Create textures
        const colorTexture = new THREE.Texture(colorImg);
        colorTexture.needsUpdate = true;
        colorTexture.minFilter = THREE.LinearFilter;
        colorTexture.magFilter = THREE.LinearFilter;

        const depthTexture = new THREE.Texture(depthCanvas);
        depthTexture.needsUpdate = true;
        depthTexture.minFilter = THREE.LinearFilter;
        depthTexture.magFilter = THREE.LinearFilter;

        const aspectRatio = colorImg.width / colorImg.height;

        this.imageSets.push({
            colorTexture,
            depthTexture,
            aspectRatio,
            width: colorImg.width,
            height: colorImg.height
        });

        // Show first image
        if (this.imageSets.length === 1) {
            this.showImageSet(0);
        }

        return this.imageSets.length - 1;
    }

    /**
     * Show a specific image set
     */
    showImageSet(index) {
        if (index < 0 || index >= this.imageSets.length) return;

        this.currentIndex = index;
        const set = this.imageSets[index];

        this.createMesh(set.colorTexture, set.depthTexture, set.aspectRatio);
    }

    /**
     * Navigate to next image set
     */
    next() {
        const newIndex = (this.currentIndex + 1) % this.imageSets.length;
        this.showImageSet(newIndex);
    }

    /**
     * Navigate to previous image set
     */
    prev() {
        const newIndex = (this.currentIndex - 1 + this.imageSets.length) % this.imageSets.length;
        this.showImageSet(newIndex);
    }

    /**
     * Start input handling and animation
     */
    start() {
        if (this.isRunning) return;
        this.isRunning = true;

        // Start animation loop
        this.animate();
        console.log('Viewer started');
    }

    /**
     * Start gyroscope input
     */
    async startGyroscope() {
        console.log('Attempting to start gyroscope...');

        // Check if we're in a secure context
        if (!window.isSecureContext) {
            console.warn('Not in secure context - gyroscope may not work');
        }

        // Check if permission is needed (iOS 13+)
        if (typeof DeviceOrientationEvent !== 'undefined' &&
            typeof DeviceOrientationEvent.requestPermission === 'function') {
            try {
                console.log('Requesting iOS permission...');
                const permission = await DeviceOrientationEvent.requestPermission();
                this.hasGyroPermission = permission === 'granted';
                console.log('Permission result:', permission);
            } catch (e) {
                console.warn('Gyroscope permission error:', e);
                this.hasGyroPermission = false;
            }
        } else {
            // Non-iOS or older iOS - permission not required but may need secure context
            this.hasGyroPermission = true;
        }

        if (this.hasGyroPermission) {
            window.addEventListener('deviceorientation', this.handleDeviceOrientation, { passive: true });
            this.useGyroscope = true;
            console.log('Gyroscope listener added');
            return true;
        }

        return false;
    }

    /**
     * Start mouse/touch input
     */
    startMouseInput() {
        this.useGyroscope = false;
        document.addEventListener('mousemove', this.handleMouseMove, { passive: true });
        document.addEventListener('touchmove', this.handleTouchMove, { passive: true });
        console.log('Mouse/touch input started');
    }

    /**
     * Handle device orientation event
     */
    handleDeviceOrientation(event) {
        const { beta, gamma } = event;

        if (beta === null || gamma === null) {
            return;
        }

        // Mark gyro as available
        if (!this.gyroAvailable) {
            this.gyroAvailable = true;
            console.log('Gyroscope data received!', { beta, gamma });
        }

        // Auto-calibrate on first reading
        if (!this.isCalibrated) {
            this.calibrationBeta = beta;
            this.calibrationGamma = gamma;
            this.isCalibrated = true;
            console.log('Auto-calibrated to', { beta, gamma });
        }

        // Apply calibration
        const adjustedBeta = beta - this.calibrationBeta;
        const adjustedGamma = gamma - this.calibrationGamma;

        // Convert to normalized range (-1 to 1)
        // Range is roughly ±45 degrees for comfortable viewing
        this.targetRotationX = Math.max(-1, Math.min(1, (adjustedBeta / 25) * this.sensitivity));
        this.targetRotationY = Math.max(-1, Math.min(1, (adjustedGamma / 25) * this.sensitivity));
    }

    /**
     * Handle mouse movement
     */
    handleMouseMove(event) {
        if (this.useGyroscope && this.gyroAvailable) return;

        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;

        // Calculate offset from center
        const offsetX = (event.clientX - centerX) / centerX;
        const offsetY = (event.clientY - centerY) / centerY;

        this.targetRotationX = offsetY * this.sensitivity;
        this.targetRotationY = offsetX * this.sensitivity;
    }

    /**
     * Handle touch movement
     */
    handleTouchMove(event) {
        if (this.useGyroscope && this.gyroAvailable) return;

        const touch = event.touches[0];
        if (!touch) return;

        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;

        const offsetX = (touch.clientX - centerX) / centerX;
        const offsetY = (touch.clientY - centerY) / centerY;

        this.targetRotationX = offsetY * this.sensitivity;
        this.targetRotationY = offsetX * this.sensitivity;
    }

    /**
     * Calibrate gyroscope to current position
     */
    calibrate() {
        this.isCalibrated = false;
        this.targetRotationX = 0;
        this.targetRotationY = 0;
        this.currentRotationX = 0;
        this.currentRotationY = 0;
        console.log('Calibration reset');
    }

    /**
     * Animation loop
     */
    animate() {
        if (!this.isRunning) return;

        this.animationId = requestAnimationFrame(this.animate);

        // Smooth the rotation with lerp
        const lerpFactor = 1 - this.smoothing;
        this.currentRotationX += (this.targetRotationX - this.currentRotationX) * lerpFactor;
        this.currentRotationY += (this.targetRotationY - this.currentRotationY) * lerpFactor;

        // Clamp to prevent extreme values
        this.currentRotationX = Math.max(-1.5, Math.min(1.5, this.currentRotationX));
        this.currentRotationY = Math.max(-1.5, Math.min(1.5, this.currentRotationY));

        // Update shader uniforms
        if (this.material) {
            this.material.uniforms.parallaxOffset.value.set(
                this.currentRotationY,
                -this.currentRotationX
            );
        }

        // Callback
        if (this.onRotationUpdate) {
            this.onRotationUpdate(this.currentRotationX, this.currentRotationY);
        }

        // Render
        this.renderer.render(this.scene, this.camera);
    }

    /**
     * Stop animation and input handling
     */
    stop() {
        this.isRunning = false;

        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }

        window.removeEventListener('deviceorientation', this.handleDeviceOrientation);
        document.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('touchmove', this.handleTouchMove);
    }

    /**
     * Handle window resize
     */
    handleResize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    /**
     * Update settings
     */
    setDepthIntensity(value) {
        this.depthIntensity = value;
        if (this.material) {
            this.material.uniforms.depthScale.value = value * 0.1;
        }
    }

    setSensitivity(value) {
        this.sensitivity = value;
    }

    setSmoothing(value) {
        this.smoothing = value;
    }

    setMeshResolution(value) {
        this.meshResolution = value;
        // Recreate mesh if one exists
        if (this.imageSets.length > 0) {
            this.showImageSet(this.currentIndex);
        }
    }

    /**
     * Toggle between gyro and mouse mode
     */
    toggleMode() {
        if (this.useGyroscope) {
            window.removeEventListener('deviceorientation', this.handleDeviceOrientation);
            this.useGyroscope = false;
            this.startMouseInput();
            return false;
        } else {
            document.removeEventListener('mousemove', this.handleMouseMove);
            document.removeEventListener('touchmove', this.handleTouchMove);
            this.startGyroscope();
            return true;
        }
    }

    /**
     * Get current state for UI
     */
    getCurrentIndex() { return this.currentIndex; }
    getTotalCount() { return this.imageSets.length; }
    isGyroMode() { return this.useGyroscope; }

    /**
     * Cleanup
     */
    destroy() {
        this.stop();
        window.removeEventListener('resize', this.handleResize);

        // Dispose Three.js resources
        if (this.mesh) {
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
        }

        this.imageSets.forEach(set => {
            set.colorTexture.dispose();
            set.depthTexture.dispose();
        });

        this.renderer.dispose();
        this.container.removeChild(this.renderer.domElement);
    }
}

// Export for use
window.WiggleViewer = WiggleViewer;
