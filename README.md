# Wigglegram 3D

A web-based wigglegram viewer that creates gyroscope-controlled 3D parallax effects from stereo images (MPO files) or single images with depth estimation.

## Features

- 📸 **MPO File Support** - Load stereo pairs from Nintendo 3DS, Samsung NX500, and other 3D cameras
- 🎮 **Gyroscope Control** - Tilt your phone to view images from different angles
- 🖱️ **Mouse/Touch Fallback** - Works on desktop with mouse movement
- 🎨 **Depth-based Parallax** - Objects at different depths move at different speeds
- ⚙️ **Adjustable Settings** - Control sensitivity, smoothing, and depth intensity

## How It Works

1. **For MPO files**: Extracts the stereo pair and computes a depth map from the disparity
2. **For single images**: Uses edge detection and gradient-based depth estimation
3. **Renders** a 3D mesh with depth displacement using Three.js and WebGL shaders
4. **Controls** the view angle via gyroscope (mobile) or mouse (desktop)

## Usage

1. Open the app in a browser (requires HTTPS for gyroscope on mobile)
2. Drop an MPO file or image onto the drop zone
3. Tilt your device or move your mouse to see the 3D effect!

## Local Development

```bash
# Simple HTTP server (no gyroscope on mobile)
python3 -m http.server 8080

# HTTPS server (for mobile gyroscope)
node https-server.js
```

## Future Plans

- Integration with [Apple ML Sharp](https://github.com/apple/ml-sharp) for high-quality monocular depth estimation
- Support for ONNX/TensorFlow.js depth models running in-browser
- Export to video/GIF

## Credits

- Depth displacement shader inspired by Three.js examples
- MPO parsing based on JPEG/JFIF specification
