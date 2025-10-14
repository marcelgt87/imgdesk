const { app, BrowserWindow, dialog, ipcMain, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs-extra');
const sharp = require('sharp');

class ImageDeskApp {
    constructor() {
        this.mainWindow = null;
        this.isDev = process.argv.includes('--dev');
        this.setupIPC();
    }

    createWindow() {
        // Create the browser window
        this.mainWindow = new BrowserWindow({
            width: 1400,
            height: 900,
            minWidth: 800,
            minHeight: 600,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                enableRemoteModule: false,
                preload: path.join(__dirname, 'preload.js')
            },
            icon: path.join(__dirname, 'assets', 'icon.png'),
            show: false,
            titleBarStyle: 'default'
        });

        // Load the app
        this.mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

        // Show window when ready
        this.mainWindow.once('ready-to-show', () => {
            this.mainWindow.show();
            if (this.isDev) {
                this.mainWindow.webContents.openDevTools();
            }
        });

        // Handle window closed
        this.mainWindow.on('closed', () => {
            this.mainWindow = null;
        });

        this.createMenu();
    }

    createMenu() {
        const template = [
            {
                label: 'File',
                submenu: [
                    {
                        label: 'Open Folder',
                        accelerator: 'CmdOrCtrl+O',
                        click: () => this.openFolder()
                    },
                    { type: 'separator' },
                    {
                        label: 'Exit',
                        accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
                        click: () => app.quit()
                    }
                ]
            },
            {
                label: 'Edit',
                submenu: [
                    {
                        label: 'Select All',
                        accelerator: 'CmdOrCtrl+A',
                        click: () => this.mainWindow.webContents.send('select-all')
                    },
                    {
                        label: 'Clear Selection',
                        accelerator: 'Escape',
                        click: () => this.mainWindow.webContents.send('clear-selection')
                    }
                ]
            },
            {
                label: 'View',
                submenu: [
                    {
                        label: 'Reload',
                        accelerator: 'CmdOrCtrl+R',
                        click: () => this.mainWindow.webContents.reload()
                    },
                    {
                        label: 'Force Reload',
                        accelerator: 'CmdOrCtrl+Shift+R',
                        click: () => this.mainWindow.webContents.reloadIgnoringCache()
                    },
                    {
                        label: 'Toggle Developer Tools',
                        accelerator: process.platform === 'darwin' ? 'Alt+Cmd+I' : 'Ctrl+Shift+I',
                        click: () => this.mainWindow.webContents.toggleDevTools()
                    },
                    { type: 'separator' },
                    {
                        label: 'Actual Size',
                        accelerator: 'CmdOrCtrl+0',
                        click: () => this.mainWindow.webContents.send('reset-zoom')
                    },
                    {
                        label: 'Zoom In',
                        accelerator: 'CmdOrCtrl+Plus',
                        click: () => this.mainWindow.webContents.send('zoom-in')
                    },
                    {
                        label: 'Zoom Out',
                        accelerator: 'CmdOrCtrl+-',
                        click: () => this.mainWindow.webContents.send('zoom-out')
                    }
                ]
            },
            {
                label: 'Tools',
                submenu: [
                    {
                        label: 'Group Similar Images',
                        accelerator: 'CmdOrCtrl+G',
                        click: () => this.mainWindow.webContents.send('group-similar')
                    },
                    {
                        label: 'Clear All Images',
                        accelerator: 'CmdOrCtrl+Shift+C',
                        click: () => this.mainWindow.webContents.send('clear-all')
                    }
                ]
            },
            {
                label: 'Help',
                submenu: [
                    {
                        label: 'About',
                        click: () => this.showAbout()
                    }
                ]
            }
        ];

        const menu = Menu.buildFromTemplate(template);
        Menu.setApplicationMenu(menu);
    }

    async openFolder() {
        const result = await dialog.showOpenDialog(this.mainWindow, {
            properties: ['openDirectory'],
            title: 'Select Image Folder'
        });

        if (!result.canceled && result.filePaths.length > 0) {
            const folderPath = result.filePaths[0];
            this.loadImagesFromFolder(folderPath);
        }
    }

    async loadImagesFromFolder(folderPath) {
        try {
            const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff'];
            const files = await fs.readdir(folderPath);
            
            const imageFiles = files.filter(file => {
                const ext = path.extname(file).toLowerCase();
                return imageExtensions.includes(ext);
            }).map(file => ({
                name: file,
                path: path.join(folderPath, file),
                relativePath: file
            }));

            this.mainWindow.webContents.send('load-images', imageFiles);
        } catch (error) {
            console.error('Error loading folder:', error);
            dialog.showErrorBox('Error', `Failed to load images from folder: ${error.message}`);
        }
    }

    showAbout() {
        dialog.showMessageBox(this.mainWindow, {
            type: 'info',
            title: 'About ImageDesk',
            message: 'ImageDesk v1.0.0',
            detail: 'A native desktop application for image management and clustering.\n\nFeatures:\n• Visual similarity detection\n• Smart image grouping\n• Favorites management\n• Full file system access\n• Cross-platform support',
            buttons: ['OK']
        });
    }

    setupIPC() {
        // File operations
        ipcMain.handle('move-file', async (event, sourcePath, destinationPath) => {
            try {
                await fs.move(sourcePath, destinationPath);
                return { success: true };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('copy-file', async (event, sourcePath, destinationPath) => {
            try {
                await fs.copy(sourcePath, destinationPath);
                return { success: true };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('delete-file', async (event, filePath) => {
            try {
                await fs.remove(filePath);
                return { success: true };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('create-directory', async (event, dirPath) => {
            try {
                await fs.ensureDir(dirPath);
                return { success: true };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('rename-file', async (event, oldPath, newPath) => {
            try {
                await fs.move(oldPath, newPath);
                return { success: true };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });

        // Dialog operations
        ipcMain.handle('show-save-dialog', async (event, options) => {
            const result = await dialog.showSaveDialog(this.mainWindow, options);
            return result;
        });

        ipcMain.handle('show-open-dialog', async (event, options) => {
            const result = await dialog.showOpenDialog(this.mainWindow, options);
            return result;
        });

        ipcMain.handle('show-message-box', async (event, options) => {
            const result = await dialog.showMessageBox(this.mainWindow, options);
            return result;
        });

        // Shell operations
        ipcMain.handle('show-item-in-folder', async (event, filePath) => {
            shell.showItemInFolder(filePath);
        });

        ipcMain.handle('open-external', async (event, url) => {
            await shell.openExternal(url);
        });

        // Image processing
        ipcMain.handle('get-image-info', async (event, filePath) => {
            try {
                const stats = await fs.stat(filePath);
                const metadata = await sharp(filePath).metadata();
                
                return {
                    success: true,
                    info: {
                        size: stats.size,
                        width: metadata.width,
                        height: metadata.height,
                        format: metadata.format
                    }
                };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });

        // Batch operations
        ipcMain.handle('batch-move-files', async (event, operations) => {
            const results = [];
            for (const op of operations) {
                try {
                    await fs.move(op.source, op.destination);
                    results.push({ success: true, source: op.source, destination: op.destination });
                } catch (error) {
                    results.push({ success: false, source: op.source, error: error.message });
                }
            }
            return results;
        });

        ipcMain.handle('batch-copy-files', async (event, operations) => {
            const results = [];
            for (const op of operations) {
                try {
                    await fs.copy(op.source, op.destination);
                    results.push({ success: true, source: op.source, destination: op.destination });
                } catch (error) {
                    results.push({ success: false, source: op.source, error: error.message });
                }
            }
            return results;
        });
    }
}

// Initialize the app
const imageDesk = new ImageDeskApp();

// App event handlers
app.whenReady().then(() => {
    imageDesk.createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            imageDesk.createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
    contents.on('new-window', (event, navigationUrl) => {
        event.preventDefault();
        shell.openExternal(navigationUrl);
    });
});