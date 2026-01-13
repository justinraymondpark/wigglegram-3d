# PC Setup Guide (Windows with NVIDIA GPU)

This guide walks you through setting up ML Sharp on your Windows PC to generate Gaussian splats from images.

## 📋 Prerequisites

1. **NVIDIA GPU** with CUDA support (GTX 1060+ recommended)
2. **NVIDIA Drivers** - Latest from nvidia.com
3. **Conda** (Anaconda or Miniconda) - https://docs.conda.io/en/latest/miniconda.html
4. **Git** - https://git-scm.com/download/win

## 🔧 Installation

### Step 1: Install CUDA Toolkit

Download and install CUDA Toolkit 12.x from:
https://developer.nvidia.com/cuda-downloads

Select: Windows → x86_64 → 10/11 → exe (local)

### Step 2: Clone ML Sharp

Open a terminal (PowerShell or Command Prompt):

```bash
git clone https://github.com/apple/ml-sharp
cd ml-sharp
```

### Step 3: Create Conda Environment

```bash
conda create -n sharp python=3.13
conda activate sharp
```

### Step 4: Install Dependencies

```bash
pip install -r requirements.txt
```

### Step 5: Test Installation

```bash
sharp --help
```

You should see the help output with available commands.

## 🎨 Creating Splats

### Basic Usage

```bash
# Process a single image
sharp predict -i path/to/photo.jpg -o path/to/output/

# Process multiple images in a folder
sharp predict -i path/to/images/ -o path/to/output/
```

### Output

For each input image, you'll get:
- `output/<image_name>/point_cloud.ply` - The Gaussian splat file

### Example

```bash
# If you have a photo at C:\Photos\vacation.jpg
sharp predict -i C:\Photos\vacation.jpg -o C:\Splats\

# Output will be at: C:\Splats\vacation\point_cloud.ply
```

## 📱 Viewing on Phone

1. **Upload the `.ply` file** to the web app:
   - Either drop it on the web page
   - Or add it to the `samples/` folder and redeploy

2. **Open the Netlify URL** on your phone

3. **Tilt to explore!** 🎉

## 🔄 Workflow for MPO Files

If you have stereo MPO files and want to create splats:

1. **Extract left image from MPO**:
   ```bash
   # Python one-liner to extract
   python -c "from PIL import Image; img = Image.open('photo.mpo'); img.save('photo.jpg')"
   ```

2. **Process with ML Sharp**:
   ```bash
   sharp predict -i photo.jpg -o output/
   ```

## ⚠️ Troubleshooting

### "CUDA not found" error
- Make sure NVIDIA drivers are installed
- Reinstall CUDA Toolkit
- Restart your terminal after installation

### Out of memory
- Try smaller images (resize to 1024px)
- Close other GPU-intensive applications
- Use `--low-memory` flag if available

### Slow processing
- First run downloads the model (~2GB)
- Subsequent runs should be faster
- GPU processing takes 1-5 seconds per image

## 📊 Performance

Typical processing times (RTX 3080):
- 1024x1024 image: ~1 second
- 2048x2048 image: ~2-3 seconds
- 4K image: ~5-10 seconds

## 🔗 Next Steps

After generating splats:

1. Copy the `.ply` files to the `samples/` folder
2. Commit and push to GitHub:
   ```bash
   git add samples/*.ply
   git commit -m "Add splat files"
   git push
   ```
3. Netlify will auto-deploy
4. Test on your phone!

## 📝 Notes

- The model checkpoint (~2GB) is downloaded on first run
- It's cached at `~/.cache/torch/hub/checkpoints/`
- You can manually download it if needed:
  ```bash
  wget https://ml-site.cdn-apple.com/models/sharp/sharp_2572gikvuh.pt
  ```
