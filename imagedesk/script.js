class ImageDesk {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.desk = document.getElementById('desk');
        this.selectionBox = document.getElementById('selectionBox');
        this.folderInput = document.getElementById('folderInput');
        this.imageCount = document.getElementById('imageCount');
        this.loadingIndicator = document.getElementById('loadingIndicator');
        this.arrangeBtn = document.getElementById('arrangeBtn');
        
        // State
        this.images = [];
        this.selectedImages = new Set();
        this.favoriteImages = new Set();
        this.imageHashes = new Map(); // Store perceptual hashes
        this.similarityThreshold = 0.85; // Similarity threshold for grouping
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
        
        this.initializeEventListeners();
        this.updateTransform();
        this.createOverlay();
    }
    
    initializeEventListeners() {
        // Folder input
        this.folderInput.addEventListener('change', (e) => this.loadImages(e.target.files));
        
        // Arrange button
        this.arrangeBtn.addEventListener('click', () => this.arrangeBySimilarity());
        
        // Mouse events for desk
        this.desk.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.desk.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.desk.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.desk.addEventListener('wheel', (e) => this.handleWheel(e));
        
        // Context menu prevention
        this.desk.addEventListener('contextmenu', (e) => e.preventDefault());
        
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
                    
                    // Store image data
                    imageItem.imageData = {
                        file: file,
                        x: x,
                        y: y,
                        element: imageItem,
                        zIndex: imageItem.style.zIndex,
                        isFavorite: false,
                        hash: null // Will be populated later
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
        
        // Right click for favorites
        imageItem.addEventListener('contextmenu', (e) => {
            e.stopPropagation();
            e.preventDefault();
            this.toggleFavorite(imageItem);
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
        
        // Prevent default behavior that might interfere with dragging
        if (e.button === 0) {
            e.preventDefault();
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
        } else if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            this.arrangeBySimilarity();
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
        this.updateImageCount();
    }
    
    updateTransform() {
        this.canvas.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.scale})`;
    }
    
    updateImageCount() {
        this.imageCount.textContent = `${this.images.length} images loaded`;
        this.arrangeBtn.disabled = this.images.length === 0;
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
        } else {
            this.favoriteImages.add(imageItem);
            imageItem.classList.add('favorite');
            imageItem.imageData.isFavorite = true;
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
        
        this.overlay.appendChild(this.overlayImg);
        this.overlay.appendChild(this.closeBtn);
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
            
            // Resize to 8x8 for pHash
            canvas.width = 8;
            canvas.height = 8;
            
            // Draw image scaled down
            ctx.drawImage(img, 0, 0, 8, 8);
            const imageData = ctx.getImageData(0, 0, 8, 8);
            
            // Convert to grayscale and calculate DCT-like hash
            const grayValues = [];
            for (let i = 0; i < imageData.data.length; i += 4) {
                const r = imageData.data[i];
                const g = imageData.data[i + 1];
                const b = imageData.data[i + 2];
                // Convert to grayscale
                const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
                grayValues.push(gray);
            }
            
            // Calculate average
            const average = grayValues.reduce((sum, val) => sum + val, 0) / grayValues.length;
            
            // Generate hash based on whether each pixel is above or below average
            let hash = '';
            for (let i = 0; i < grayValues.length; i++) {
                hash += grayValues[i] > average ? '1' : '0';
            }
            
            resolve(hash);
        });
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
        
        const hammingDistance = this.calculateHammingDistance(hash1, hash2);
        const maxDistance = hash1.length; // 64 for 8x8 hash
        
        // Convert to similarity score (0-1, where 1 is identical)
        return 1 - (hammingDistance / maxDistance);
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
        
        // Group similar images
        const groups = [];
        const processed = new Set();
        
        this.images.forEach(imageItem => {
            if (processed.has(imageItem)) return;
            
            const group = [imageItem];
            processed.add(imageItem);
            
            // Find similar images for this group
            const similarImages = this.findSimilarImages(imageItem, 0.7); // Lower threshold for grouping
            similarImages.forEach(({ image, similarity }) => {
                if (!processed.has(image)) {
                    group.push(image);
                    processed.add(image);
                }
            });
            
            groups.push(group);
        });
        
        // Arrange groups in a grid pattern
        this.arrangeGroupsOnDesk(groups);
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
        
        const similarImages = this.findSimilarImages(targetImage, 0.6);
        similarImages.forEach(({ image }) => {
            image.classList.add('similar');
        });
    }
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new ImageDesk();
});
