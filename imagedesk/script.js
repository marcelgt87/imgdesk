class ImageDesk {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.desk = document.getElementById('desk');
        this.selectionBox = document.getElementById('selectionBox');
        this.folderInput = document.getElementById('folderInput');
        this.imageCount = document.getElementById('imageCount');
        this.loadingIndicator = document.getElementById('loadingIndicator');
        
        // State
        this.images = [];
        this.selectedImages = new Set();
        this.scale = 1;
        this.panX = 0;
        this.panY = 0;
        this.isDragging = false;
        this.isPanning = false;
        this.isSelecting = false;
        this.dragStartPos = { x: 0, y: 0 };
        this.selectionStart = { x: 0, y: 0 };
        this.lastMousePos = { x: 0, y: 0 };
        
        this.initializeEventListeners();
        this.updateTransform();
    }
    
    initializeEventListeners() {
        // Folder input
        this.folderInput.addEventListener('change', (e) => this.loadImages(e.target.files));
        
        // Mouse events for desk
        this.desk.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.desk.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.desk.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.desk.addEventListener('wheel', (e) => this.handleWheel(e));
        
        // Context menu prevention
        this.desk.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // Keyboard events
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
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
                    
                    // Store image data
                    imageItem.imageData = {
                        file: file,
                        x: x,
                        y: y,
                        element: imageItem
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
        imageItem.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            
            if (e.button === 0) { // Left click
                if (!e.ctrlKey && !e.metaKey) {
                    if (!this.selectedImages.has(imageItem)) {
                        this.clearSelection();
                        this.selectImage(imageItem);
                    }
                } else {
                    this.toggleImageSelection(imageItem);
                }
                
                this.startDragging(e, imageItem);
            }
        });
    }
    
    handleMouseDown(e) {
        this.lastMousePos = { x: e.clientX, y: e.clientY };
        
        if (e.button === 2) { // Right click - start panning
            this.isPanning = true;
            this.desk.classList.add('panning');
        } else if (e.button === 0 && e.target === this.desk) {
            // Left click on empty area - start selection
            this.clearSelection();
            this.startSelection(e);
        }
    }
    
    handleMouseMove(e) {
        const deltaX = e.clientX - this.lastMousePos.x;
        const deltaY = e.clientY - this.lastMousePos.y;
        
        if (this.isPanning) {
            this.panX += deltaX;
            this.panY += deltaY;
            this.updateTransform();
        } else if (this.isDragging && this.selectedImages.size > 0) {
            this.dragSelectedImages(deltaX / this.scale, deltaY / this.scale);
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
    }
    
    handleWheel(e) {
        e.preventDefault();
        
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
    
    handleKeyDown(e) {
        if (e.key === 'Delete' || e.key === 'Backspace') {
            this.deleteSelectedImages();
        } else if (e.key === 'Escape') {
            this.clearSelection();
        } else if (e.key === 'a' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            this.selectAllImages();
        }
    }
    
    startDragging(e, imageItem) {
        this.isDragging = true;
        this.dragStartPos = { x: e.clientX, y: e.clientY };
        
        this.selectedImages.forEach(img => {
            img.classList.add('dragging');
        });
    }
    
    stopDragging() {
        this.isDragging = false;
        this.selectedImages.forEach(img => {
            img.classList.remove('dragging');
        });
    }
    
    dragSelectedImages(deltaX, deltaY) {
        this.selectedImages.forEach(imageItem => {
            imageItem.imageData.x += deltaX;
            imageItem.imageData.y += deltaY;
            imageItem.style.left = imageItem.imageData.x + 'px';
            imageItem.style.top = imageItem.imageData.y + 'px';
        });
    }
    
    startSelection(e) {
        this.isSelecting = true;
        const rect = this.canvas.getBoundingClientRect();
        this.selectionStart = {
            x: (e.clientX - rect.left - this.panX) / this.scale,
            y: (e.clientY - rect.top - this.panY) / this.scale
        };
        
        this.selectionBox.style.display = 'block';
        this.updateSelection(e);
    }
    
    updateSelection(e) {
        const rect = this.canvas.getBoundingClientRect();
        const currentX = (e.clientX - rect.left - this.panX) / this.scale;
        const currentY = (e.clientY - rect.top - this.panY) / this.scale;
        
        const left = Math.min(this.selectionStart.x, currentX);
        const top = Math.min(this.selectionStart.y, currentY);
        const width = Math.abs(currentX - this.selectionStart.x);
        const height = Math.abs(currentY - this.selectionStart.y);
        
        this.selectionBox.style.left = left + 'px';
        this.selectionBox.style.top = top + 'px';
        this.selectionBox.style.width = width + 'px';
        this.selectionBox.style.height = height + 'px';
    }
    
    finishSelection() {
        this.isSelecting = false;
        this.selectionBox.style.display = 'none';
        
        const selectionRect = this.selectionBox.getBoundingClientRect();
        const canvasRect = this.canvas.getBoundingClientRect();
        
        // Convert selection box coordinates to canvas space
        const selectionLeft = (selectionRect.left - canvasRect.left - this.panX) / this.scale;
        const selectionTop = (selectionRect.top - canvasRect.top - this.panY) / this.scale;
        const selectionRight = selectionLeft + selectionRect.width / this.scale;
        const selectionBottom = selectionTop + selectionRect.height / this.scale;
        
        this.images.forEach(imageItem => {
            const imgRect = imageItem.getBoundingClientRect();
            const imgLeft = imageItem.imageData.x;
            const imgTop = imageItem.imageData.y;
            const imgRight = imgLeft + imgRect.width / this.scale;
            const imgBottom = imgTop + imgRect.height / this.scale;
            
            // Check if image intersects with selection
            if (imgLeft < selectionRight && imgRight > selectionLeft &&
                imgTop < selectionBottom && imgBottom > selectionTop) {
                this.selectImage(imageItem);
            }
        });
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
        this.updateImageCount();
    }
    
    updateTransform() {
        this.canvas.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.scale})`;
    }
    
    updateImageCount() {
        this.imageCount.textContent = `${this.images.length} images loaded`;
    }
    
    showLoading() {
        this.loadingIndicator.style.display = 'flex';
    }
    
    hideLoading() {
        this.loadingIndicator.style.display = 'none';
    }
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new ImageDesk();
});
