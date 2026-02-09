// Camera capture module

const Camera = {
  currentImageBase64: null,

  init() {
    const cameraInput = document.getElementById('camera-input');
    const libraryInput = document.getElementById('library-input');
    cameraInput.addEventListener('change', (e) => this.handleCapture(e));
    libraryInput.addEventListener('change', (e) => this.handleCapture(e));
  },

  handleCapture(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      App.showToast('Please select an image file', 'error');
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      App.showToast('Image too large (max 10MB)', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      this.currentImageBase64 = e.target.result;
      this.showPreview(e.target.result);
    };
    reader.onerror = () => {
      App.showToast('Failed to read image', 'error');
    };
    reader.readAsDataURL(file);
  },

  showPreview(dataUrl) {
    const img = document.getElementById('preview-image');
    img.src = dataUrl;
    App.showScreen('preview');
  },

  getImageBase64() {
    return this.currentImageBase64;
  },

  reset() {
    this.currentImageBase64 = null;
    document.getElementById('camera-input').value = '';
    document.getElementById('library-input').value = '';
    document.getElementById('preview-image').src = '';
  }
};
