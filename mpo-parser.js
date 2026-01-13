/**
 * MPO (Multi-Picture Object) Parser
 * Extracts individual JPEG images from MPO stereo files
 * Improved version with better support for various camera formats
 */

class MPOParser {
    constructor() {
        // JPEG markers
        this.SOI = 0xFFD8;  // Start of Image
        this.EOI = 0xFFD9;  // End of Image
        this.APP2 = 0xFFE2; // MPO marker (MPF - Multi-Picture Format)
    }

    /**
     * Parse an MPO file and extract all images
     * @param {ArrayBuffer} buffer - The MPO file data
     * @returns {Promise<Array<{blob: Blob, url: string}>>} Array of extracted images
     */
    async parse(buffer) {
        const uint8 = new Uint8Array(buffer);
        const images = [];

        console.log(`Parsing MPO file, size: ${buffer.byteLength} bytes`);

        // Method 1: Find all SOI/EOI boundaries (simple approach)
        const boundaries = this.findJPEGBoundaries(uint8);
        console.log(`Found ${boundaries.length} JPEG boundaries`);

        if (boundaries.length >= 2) {
            // Extract each image
            for (let i = 0; i < Math.min(boundaries.length, 2); i++) {
                const boundary = boundaries[i];
                const imageData = buffer.slice(boundary.start, boundary.end);
                const blob = new Blob([imageData], { type: 'image/jpeg' });
                images.push({
                    blob,
                    url: URL.createObjectURL(blob)
                });
                console.log(`Extracted image ${i + 1}: ${boundary.start} - ${boundary.end} (${boundary.end - boundary.start} bytes)`);
            }
            return images;
        }

        // Method 2: Try MPF index parsing
        const mpfImages = this.parseMPFIndex(uint8, buffer);
        if (mpfImages.length >= 2) {
            console.log('Extracted images using MPF index');
            return mpfImages;
        }

        // Fallback: Return the whole file as a single image
        console.warn('Could not extract stereo pair, returning single image');
        const blob = new Blob([buffer], { type: 'image/jpeg' });
        return [{
            blob,
            url: URL.createObjectURL(blob)
        }];
    }

    /**
     * Find JPEG image boundaries by scanning for SOI and EOI markers
     * @param {Uint8Array} data 
     * @returns {Array<{start: number, end: number}>}
     */
    findJPEGBoundaries(data) {
        const boundaries = [];
        const length = data.length;
        let pos = 0;

        while (pos < length - 1) {
            // Look for SOI marker (0xFF 0xD8)
            if (data[pos] === 0xFF && data[pos + 1] === 0xD8) {
                const start = pos;
                pos += 2;

                // Now scan through the JPEG structure
                while (pos < length - 1) {
                    // Look for any marker
                    if (data[pos] === 0xFF) {
                        const marker = data[pos + 1];

                        // Skip padding bytes (0xFF 0xFF)
                        if (marker === 0xFF) {
                            pos++;
                            continue;
                        }

                        // EOI marker - end of this image
                        if (marker === 0xD9) {
                            boundaries.push({
                                start,
                                end: pos + 2
                            });
                            pos += 2;
                            break;
                        }

                        // RST markers (0xD0-0xD7) - no length, skip
                        if (marker >= 0xD0 && marker <= 0xD7) {
                            pos += 2;
                            continue;
                        }

                        // SOI marker - shouldn't happen, but indicates new image
                        if (marker === 0xD8) {
                            // End current image at previous position
                            // This shouldn't normally happen in valid JPEG
                            break;
                        }

                        // SOS marker (0xDA) - start of scan (entropy-coded data follows)
                        if (marker === 0xDA) {
                            pos += 2;
                            if (pos + 1 < length) {
                                const sosLength = (data[pos] << 8) | data[pos + 1];
                                pos += sosLength;
                            }

                            // Scan through entropy-coded data until we find a marker
                            while (pos < length - 1) {
                                if (data[pos] === 0xFF && data[pos + 1] !== 0x00 && data[pos + 1] !== 0xFF) {
                                    // Found a marker
                                    break;
                                }
                                pos++;
                            }
                            continue;
                        }

                        // Other markers with length field
                        pos += 2;
                        if (pos + 1 < length) {
                            const segLength = (data[pos] << 8) | data[pos + 1];
                            pos += segLength;
                        }
                    } else {
                        pos++;
                    }
                }

                // If we didn't find EOI but ran out of data, assume rest is the image
                if (boundaries.length === 0 || boundaries[boundaries.length - 1].start !== start) {
                    // Didn't add this boundary yet - it might be incomplete
                }
            } else {
                pos++;
            }
        }

        return boundaries;
    }

    /**
     * Parse MPF (Multi-Picture Format) index to find image offsets
     * @param {Uint8Array} data
     * @param {ArrayBuffer} buffer
     * @returns {Array<{blob: Blob, url: string}>}
     */
    parseMPFIndex(data, buffer) {
        const images = [];
        const length = data.length;

        // Find APP2 marker with "MPF\0" signature
        for (let pos = 0; pos < length - 20; pos++) {
            if (data[pos] === 0xFF && data[pos + 1] === 0xE2) {
                const segLength = (data[pos + 2] << 8) | data[pos + 3];

                // Check for "MPF\0" signature
                if (data[pos + 4] === 0x4D && data[pos + 5] === 0x50 &&
                    data[pos + 6] === 0x46 && data[pos + 7] === 0x00) {

                    console.log('Found MPF segment at position', pos);

                    // Parse MPF index
                    // The structure is complex - simplified parsing here
                    const mpfStart = pos + 4; // Start of MPF data

                    // Determine endianness from TIFF header
                    const endian = data[mpfStart + 4] === 0x49 ? 'little' : 'big';
                    console.log('MPF endianness:', endian);

                    // For now, use simpler boundary detection
                    break;
                }
            }
        }

        return images;
    }

    /**
     * Load and parse an MPO file from a File object
     * @param {File} file 
     * @returns {Promise<Array<{blob: Blob, url: string}>>}
     */
    async parseFile(file) {
        const buffer = await file.arrayBuffer();
        return this.parse(buffer);
    }

    /**
     * Load and parse an MPO file from a URL
     * @param {string} url 
     * @returns {Promise<Array<{blob: Blob, url: string}>>}
     */
    async parseURL(url) {
        const response = await fetch(url);
        const buffer = await response.arrayBuffer();
        return this.parse(buffer);
    }

    /**
     * Create a stereo pair from two separate image files
     * @param {File[]} files - Array of 2 image files (left, right)
     * @returns {Promise<Array<{blob: Blob, url: string}>>}
     */
    async createPairFromFiles(files) {
        const images = [];

        for (const file of files.slice(0, 2)) {
            images.push({
                blob: file,
                url: URL.createObjectURL(file)
            });
        }

        return images;
    }

    /**
     * Clean up object URLs to prevent memory leaks
     * @param {Array<{url: string}>} images 
     */
    revokeURLs(images) {
        for (const image of images) {
            if (image.url) {
                URL.revokeObjectURL(image.url);
            }
        }
    }
}

// Export for use
window.MPOParser = MPOParser;
