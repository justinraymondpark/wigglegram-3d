/**
 * Depth Processor
 * Computes depth maps from stereo image pairs using disparity
 */

class DepthProcessor {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });

        // Worker for heavy computation
        this.worker = null;
    }

    /**
     * Compute a depth map from a stereo pair
     * @param {HTMLImageElement} leftImg - Left image
     * @param {HTMLImageElement} rightImg - Right image
     * @param {Object} options - Processing options
     * @returns {Promise<{depthCanvas: HTMLCanvasElement, depthData: ImageData}>}
     */
    async computeDepthMap(leftImg, rightImg, options = {}) {
        const {
            blockSize = 9,          // Block size for matching
            maxDisparity = 64,      // Maximum disparity to search
            smoothing = true,       // Apply smoothing
            normalize = true        // Normalize output
        } = options;

        const width = leftImg.width;
        const height = leftImg.height;

        // Get image data
        const leftData = this.getImageData(leftImg);
        const rightData = this.getImageData(rightImg);

        // Convert to grayscale for matching
        const leftGray = this.toGrayscale(leftData);
        const rightGray = this.toGrayscale(rightData);

        // Compute disparity map using block matching
        const disparity = this.blockMatch(leftGray, rightGray, width, height, blockSize, maxDisparity);

        // Smooth the disparity map
        let processedDisparity = disparity;
        if (smoothing) {
            processedDisparity = this.medianFilter(disparity, width, height, 3);
            processedDisparity = this.gaussianBlur(processedDisparity, width, height, 2);
        }

        // Normalize to 0-255 range
        if (normalize) {
            processedDisparity = this.normalizeArray(processedDisparity);
        }

        // Create depth canvas
        const depthCanvas = document.createElement('canvas');
        depthCanvas.width = width;
        depthCanvas.height = height;
        const depthCtx = depthCanvas.getContext('2d');
        const depthImageData = depthCtx.createImageData(width, height);

        // Fill depth image data
        for (let i = 0; i < processedDisparity.length; i++) {
            const val = processedDisparity[i];
            depthImageData.data[i * 4] = val;
            depthImageData.data[i * 4 + 1] = val;
            depthImageData.data[i * 4 + 2] = val;
            depthImageData.data[i * 4 + 3] = 255;
        }

        depthCtx.putImageData(depthImageData, 0, 0);

        return {
            depthCanvas,
            depthData: depthImageData,
            disparityArray: processedDisparity
        };
    }

    /**
     * Get image data from an image element
     */
    getImageData(img) {
        this.canvas.width = img.width;
        this.canvas.height = img.height;
        this.ctx.drawImage(img, 0, 0);
        return this.ctx.getImageData(0, 0, img.width, img.height);
    }

    /**
     * Convert image data to grayscale array
     */
    toGrayscale(imageData) {
        const gray = new Uint8Array(imageData.width * imageData.height);
        const data = imageData.data;

        for (let i = 0; i < gray.length; i++) {
            const idx = i * 4;
            // Luminosity method
            gray[i] = Math.round(0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]);
        }

        return gray;
    }

    /**
     * Block matching stereo algorithm (SAD - Sum of Absolute Differences)
     */
    blockMatch(left, right, width, height, blockSize, maxDisparity) {
        const disparity = new Float32Array(width * height);
        const halfBlock = Math.floor(blockSize / 2);

        for (let y = halfBlock; y < height - halfBlock; y++) {
            for (let x = halfBlock; x < width - halfBlock; x++) {
                let bestDisparity = 0;
                let minSAD = Infinity;

                // Search for best match in right image
                const maxD = Math.min(maxDisparity, x - halfBlock);

                for (let d = 0; d <= maxD; d++) {
                    let sad = 0;

                    // Compute SAD for this disparity
                    for (let by = -halfBlock; by <= halfBlock; by++) {
                        for (let bx = -halfBlock; bx <= halfBlock; bx++) {
                            const leftIdx = (y + by) * width + (x + bx);
                            const rightIdx = (y + by) * width + (x + bx - d);
                            sad += Math.abs(left[leftIdx] - right[rightIdx]);
                        }
                    }

                    if (sad < minSAD) {
                        minSAD = sad;
                        bestDisparity = d;
                    }
                }

                disparity[y * width + x] = bestDisparity;
            }
        }

        return disparity;
    }

    /**
     * Apply median filter for noise reduction
     */
    medianFilter(data, width, height, kernelSize) {
        const result = new Float32Array(data.length);
        const half = Math.floor(kernelSize / 2);
        const kernel = [];

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                kernel.length = 0;

                for (let ky = -half; ky <= half; ky++) {
                    for (let kx = -half; kx <= half; kx++) {
                        const ny = Math.max(0, Math.min(height - 1, y + ky));
                        const nx = Math.max(0, Math.min(width - 1, x + kx));
                        kernel.push(data[ny * width + nx]);
                    }
                }

                kernel.sort((a, b) => a - b);
                result[y * width + x] = kernel[Math.floor(kernel.length / 2)];
            }
        }

        return result;
    }

    /**
     * Simple Gaussian blur
     */
    gaussianBlur(data, width, height, sigma) {
        const result = new Float32Array(data.length);
        const kernelSize = Math.ceil(sigma * 3) * 2 + 1;
        const half = Math.floor(kernelSize / 2);

        // Create Gaussian kernel
        const kernel = [];
        let sum = 0;
        for (let i = -half; i <= half; i++) {
            const val = Math.exp(-(i * i) / (2 * sigma * sigma));
            kernel.push(val);
            sum += val;
        }
        // Normalize
        for (let i = 0; i < kernel.length; i++) {
            kernel[i] /= sum;
        }

        // Apply horizontal pass
        const temp = new Float32Array(data.length);
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let val = 0;
                for (let k = -half; k <= half; k++) {
                    const nx = Math.max(0, Math.min(width - 1, x + k));
                    val += data[y * width + nx] * kernel[k + half];
                }
                temp[y * width + x] = val;
            }
        }

        // Apply vertical pass
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let val = 0;
                for (let k = -half; k <= half; k++) {
                    const ny = Math.max(0, Math.min(height - 1, y + k));
                    val += temp[ny * width + x] * kernel[k + half];
                }
                result[y * width + x] = val;
            }
        }

        return result;
    }

    /**
     * Normalize array to 0-255 range
     */
    normalizeArray(data) {
        let min = Infinity;
        let max = -Infinity;

        for (let i = 0; i < data.length; i++) {
            if (data[i] < min) min = data[i];
            if (data[i] > max) max = data[i];
        }

        const range = max - min || 1;
        const result = new Uint8Array(data.length);

        for (let i = 0; i < data.length; i++) {
            result[i] = Math.round(((data[i] - min) / range) * 255);
        }

        return result;
    }

    /**
     * Create a simple fallback depth map when stereo matching isn't possible
     * Uses edge detection and gradient to estimate depth
     */
    createFallbackDepthMap(img, options = {}) {
        const {
            centerBias = 0.3,    // Bias toward center being closer
            edgeWeight = 0.5    // Weight for edges (closer = more edge detail)
        } = options;

        const width = img.width;
        const height = img.height;

        const imageData = this.getImageData(img);
        const gray = this.toGrayscale(imageData);

        // Compute edge magnitude using Sobel
        const edges = this.sobelEdges(gray, width, height);

        // Create radial gradient (center closer)
        const radial = new Float32Array(width * height);
        const centerX = width / 2;
        const centerY = height / 2;
        const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const dx = x - centerX;
                const dy = y - centerY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                radial[y * width + x] = 1 - (dist / maxDist);
            }
        }

        // Combine edges and radial gradient
        const depth = new Float32Array(width * height);
        for (let i = 0; i < depth.length; i++) {
            depth[i] = edges[i] * edgeWeight + radial[i] * centerBias;
        }

        // Smooth and normalize
        const smoothed = this.gaussianBlur(depth, width, height, 5);
        const normalized = this.normalizeArray(smoothed);

        // Create canvas
        const depthCanvas = document.createElement('canvas');
        depthCanvas.width = width;
        depthCanvas.height = height;
        const depthCtx = depthCanvas.getContext('2d');
        const depthImageData = depthCtx.createImageData(width, height);

        for (let i = 0; i < normalized.length; i++) {
            const val = normalized[i];
            depthImageData.data[i * 4] = val;
            depthImageData.data[i * 4 + 1] = val;
            depthImageData.data[i * 4 + 2] = val;
            depthImageData.data[i * 4 + 3] = 255;
        }

        depthCtx.putImageData(depthImageData, 0, 0);

        return { depthCanvas };
    }

    /**
     * Sobel edge detection
     */
    sobelEdges(gray, width, height) {
        const edges = new Float32Array(width * height);

        const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
        const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                let gx = 0, gy = 0;
                let k = 0;

                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const val = gray[(y + ky) * width + (x + kx)];
                        gx += val * sobelX[k];
                        gy += val * sobelY[k];
                        k++;
                    }
                }

                edges[y * width + x] = Math.sqrt(gx * gx + gy * gy) / 255;
            }
        }

        return edges;
    }
}

// Export for use
window.DepthProcessor = DepthProcessor;
