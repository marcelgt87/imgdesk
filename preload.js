const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // File operations
    moveFile: (sourcePath, destinationPath) => ipcRenderer.invoke('move-file', sourcePath, destinationPath),
    copyFile: (sourcePath, destinationPath) => ipcRenderer.invoke('copy-file', sourcePath, destinationPath),
    deleteFile: (filePath) => ipcRenderer.invoke('delete-file', filePath),
    createDirectory: (dirPath) => ipcRenderer.invoke('create-directory', dirPath),
    renameFile: (oldPath, newPath) => ipcRenderer.invoke('rename-file', oldPath, newPath),
    
    // Batch operations
    batchMoveFiles: (operations) => ipcRenderer.invoke('batch-move-files', operations),
    batchCopyFiles: (operations) => ipcRenderer.invoke('batch-copy-files', operations),
    
    // Dialog operations
    showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
    showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
    showMessageBox: (options) => ipcRenderer.invoke('show-message-box', options),
    
    // Shell operations
    showItemInFolder: (filePath) => ipcRenderer.invoke('show-item-in-folder', filePath),
    openExternal: (url) => ipcRenderer.invoke('open-external', url),
    
    // Image processing
    getImageInfo: (filePath) => ipcRenderer.invoke('get-image-info', filePath),
    
    // Event listeners for menu actions
    onLoadImages: (callback) => ipcRenderer.on('load-images', callback),
    onSelectAll: (callback) => ipcRenderer.on('select-all', callback),
    onClearSelection: (callback) => ipcRenderer.on('clear-selection', callback),
    onResetZoom: (callback) => ipcRenderer.on('reset-zoom', callback),
    onZoomIn: (callback) => ipcRenderer.on('zoom-in', callback),
    onZoomOut: (callback) => ipcRenderer.on('zoom-out', callback),
    onGroupSimilar: (callback) => ipcRenderer.on('group-similar', callback),
    onClearAll: (callback) => ipcRenderer.on('clear-all', callback),
    
    // Remove listeners
    removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});