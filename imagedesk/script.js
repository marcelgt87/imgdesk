class ImageDesk {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.desk = document.getElementById('desk');
        this.selectionBox = document.getElementById('selectionBox');
        this.folderInput = document.getElementById('folderInput');
        this.imageCount = document.getElementById('imageCount');
        this.loadingIndicator = document.getElementById('loadingIndicator');
        this.arrangeBtn = document.getElementById('arrangeBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.thresholdSlider = document.getElementById('thresholdSlider');
        this.thresholdValue = document.getElementById('thresholdValue');
        
        // State
        this.images = [];
        this.selectedImages = new Set();
        this.favoriteImages = new Set();
        this.imageHashes = new Map(); // Store perceptual hashes
        this.similarityThreshold = 0.75; // Similarity threshold for highlighting
        this.groupingThreshold = 0.65; // Lower threshold for grouping (more permissive)
        this.scale = 1;
        this.panX = 0;
        this.panY = 0;
        this.isDragging = false;
        this.isPanning = false;
        this.isSelecting = false;
        this.dragStartPos = { x: 0, y: 0 };
        this.selectionStart = { x: 0, y: 0 };
        this.lastMousePos = { x: 0, y: 0 };
        this.nextZIndex = 1;
        this.baseZIndex = 1;
        this.panningRAF = false;
        this.wheelRAF = false;
        
        // Clustering state
        this.clusters = new Map(); // Map of cluster IDs to cluster data
        this.clusteredImages = new Set(); // Images that are part of a cluster
        this.nextClusterId = 1;
        
        this.initializeEventListeners();
        this.updateTransform();
        this.createOverlay();
    }
    
    initializeEventListeners() {
        // Folder input
        this.folderInput.addEventListener('change', (e) => this.loadImages(e.target.files));
        
        // Arrange button
        this.arrangeBtn.addEventListener('click', () => this.arrangeBySimilarity());
        
        // Clear button
        this.clearBtn.addEventListener('click', () => this.clearAllImages());
        
        // Threshold slider
        this.thresholdSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            this.groupingThreshold = value;
            this.thresholdValue.textContent = value.toFixed(2);
        });
        
        // Mouse events for desk
        this.desk.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.desk.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.desk.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.desk.addEventListener('wheel', (e) => this.handleWheel(e));
        
        // Context menu prevention (only prevent on desk, allow on images for favorites)
        this.desk.addEventListener('contextmenu', (e) => {
            if (e.target === this.desk) {
                e.preventDefault();
            }
        });
        
        // Keyboard events
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        
        // Window resize handler
        window.addEventListener('resize', () => this.handleResize());
    }
    
    async loadImages(files) {
        if (!files || files.length === 0) return;
        
        this.showLoading();
        this.clearImages();
        
        const imageFiles = Array.from(files).filter(file => 
            file.type.startsWith('image/')
        );
        
        const loadPromises = imageFiles.map((file, index) => 
            this.createImageItem(file, index)
        );
        
        try {
            await Promise.all(loadPromises);
            this.updateImageCount();
            // Generate hashes and arrange by similarity
            await this.generateImageHashes();
            this.arrangeBySimilarity();
        } catch (error) {
            console.error('Error loading images:', error);
        } finally {
            this.hideLoading();
        }
    }
    
    createImageItem(file, index) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                const img = document.createElement('img');
                img.src = e.target.result;
                img.alt = file.name;
                
                img.onload = () => {
                    const imageItem = document.createElement('div');
                    imageItem.className = 'image-item';
                    imageItem.appendChild(img);
                    
                    // Position images in a spiral pattern
                    const angle = index * 0.5;
                    const radius = Math.sqrt(index) * 50;
                    const x = Math.cos(angle) * radius + 400 + Math.random() * 200;
                    const y = Math.sin(angle) * radius + 300 + Math.random() * 200;
                    
                    imageItem.style.left = x + 'px';
                    imageItem.style.top = y + 'px';
                    imageItem.style.zIndex = this.nextZIndex++;
                    
                    // Create filename tooltip
                    const filenameTooltip = document.createElement('div');
                    filenameTooltip.className = 'filename-tooltip';
                    filenameTooltip.textContent = file.name;
                    imageItem.appendChild(filenameTooltip);
                    
                    // Store image data
                    imageItem.imageData = {
                        file: file,
                        x: x,
                        y: y,
                        element: imageItem,
                        zIndex: imageItem.style.zIndex,
                        isFavorite: false,
                        hash: null, // Will be populated later
                        clusterId: null, // Cluster ID if this image is part of a cluster
                        isClusterRepresentative: false // Whether this image represents a cluster
                    };
                    
                    this.canvas.appendChild(imageItem);
                    this.images.push(imageItem);
                    
                    // Add image-specific event listeners
                    this.addImageEventListeners(imageItem);
                    
                    resolve();
                };
                
                img.onerror = reject;
            };
            
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
    
    addImageEventListeners(imageItem) {
        let clickStartTime = 0;
        let dragStarted = false;
        let mouseMoved = false;
        
        imageItem.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            
            if (e.button === 0) { // Left click
                clickStartTime = Date.now();
                dragStarted = false;
                mouseMoved = false;
                
                // Bring image to front when clicked
                this.bringToFront(imageItem);
                
                // Select the image if not already selected (unless ctrl/cmd is held)
                if (!e.ctrlKey && !e.metaKey) {
                    if (!this.selectedImages.has(imageItem)) {
                        this.clearSelection();
                        this.selectImage(imageItem);
                        // Highlight similar images
                        this.highlightSimilarImages(imageItem);
                    }
                } else {
                    this.toggleImageSelection(imageItem);
                }
                
                // Start dragging immediately
                this.startDragging(e, imageItem);
                dragStarted = true;
            }
        });
        
        // Track mouse movement to distinguish between click and drag
        imageItem.addEventListener('mousemove', (e) => {
            if (dragStarted) {
                mouseMoved = true;
            }
        });
        
        imageItem.addEventListener('mouseup', (e) => {
            if (e.button === 0) {
                const clickDuration = Date.now() - clickStartTime;
                
                // Handle double-click for fullscreen (only if no dragging occurred)
                if (!mouseMoved && clickDuration < 300) {
                    // Check for double-click
                    if (imageItem._lastClickTime && (clickStartTime - imageItem._lastClickTime) < 400) {
                        this.showFullscreen(imageItem);
                        imageItem._lastClickTime = 0; // Reset to prevent triple-click issues
                    } else {
                        imageItem._lastClickTime = clickStartTime;
                    }
                }
                
                dragStarted = false;
                mouseMoved = false;
            }
        });
        
        // Right click - remove default context menu but don't handle favorites
        imageItem.addEventListener('contextmenu', (e) => {
            e.stopPropagation();
            e.preventDefault();
        });
    }
    
    handleMouseDown(e) {
        this.lastMousePos = { x: e.clientX, y: e.clientY };
        
        if (e.button === 1) { // Middle mouse button - start panning
            this.isPanning = true;
            this.desk.classList.add('panning');
            e.preventDefault();
        } else if (e.button === 0) {
            // Check if click is on empty area (not on an image)
            const isOnEmptyArea = this.isClickOnEmptyArea(e);
            
            console.log('Mouse down - Target:', e.target.tagName, e.target.className, 'Empty area:', isOnEmptyArea);
            
            if (isOnEmptyArea) {
                // Left click on empty area - start selection
                this.clearSelection();
                this.startSelection(e);
            }
        }
        
        // Prevent default behavior that might interfere with dragging
        if (e.button === 0) {
            e.preventDefault();
        }
    }
    
    isClickOnEmptyArea(e) {
        const target = e.target;
        
        // Direct hits on background elements
        if (target === this.desk || 
            target === this.canvas || 
            target === this.selectionBox) {
            return true;
        }
        
        // Check if we're clicking on an image or any of its children
        let current = target;
        while (current) {
            if (current.classList && current.classList.contains('image-item')) {
                return false; // Click is on an image
            }
            if (current === this.canvas || current === this.desk) {
                break; // Reached container, stop searching
            }
            current = current.parentElement;
        }
        
        // Additional check: if target has no specific classes and is within our canvas area
        const targetClasses = target.classList;
        if (!targetClasses || targetClasses.length === 0) {
            return true; // Likely empty background
        }
        
        // Check for known non-image elements
        const allowedClasses = ['canvas', 'desk', 'selection-box'];
        for (const className of targetClasses) {
            if (allowedClasses.includes(className)) {
                return true;
            }
        }
        
        return true; // Default to allowing selection (be permissive)
    }
    
    handleMouseMove(e) {
        const deltaX = e.clientX - this.lastMousePos.x;
        const deltaY = e.clientY - this.lastMousePos.y;
        
        if (this.isPanning) {
            this.panX += deltaX;
            this.panY += deltaY;
            
            // Use requestAnimationFrame for smoother panning
            if (!this.panningRAF) {
                this.panningRAF = true;
                requestAnimationFrame(() => {
                    this.updateTransform();
                    this.panningRAF = false;
                });
            }
        } else if (this.isDragging && this.selectedImages.size > 0) {
            // Provide visual feedback during dragging
            this.dragSelectedImages(deltaX / this.scale, deltaY / this.scale);
            this.desk.style.cursor = 'grabbing';
        } else if (this.isSelecting) {
            this.updateSelection(e);
        }
        
        this.lastMousePos = { x: e.clientX, y: e.clientY };
    }
    
    handleMouseUp(e) {
        if (this.isPanning) {
            this.isPanning = false;
            this.desk.classList.remove('panning');
        }
        
        if (this.isDragging) {
            this.stopDragging();
        }
        
        if (this.isSelecting) {
            this.finishSelection();
        }
        
        // Reset cursor
        this.desk.style.cursor = 'grab';
    }
    
    handleWheel(e) {
        e.preventDefault();
        
        if (e.shiftKey) {
            // Pan when Shift is held
            const panSpeed = 2; // Increase for faster panning
            
            // Handle both vertical and horizontal wheel movement
            if (e.deltaX !== 0) {
                // Horizontal wheel movement (trackpad sideways scroll)
                this.panX -= e.deltaX * panSpeed;
            }
            
            if (e.deltaY !== 0) {
                // Vertical panning with Shift + wheel
                this.panY -= e.deltaY * panSpeed;
            }
            
            // Use requestAnimationFrame for smoother updates
            if (!this.wheelRAF) {
                this.wheelRAF = true;
                requestAnimationFrame(() => {
                    this.updateTransform();
                    this.wheelRAF = false;
                });
            }
        } else {
            // Zoom by default (without any modifier keys)
            const rect = this.desk.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            const zoom = e.deltaY > 0 ? 0.9 : 1.1;
            const newScale = Math.max(0.1, Math.min(5, this.scale * zoom));
            
            if (newScale !== this.scale) {
                // Zoom towards mouse position
                const scaleRatio = newScale / this.scale;
                this.panX = mouseX - (mouseX - this.panX) * scaleRatio;
                this.panY = mouseY - (mouseY - this.panY) * scaleRatio;
                this.scale = newScale;
                
                this.updateTransform();
            }
        }
    }
    
    handleKeyDown(e) {
        if (e.key === 'Delete' || e.key === 'Backspace') {
            this.deleteSelectedImages();
        } else if (e.key === 'Escape') {
            this.clearSelection();
        } else if (e.key === 'a' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            this.selectAllImages();
        } else if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            this.arrangeBySimilarity();
        } else if (e.key === 'r' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            this.clearAllImages();
        } else if (e.key === 'c' || e.key === 'C') {
            if (this.selectedImages.size > 1) {
                this.showClusterModal();
            }
        } else if (e.key === 'f' || e.key === 'F') {
            // Toggle favorite for all selected images
            if (this.selectedImages.size > 0) {
                this.selectedImages.forEach(imageItem => {
                    this.toggleFavorite(imageItem);
                });
            }
        }
    }
    
    startDragging(e, imageItem) {
        this.isDragging = true;
        this.dragStartPos = { x: e.clientX, y: e.clientY };
        
        // Ensure the clicked image is selected if not already
        if (!this.selectedImages.has(imageItem)) {
            this.clearSelection();
            this.selectImage(imageItem);
        }
        
        // Bring all selected images to front when dragging starts
        this.selectedImages.forEach(img => {
            img.classList.add('dragging');
            img.style.zIndex = this.nextZIndex++;
            img.imageData.zIndex = img.style.zIndex;
        });
        
        // Change cursor to indicate dragging
        this.desk.style.cursor = 'grabbing';
        
        // Prevent default to avoid text selection or other interference
        e.preventDefault();
    }
    
    stopDragging() {
        this.isDragging = false;
        this.selectedImages.forEach(img => {
            img.classList.remove('dragging');
            // Restore transitions after dragging
            img.style.transition = '';
        });
        
        // Reset cursor
        this.desk.style.cursor = 'grab';
    }
    
    dragSelectedImages(deltaX, deltaY) {
        this.selectedImages.forEach(imageItem => {
            imageItem.imageData.x += deltaX;
            imageItem.imageData.y += deltaY;
            imageItem.style.left = imageItem.imageData.x + 'px';
            imageItem.style.top = imageItem.imageData.y + 'px';
            
            // Temporarily disable transitions during dragging for smoother movement
            imageItem.style.transition = 'none';
        });
    }
    
    startSelection(e) {
        this.isSelecting = true;
        const rect = this.desk.getBoundingClientRect();
        
        // Convert screen coordinates to canvas coordinates
        this.selectionStart = {
            x: (e.clientX - rect.left - this.panX) / this.scale,
            y: (e.clientY - rect.top - this.panY) / this.scale
        };
        
        this.selectionBox.style.display = 'block';
        this.updateSelection(e);
    }
    
    updateSelection(e) {
        const rect = this.desk.getBoundingClientRect();
        
        // Convert current mouse position to canvas coordinates
        const currentX = (e.clientX - rect.left - this.panX) / this.scale;
        const currentY = (e.clientY - rect.top - this.panY) / this.scale;
        
        // Calculate selection box bounds in canvas coordinates
        const left = Math.min(this.selectionStart.x, currentX);
        const top = Math.min(this.selectionStart.y, currentY);
        const width = Math.abs(currentX - this.selectionStart.x);
        const height = Math.abs(currentY - this.selectionStart.y);
        
        // Apply the selection box position and size
        this.selectionBox.style.left = left + 'px';
        this.selectionBox.style.top = top + 'px';
        this.selectionBox.style.width = width + 'px';
        this.selectionBox.style.height = height + 'px';
    }
    
    finishSelection() {
        this.isSelecting = false;
        this.selectionBox.style.display = 'none';
        
        // Get selection bounds directly from the selection box style
        const selectionLeft = parseFloat(this.selectionBox.style.left);
        const selectionTop = parseFloat(this.selectionBox.style.top);
        const selectionWidth = parseFloat(this.selectionBox.style.width);
        const selectionHeight = parseFloat(this.selectionBox.style.height);
        
        const selectionRight = selectionLeft + selectionWidth;
        const selectionBottom = selectionTop + selectionHeight;
        
        // Check each image for intersection with selection box
        this.images.forEach(imageItem => {
            const imgLeft = imageItem.imageData.x;
            const imgTop = imageItem.imageData.y;
            
            // Get image dimensions (need to account for max-width/height CSS)
            const img = imageItem.querySelector('img');
            const imgRect = img.getBoundingClientRect();
            const canvasRect = this.canvas.getBoundingClientRect();
            
            // Convert image size to canvas coordinates
            const imgWidth = (imgRect.width / this.scale);
            const imgHeight = (imgRect.height / this.scale);
            
            const imgRight = imgLeft + imgWidth;
            const imgBottom = imgTop + imgHeight;
            
            // Check if image intersects with selection box
            if (imgLeft < selectionRight && imgRight > selectionLeft &&
                imgTop < selectionBottom && imgBottom > selectionTop) {
                this.selectImage(imageItem);
            }
        });
        
        console.log(`Selected ${this.selectedImages.size} images in selection area`);
    }
    
    selectImage(imageItem) {
        this.selectedImages.add(imageItem);
        imageItem.classList.add('selected');
    }
    
    toggleImageSelection(imageItem) {
        if (this.selectedImages.has(imageItem)) {
            this.selectedImages.delete(imageItem);
            imageItem.classList.remove('selected');
        } else {
            this.selectImage(imageItem);
        }
    }
    
    clearSelection() {
        this.selectedImages.forEach(imageItem => {
            imageItem.classList.remove('selected');
        });
        this.selectedImages.clear();
        // Clear similarity highlights
        this.images.forEach(img => img.classList.remove('similar'));
    }
    
    selectAllImages() {
        this.images.forEach(imageItem => {
            this.selectImage(imageItem);
        });
    }
    
    deleteSelectedImages() {
        this.selectedImages.forEach(imageItem => {
            this.canvas.removeChild(imageItem);
            const index = this.images.indexOf(imageItem);
            if (index > -1) {
                this.images.splice(index, 1);
            }
        });
        this.selectedImages.clear();
        this.updateImageCount();
    }
    
    clearImages() {
        this.images.forEach(imageItem => {
            this.canvas.removeChild(imageItem);
        });
        this.images = [];
        this.selectedImages.clear();
        this.favoriteImages.clear();
        this.imageHashes.clear();
        this.clusters.clear();
        this.clusteredImages.clear();
        this.updateImageCount();
    }
    
    clearAllImages() {
        if (this.images.length === 0) {
            return; // Nothing to clear
        }
        
        // Show confirmation dialog
        const confirmed = confirm(
            `Are you sure you want to clear all ${this.images.length} images? This action cannot be undone.`
        );
        
        if (confirmed) {
            this.clearImages();
            
            // Reset canvas position and zoom
            this.scale = 1;
            this.panX = 0;
            this.panY = 0;
            this.updateTransform();
            
            // Reset z-index counter
            this.nextZIndex = 1;
            
            console.log('Canvas cleared successfully');
        }
    }
    
    updateTransform() {
        // Use transform3d for better performance
        this.canvas.style.transform = `translate3d(${this.panX}px, ${this.panY}px, 0) scale(${this.scale})`;
    }
    
    updateImageCount() {
        this.imageCount.textContent = `${this.images.length} images loaded`;
        this.arrangeBtn.disabled = this.images.length === 0;
        this.clearBtn.disabled = this.images.length === 0;
    }
    
    showLoading() {
        this.loadingIndicator.style.display = 'flex';
    }
    
    hideLoading() {
        this.loadingIndicator.style.display = 'none';
    }
    
    // New methods for enhanced features
    
    bringToFront(imageItem) {
        // Maintain z-index order, bring selected image to front
        imageItem.style.zIndex = this.nextZIndex++;
        imageItem.imageData.zIndex = imageItem.style.zIndex;
    }
    
    toggleFavorite(imageItem) {
        const isFavorite = this.favoriteImages.has(imageItem);
        
        if (isFavorite) {
            this.favoriteImages.delete(imageItem);
            imageItem.classList.remove('favorite');
            imageItem.imageData.isFavorite = false;
            // Remove star overlay
            this.removeFavoriteStar(imageItem);
        } else {
            this.favoriteImages.add(imageItem);
            imageItem.classList.add('favorite');
            imageItem.imageData.isFavorite = true;
            // Add star overlay
            this.addFavoriteStar(imageItem);
        }
    }
    
    addFavoriteStar(imageItem) {
        // Remove existing star if any
        this.removeFavoriteStar(imageItem);
        
        const star = document.createElement('div');
        star.className = 'favorite-star';
        star.innerHTML = '★';
        star.title = 'Favorite image';
        
        imageItem.appendChild(star);
    }
    
    removeFavoriteStar(imageItem) {
        const existingStar = imageItem.querySelector('.favorite-star');
        if (existingStar) {
            existingStar.remove();
        }
    }
    
    createOverlay() {
        // Create fullscreen overlay
        this.overlay = document.createElement('div');
        this.overlay.className = 'fullscreen-overlay';
        this.overlay.style.display = 'none';
        
        this.overlayImg = document.createElement('img');
        this.overlayImg.className = 'fullscreen-image';
        
        this.closeBtn = document.createElement('button');
        this.closeBtn.className = 'close-btn';
        this.closeBtn.innerHTML = '✕';
        this.closeBtn.addEventListener('click', () => this.hideFullscreen());
        
        // Create filename display
        this.filenameDisplay = document.createElement('div');
        this.filenameDisplay.className = 'filename-display';
        this.filenameDisplay.textContent = '';
        
        this.overlay.appendChild(this.overlayImg);
        this.overlay.appendChild(this.closeBtn);
        this.overlay.appendChild(this.filenameDisplay);
        document.body.appendChild(this.overlay);
        
        // Close on overlay click (but not on image click)
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                this.hideFullscreen();
            }
        });
        
        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.overlay.style.display !== 'none') {
                this.hideFullscreen();
            }
        });
    }
    
    showFullscreen(imageItem) {
        const img = imageItem.querySelector('img');
        this.overlayImg.src = img.src;
        this.overlayImg.alt = img.alt;
        
        // Display the original filename
        const filename = imageItem.imageData.file.name;
        this.filenameDisplay.textContent = filename;
        
        this.overlay.style.display = 'flex';
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }
    
    hideFullscreen() {
        this.overlay.style.display = 'none';
        document.body.style.overflow = 'auto'; // Restore scrolling
    }
    
    handleResize() {
        // Handle window resize - adjust canvas if needed
        // The transform already handles most responsive behavior
        // This is where you could add logic to reposition images if they go off-screen
        this.updateTransform();
    }
    
    // Perceptual Hashing and Similarity Methods
    
    async generateImageHashes() {
        const hashPromises = this.images.map(async (imageItem) => {
            const img = imageItem.querySelector('img');
            const hash = await this.calculatePerceptualHash(img);
            imageItem.imageData.hash = hash;
            this.imageHashes.set(imageItem, hash);
        });
        
        await Promise.all(hashPromises);
    }
    
    calculatePerceptualHash(img) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Use larger canvas for better accuracy
            canvas.width = 16;
            canvas.height = 16;
            
            // Draw image scaled down with better quality
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, 16, 16);
            const imageData = ctx.getImageData(0, 0, 16, 16);
            
            // Convert to grayscale with better color weighting
            const grayValues = [];
            for (let i = 0; i < imageData.data.length; i += 4) {
                const r = imageData.data[i];
                const g = imageData.data[i + 1];
                const b = imageData.data[i + 2];
                // Use more accurate luminance formula
                const gray = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
                grayValues.push(gray);
            }
            
            // Apply simple DCT-like transformation for better similarity detection
            const dctValues = this.applyDCT(grayValues, 16, 16);
            
            // Use the low-frequency components (top-left 8x8)
            const lowFreq = [];
            for (let y = 0; y < 8; y++) {
                for (let x = 0; x < 8; x++) {
                    lowFreq.push(dctValues[y * 16 + x]);
                }
            }
            
            // Calculate median instead of average for better threshold
            const sortedValues = [...lowFreq].sort((a, b) => a - b);
            const median = sortedValues[Math.floor(sortedValues.length / 2)];
            
            // Generate hash based on whether each value is above or below median
            let hash = '';
            for (let i = 0; i < lowFreq.length; i++) {
                hash += lowFreq[i] > median ? '1' : '0';
            }
            
            resolve(hash);
        });
    }
    
    // Simple DCT approximation for better perceptual hashing
    applyDCT(values, width, height) {
        const result = new Array(values.length);
        
        for (let v = 0; v < height; v++) {
            for (let u = 0; u < width; u++) {
                let sum = 0;
                for (let y = 0; y < height; y++) {
                    for (let x = 0; x < width; x++) {
                        const cosU = Math.cos(((2 * x + 1) * u * Math.PI) / (2 * width));
                        const cosV = Math.cos(((2 * y + 1) * v * Math.PI) / (2 * height));
                        sum += values[y * width + x] * cosU * cosV;
                    }
                }
                
                const cu = u === 0 ? 1 / Math.sqrt(2) : 1;
                const cv = v === 0 ? 1 / Math.sqrt(2) : 1;
                result[v * width + u] = (cu * cv * sum) / 4;
            }
        }
        
        return result;
    }
    
    calculateHammingDistance(hash1, hash2) {
        if (hash1.length !== hash2.length) return Infinity;
        
        let distance = 0;
        for (let i = 0; i < hash1.length; i++) {
            if (hash1[i] !== hash2[i]) {
                distance++;
            }
        }
        return distance;
    }
    
    calculateSimilarity(imageItem1, imageItem2) {
        const hash1 = imageItem1.imageData.hash;
        const hash2 = imageItem2.imageData.hash;
        
        if (!hash1 || !hash2) return 0;
        
        // Calculate perceptual hash similarity
        const hammingDistance = this.calculateHammingDistance(hash1, hash2);
        const maxDistance = hash1.length; // 64 for current hash size
        const hashSimilarity = 1 - (hammingDistance / maxDistance);
        
        // Add filename similarity as a secondary metric
        const filenameSimilarity = this.calculateFilenameSimilarity(
            imageItem1.imageData.file.name,
            imageItem2.imageData.file.name
        );
        
        // Combine both metrics with perceptual hash being primary
        const combinedSimilarity = hashSimilarity * 0.85 + filenameSimilarity * 0.15;
        
        return combinedSimilarity;
    }
    
    calculateFilenameSimilarity(name1, name2) {
        // Remove extensions and normalize
        const normalize = (name) => {
            return name.toLowerCase()
                .replace(/\.[^/.]+$/, '') // Remove extension
                .replace(/[_\-\s]+/g, ' ') // Replace separators with spaces
                .trim();
        };
        
        const norm1 = normalize(name1);
        const norm2 = normalize(name2);
        
        // Check for common patterns (IMG_, DSC_, etc.)
        const commonPrefixes = /^(img|dsc|p|photo|image|pic)[\s_\-]*\d+/i;
        const prefix1 = norm1.match(commonPrefixes);
        const prefix2 = norm2.match(commonPrefixes);
        
        if (prefix1 && prefix2) {
            // Both have similar prefixes, check if they're sequential
            const num1 = parseInt(norm1.replace(/\D/g, ''));
            const num2 = parseInt(norm2.replace(/\D/g, ''));
            if (!isNaN(num1) && !isNaN(num2)) {
                const diff = Math.abs(num1 - num2);
                if (diff <= 5) return 0.8; // Sequential images likely similar
                if (diff <= 20) return 0.4;
            }
        }
        
        // Calculate simple string similarity
        const longer = norm1.length > norm2.length ? norm1 : norm2;
        const shorter = norm1.length > norm2.length ? norm2 : norm1;
        
        if (longer.length === 0) return 1.0;
        
        const distance = this.levenshteinDistance(longer, shorter);
        return (longer.length - distance) / longer.length * 0.3; // Lower weight for string similarity
    }
    
    levenshteinDistance(str1, str2) {
        const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
        
        for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
        for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
        
        for (let j = 1; j <= str2.length; j++) {
            for (let i = 1; i <= str1.length; i++) {
                const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[j][i] = Math.min(
                    matrix[j][i - 1] + 1,
                    matrix[j - 1][i] + 1,
                    matrix[j - 1][i - 1] + indicator
                );
            }
        }
        
        return matrix[str2.length][str1.length];
    }
    
    findSimilarImages(targetImage, threshold = null) {
        const similarityThreshold = threshold || this.similarityThreshold;
        const similarImages = [];
        
        this.images.forEach(imageItem => {
            if (imageItem === targetImage) return;
            
            const similarity = this.calculateSimilarity(targetImage, imageItem);
            if (similarity >= similarityThreshold) {
                similarImages.push({
                    image: imageItem,
                    similarity: similarity
                });
            }
        });
        
        // Sort by similarity (highest first)
        return similarImages.sort((a, b) => b.similarity - a.similarity);
    }
    
    arrangeBySimilarity() {
        if (this.images.length === 0) return;
        
        // Create similarity matrix for better clustering
        const similarityMatrix = this.createSimilarityMatrix();
        
        // Use improved clustering algorithm
        const groups = this.clusterImages(similarityMatrix, this.groupingThreshold);
        
        // Sort groups by size (largest first) and average similarity
        groups.sort((a, b) => {
            if (a.length !== b.length) return b.length - a.length;
            return b.avgSimilarity - a.avgSimilarity;
        });
        
        console.log(`Grouped ${this.images.length} images into ${groups.length} groups:`, 
                   groups.map(g => `${g.length} images (avg similarity: ${g.avgSimilarity?.toFixed(2)})`));
        
        // Arrange groups in a grid pattern
        this.arrangeGroupsOnDesk(groups);
    }
    
    createSimilarityMatrix() {
        const matrix = [];
        for (let i = 0; i < this.images.length; i++) {
            matrix[i] = [];
            for (let j = 0; j < this.images.length; j++) {
                if (i === j) {
                    matrix[i][j] = 1.0;
                } else if (i < j) {
                    const similarity = this.calculateSimilarity(this.images[i], this.images[j]);
                    matrix[i][j] = similarity;
                    matrix[j] = matrix[j] || [];
                    matrix[j][i] = similarity;
                } else if (!matrix[i][j]) {
                    matrix[i][j] = matrix[j][i];
                }
            }
        }
        return matrix;
    }
    
    clusterImages(similarityMatrix, threshold) {
        const groups = [];
        const processed = new Set();
        
        for (let i = 0; i < this.images.length; i++) {
            if (processed.has(i)) continue;
            
            const group = { images: [this.images[i]], indices: [i], similarities: [] };
            processed.add(i);
            
            // Find all similar images using recursive clustering
            const queue = [i];
            
            while (queue.length > 0) {
                const currentIndex = queue.shift();
                
                for (let j = 0; j < this.images.length; j++) {
                    if (processed.has(j)) continue;
                    
                    const similarity = similarityMatrix[currentIndex][j];
                    if (similarity >= threshold) {
                        group.images.push(this.images[j]);
                        group.indices.push(j);
                        group.similarities.push(similarity);
                        processed.add(j);
                        queue.push(j);
                    }
                }
            }
            
            // Calculate average similarity for the group
            if (group.similarities.length > 0) {
                group.avgSimilarity = group.similarities.reduce((a, b) => a + b, 0) / group.similarities.length;
            } else {
                group.avgSimilarity = 1.0; // Single image group
            }
            
            groups.push(group.images);
            groups[groups.length - 1].avgSimilarity = group.avgSimilarity;
        }
        
        return groups;
    }
    
    arrangeGroupsOnDesk(groups) {
        const groupSpacing = 300; // Space between groups
        const imageSpacing = 120; // Space between images in a group
        const startX = 100;
        const startY = 100;
        
        let currentGroupX = startX;
        let currentGroupY = startY;
        const maxGroupsPerRow = Math.max(1, Math.floor(Math.sqrt(groups.length)));
        
        groups.forEach((group, groupIndex) => {
            // Arrange images within the group in a small cluster
            const groupCenterX = currentGroupX;
            const groupCenterY = currentGroupY;
            
            group.forEach((imageItem, imageIndex) => {
                let x, y;
                
                if (group.length === 1) {
                    // Single image, place at center
                    x = groupCenterX;
                    y = groupCenterY;
                } else {
                    // Multiple images, arrange in a small spiral around the center
                    const angle = (imageIndex / group.length) * 2 * Math.PI;
                    const radius = Math.min(50 + imageIndex * 20, 100);
                    x = groupCenterX + Math.cos(angle) * radius;
                    y = groupCenterY + Math.sin(angle) * radius;
                }
                
                // Update image position with smooth animation
                this.animateImageToPosition(imageItem, x, y);
            });
            
            // Move to next group position
            if ((groupIndex + 1) % maxGroupsPerRow === 0) {
                currentGroupX = startX;
                currentGroupY += groupSpacing;
            } else {
                currentGroupX += groupSpacing;
            }
        });
    }
    
    animateImageToPosition(imageItem, targetX, targetY) {
        const currentX = imageItem.imageData.x;
        const currentY = imageItem.imageData.y;
        const duration = 1000; // 1 second animation
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function (ease-out)
            const easeOut = 1 - Math.pow(1 - progress, 3);
            
            const newX = currentX + (targetX - currentX) * easeOut;
            const newY = currentY + (targetY - currentY) * easeOut;
            
            imageItem.imageData.x = newX;
            imageItem.imageData.y = newY;
            imageItem.style.left = newX + 'px';
            imageItem.style.top = newY + 'px';
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }
    
    // Method to manually trigger similarity arrangement
    groupSimilarImages() {
        this.arrangeBySimilarity();
    }
    
    // Method to find duplicates (very high similarity)
    findDuplicates(threshold = 0.95) {
        const duplicates = [];
        const processed = new Set();
        
        this.images.forEach(imageItem => {
            if (processed.has(imageItem)) return;
            
            const similarImages = this.findSimilarImages(imageItem, threshold);
            if (similarImages.length > 0) {
                const duplicateGroup = [imageItem, ...similarImages.map(s => s.image)];
                duplicates.push(duplicateGroup);
                duplicateGroup.forEach(img => processed.add(img));
            }
        });
        
        return duplicates;
    }
    
    // Method to highlight similar images when one is selected
    highlightSimilarImages(targetImage) {
        // Clear previous highlights
        this.images.forEach(img => img.classList.remove('similar'));
        
        const similarImages = this.findSimilarImages(targetImage, this.similarityThreshold);
        similarImages.forEach(({ image }) => {
            image.classList.add('similar');
        });
        
        console.log(`Found ${similarImages.length} similar images for ${targetImage.imageData.file.name}:`,
                   similarImages.map(s => `${s.image.imageData.file.name} (${s.similarity.toFixed(2)})`));
    }
    
    // Clustering Methods
    
    showClusterModal() {
        // Create modal overlay
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'cluster-modal-overlay';
        
        const modal = document.createElement('div');
        modal.className = 'cluster-modal';
        
        // Modal header
        const header = document.createElement('div');
        header.className = 'cluster-modal-header';
        header.innerHTML = '<h3>Create Cluster</h3><p>Select which image should represent this cluster:</p>';
        
        // Images grid
        const imagesGrid = document.createElement('div');
        imagesGrid.className = 'cluster-images-grid';
        
        // Add each selected image as an option
        let selectedRepresentative = null;
        this.selectedImages.forEach((imageItem, index) => {
            const imageOption = document.createElement('div');
            imageOption.className = 'cluster-image-option';
            
            const img = document.createElement('img');
            img.src = imageItem.querySelector('img').src;
            img.alt = imageItem.imageData.file.name;
            
            const filename = document.createElement('div');
            filename.className = 'cluster-image-filename';
            filename.textContent = imageItem.imageData.file.name;
            
            imageOption.appendChild(img);
            imageOption.appendChild(filename);
            
            // Make first image selected by default
            if (index === 0) {
                imageOption.classList.add('selected');
                selectedRepresentative = imageItem;
            }
            
            imageOption.addEventListener('click', () => {
                // Remove selection from all options
                imagesGrid.querySelectorAll('.cluster-image-option').forEach(option => {
                    option.classList.remove('selected');
                });
                // Select this option
                imageOption.classList.add('selected');
                selectedRepresentative = imageItem;
            });
            
            imagesGrid.appendChild(imageOption);
        });
        
        // Modal buttons
        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'cluster-modal-buttons';
        
        const createButton = document.createElement('button');
        createButton.className = 'cluster-create-btn';
        createButton.textContent = 'Create Cluster';
        createButton.addEventListener('click', () => {
            if (selectedRepresentative) {
                this.createCluster(Array.from(this.selectedImages), selectedRepresentative);
                document.body.removeChild(modalOverlay);
            }
        });
        
        const cancelButton = document.createElement('button');
        cancelButton.className = 'cluster-cancel-btn';
        cancelButton.textContent = 'Cancel';
        cancelButton.addEventListener('click', () => {
            document.body.removeChild(modalOverlay);
        });
        
        buttonsContainer.appendChild(createButton);
        buttonsContainer.appendChild(cancelButton);
        
        // Assemble modal
        modal.appendChild(header);
        modal.appendChild(imagesGrid);
        modal.appendChild(buttonsContainer);
        modalOverlay.appendChild(modal);
        
        // Close on overlay click
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                document.body.removeChild(modalOverlay);
            }
        });
        
        // Close on Escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                document.removeEventListener('keydown', escapeHandler);
                if (document.body.contains(modalOverlay)) {
                    document.body.removeChild(modalOverlay);
                }
            }
        };
        document.addEventListener('keydown', escapeHandler);
        
        document.body.appendChild(modalOverlay);
    }
    
    createCluster(images, representative) {
        const clusterId = `cluster-${this.nextClusterId++}`;
        
        // Create cluster data
        const clusterData = {
            id: clusterId,
            images: [...images],
            representative: representative,
            hidden: images.filter(img => img !== representative)
        };
        
        // Store cluster
        this.clusters.set(clusterId, clusterData);
        
        // Update image data
        images.forEach(imageItem => {
            imageItem.imageData.clusterId = clusterId;
            this.clusteredImages.add(imageItem);
            
            if (imageItem === representative) {
                imageItem.imageData.isClusterRepresentative = true;
                imageItem.classList.add('cluster-representative');
                // Add cluster indicator
                this.addClusterIndicator(imageItem, clusterData);
            } else {
                // Hide non-representative images
                imageItem.style.display = 'none';
            }
        });
        
        // Clear selection
        this.clearSelection();
        
        console.log(`Created cluster ${clusterId} with ${images.length} images, representative: ${representative.imageData.file.name}`);
    }
    
    addClusterIndicator(imageItem, clusterData) {
        // Remove existing indicator if any
        const existingIndicator = imageItem.querySelector('.cluster-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }
        
        const indicator = document.createElement('div');
        indicator.className = 'cluster-indicator';
        indicator.innerHTML = `<span class="cluster-count">${clusterData.images.length}</span>`;
        indicator.title = `Cluster with ${clusterData.images.length} images. Click to manage cluster.`;
        
        // Add click handler to open cluster
        indicator.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showClusterManagement(clusterData.id);
        });
        
        imageItem.appendChild(indicator);
    }
    
    showClusterManagement(clusterId) {
        const clusterData = this.clusters.get(clusterId);
        if (!clusterData) return;
        
        // Create management modal
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'cluster-modal-overlay';
        
        const modal = document.createElement('div');
        modal.className = 'cluster-modal cluster-management-modal';
        
        // Modal header
        const header = document.createElement('div');
        header.className = 'cluster-modal-header';
        header.innerHTML = `
            <h3>Manage Cluster</h3>
            <p>${clusterData.images.length} images in this cluster</p>
        `;
        
        // Images grid
        const imagesGrid = document.createElement('div');
        imagesGrid.className = 'cluster-images-grid';
        
        let selectedRepresentative = clusterData.representative;
        
        clusterData.images.forEach((imageItem) => {
            const imageOption = document.createElement('div');
            imageOption.className = 'cluster-image-option';
            
            if (imageItem === clusterData.representative) {
                imageOption.classList.add('selected');
                imageOption.classList.add('current-representative');
            }
            
            const img = document.createElement('img');
            img.src = imageItem.querySelector('img').src;
            img.alt = imageItem.imageData.file.name;
            
            const filename = document.createElement('div');
            filename.className = 'cluster-image-filename';
            filename.textContent = imageItem.imageData.file.name;
            
            if (imageItem === clusterData.representative) {
                const badge = document.createElement('div');
                badge.className = 'representative-badge';
                badge.textContent = 'Current Representative';
                imageOption.appendChild(badge);
            }
            
            imageOption.appendChild(img);
            imageOption.appendChild(filename);
            
            imageOption.addEventListener('click', () => {
                // Remove selection from all options
                imagesGrid.querySelectorAll('.cluster-image-option').forEach(option => {
                    option.classList.remove('selected');
                });
                // Select this option
                imageOption.classList.add('selected');
                selectedRepresentative = imageItem;
            });
            
            imagesGrid.appendChild(imageOption);
        });
        
        // Modal buttons
        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'cluster-modal-buttons';
        
        const updateButton = document.createElement('button');
        updateButton.className = 'cluster-update-btn';
        updateButton.textContent = 'Update Representative';
        updateButton.addEventListener('click', () => {
            if (selectedRepresentative && selectedRepresentative !== clusterData.representative) {
                this.updateClusterRepresentative(clusterId, selectedRepresentative);
            }
            document.body.removeChild(modalOverlay);
        });
        
        const discardButton = document.createElement('button');
        discardButton.className = 'cluster-discard-btn';
        discardButton.textContent = 'Discard Cluster';
        discardButton.addEventListener('click', () => {
            this.discardCluster(clusterId);
            document.body.removeChild(modalOverlay);
        });
        
        const cancelButton = document.createElement('button');
        cancelButton.className = 'cluster-cancel-btn';
        cancelButton.textContent = 'Cancel';
        cancelButton.addEventListener('click', () => {
            document.body.removeChild(modalOverlay);
        });
        
        buttonsContainer.appendChild(updateButton);
        buttonsContainer.appendChild(discardButton);
        buttonsContainer.appendChild(cancelButton);
        
        // Assemble modal
        modal.appendChild(header);
        modal.appendChild(imagesGrid);
        modal.appendChild(buttonsContainer);
        modalOverlay.appendChild(modal);
        
        // Close on overlay click
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                document.body.removeChild(modalOverlay);
            }
        });
        
        // Close on Escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                document.removeEventListener('keydown', escapeHandler);
                if (document.body.contains(modalOverlay)) {
                    document.body.removeChild(modalOverlay);
                }
            }
        };
        document.addEventListener('keydown', escapeHandler);
        
        document.body.appendChild(modalOverlay);
    }
    
    updateClusterRepresentative(clusterId, newRepresentative) {
        const clusterData = this.clusters.get(clusterId);
        if (!clusterData || !clusterData.images.includes(newRepresentative)) return;
        
        const oldRepresentative = clusterData.representative;
        
        // Update cluster data
        clusterData.representative = newRepresentative;
        clusterData.hidden = clusterData.images.filter(img => img !== newRepresentative);
        
        // Update old representative
        oldRepresentative.imageData.isClusterRepresentative = false;
        oldRepresentative.classList.remove('cluster-representative');
        oldRepresentative.style.display = 'none';
        const oldIndicator = oldRepresentative.querySelector('.cluster-indicator');
        if (oldIndicator) oldIndicator.remove();
        
        // Update new representative
        newRepresentative.imageData.isClusterRepresentative = true;
        newRepresentative.classList.add('cluster-representative');
        newRepresentative.style.display = '';
        this.addClusterIndicator(newRepresentative, clusterData);
        
        console.log(`Updated cluster ${clusterId} representative from ${oldRepresentative.imageData.file.name} to ${newRepresentative.imageData.file.name}`);
    }
    
    discardCluster(clusterId) {
        const clusterData = this.clusters.get(clusterId);
        if (!clusterData) return;
        
        // Show all images in the cluster
        clusterData.images.forEach(imageItem => {
            imageItem.imageData.clusterId = null;
            imageItem.imageData.isClusterRepresentative = false;
            imageItem.classList.remove('cluster-representative');
            imageItem.style.display = '';
            this.clusteredImages.delete(imageItem);
            
            // Remove cluster indicator
            const indicator = imageItem.querySelector('.cluster-indicator');
            if (indicator) indicator.remove();
        });
        
        // Remove cluster from storage
        this.clusters.delete(clusterId);
        
        console.log(`Discarded cluster ${clusterId}`);
    }
    

}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new ImageDesk();
});
