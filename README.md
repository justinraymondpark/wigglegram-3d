# Wigglegram 3D

A web-based wigglegram viewer that creates gyroscope-controlled 3D experiences from images using Gaussian Splatting.

## 🎯 Goal

Turn flat photos (or stereo MPO files) into smooth, gyroscope-controlled 3D wigglegrams - like Apple's Spatial Photos but for any image!

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    YOUR WORKFLOW                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   1. PC with NVIDIA GPU          2. Web App (any device)    │
│   ─────────────────────          ────────────────────────   │
│                                                              │
│   ┌─────────┐                    ┌────────────────────┐     │
│   │  Photo  │                    │   Splat Viewer     │     │
│   │  .jpg   │──► ML Sharp ──►    │   + Gyroscope      │     │
│   │  .png   │    (CUDA)          │   + Touch/Mouse    │     │
│   └─────────┘        │           └────────────────────┘     │
│                      │                    ▲                  │
│                      ▼                    │                  │
│               ┌───────────┐               │                  │
│               │  .splat   │───────────────┘                  │
│               │   file    │     (upload to Netlify)          │
│               └───────────┘                                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
wigglegram-3d/
├── index.html          # Main web app
├── styles.css          # UI styling
├── app.js              # App controller
├── wiggle-viewer.js    # Three.js 3D viewer (current)
├── splat-viewer.js     # Gaussian splat viewer (TODO)
├── mpo-parser.js       # MPO stereo file parser
├── depth-processor.js  # Simple depth estimation
├── samples/            # Put your .splat files here
└── SETUP_PC.md         # Instructions for PC with GPU
```

## 🚀 Quick Start

### Viewing Pre-made Splats (Any Device)

1. Visit the deployed site: [your-netlify-url]
2. Drop a `.splat` or `.ply` file onto the page
3. Tilt your phone or move your mouse to explore!

### Creating Splats (Requires NVIDIA GPU)

See **[SETUP_PC.md](./SETUP_PC.md)** for detailed instructions.

TL;DR:
```bash
# Install ML Sharp
conda create -n sharp python=3.13
conda activate sharp
pip install -r requirements.txt

# Process an image
sharp predict -i photo.jpg -o output/
# Creates: output/photo/point_cloud.ply
```

## 📱 Features

- **Gyroscope control** - Tilt phone to shift perspective
- **Mouse/touch fallback** - Works on desktop too
- **Multiple file formats**:
  - `.splat` - Optimized Gaussian splat format
  - `.ply` - Standard point cloud format
  - `.mpo` - Stereo pairs (Nintendo 3DS, Samsung NX, etc.)

## 🔧 Development

```bash
# Clone the repo
git clone https://github.com/justinraymondpark/wigglegram-3d
cd wigglegram-3d

# Start local server
python3 -m http.server 8080
# or
node https-server.js  # for HTTPS (needed for mobile gyroscope)

# Open http://localhost:8080
```

## 📋 TODO

- [ ] Integrate gsplat.js for proper Gaussian splat rendering
- [ ] Add gyroscope controls to splat camera
- [ ] Create preprocessing pipeline for MPO → splat
- [ ] Add progress indicator for large splat files
- [ ] Support for camera trajectory animations

## 🔗 Related Projects

- [Apple ML Sharp](https://github.com/apple/ml-sharp) - Single image → Gaussian splat
- [gsplat.js](https://github.com/huggingface/gsplat.js) - WebGL Gaussian splat viewer
- [antimatter15/splat](https://github.com/antimatter15/splat) - Minimal WebGL splat viewer

## 📝 License

MIT
