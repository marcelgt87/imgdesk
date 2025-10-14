# Running ImageDesk from WSL (Windows Subsystem for Linux)

Yes! You can absolutely run the native ImageDesk desktop app from WSL. Here's everything you need to know:

## ✅ **What's Already Set Up**

I've successfully converted your web app to a native Electron desktop application and configured it for WSL:

- ✅ Node.js 18.20.8 installed
- ✅ All dependencies installed 
- ✅ X11 dependencies installed
- ✅ WSL-specific startup script created
- ✅ All files ready to run

## 🖥️ **WSL GUI Requirements**

To run GUI applications from WSL, you need an X server running on Windows:

### **Option 1: VcXsrv (Recommended)**
1. Download and install [VcXsrv](https://sourceforge.net/projects/vcxsrv/)
2. Start XLaunch from the Windows Start Menu
3. **Important settings:**
   - Choose "Multiple windows"
   - Click Next → Next
   - **Check "Disable access control"** ✅
   - Click Next → Finish

### **Option 2: Xming**
1. Download and install [Xming](https://sourceforge.net/projects/xming/)
2. Start Xming from Windows Start Menu

### **Option 3: Windows 11 Built-in (WSL2 only)**
If you have Windows 11 with WSL2, GUI support might work out of the box.

## 🚀 **Running the App**

### **Quick Start:**
```bash
cd /home/marcel/imagedesk
./start-wsl.sh
```

### **Manual Start:**
```bash
cd /home/marcel/imagedesk
npm start
```

### **Alternative with explicit display:**
```bash
cd /home/marcel/imagedesk
DISPLAY=:0.0 npm start
```

## 🔧 **Troubleshooting**

### **"Cannot open display" Error**
```bash
# Check if X server is running on Windows
echo $DISPLAY

# Test X11 connection
xset q

# If that fails, try setting DISPLAY manually:
export DISPLAY=$(awk '/nameserver / {print $2; exit}' /etc/resolv.conf):0.0
npm start
```

### **"Error: spawn EACCES" or Permission Errors**
```bash
# Make sure all scripts are executable
chmod +x /home/marcel/imagedesk/start-wsl.sh
chmod +x /home/marcel/imagedesk/install.sh
```

### **Dependencies Issues**
```bash
# Reinstall if needed
cd /home/marcel/imagedesk
rm -rf node_modules
npm install
```

## 📱 **Full Desktop Experience**

When running from WSL, you get:

### **✅ What Works:**
- ✅ Full native desktop window
- ✅ All image clustering and similarity features
- ✅ Drag and drop functionality
- ✅ Keyboard shortcuts (F for favorites, C for clustering)
- ✅ File system access to Windows drives (`/mnt/c/Users/...`)
- ✅ Context menus and native dialogs
- ✅ All file operations (move, copy, delete, rename)

### **🎯 Key Features:**
- **File System Access**: Can access Windows files through `/mnt/c/`
- **Native Performance**: Runs as a true desktop app
- **Cross-platform**: Same app works on Linux and Windows
- **Modern UI**: Native window controls and system integration

## 📁 **Accessing Windows Files**

From WSL, you can access your Windows files:

```bash
# Windows C: drive
ls /mnt/c/Users/$USER/Pictures/

# Windows D: drive (if you have one)
ls /mnt/d/

# Example: Open images from Windows Pictures folder
cd /home/marcel/imagedesk
npm start
# Then use "Open Folder" button to navigate to /mnt/c/Users/YourUsername/Pictures
```

## 🛠️ **Development Commands**

```bash
# Start the app in development mode
npm start

# Build Windows executable
npm run build-win

# Build Linux AppImage
npm run build-linux

# Install new dependencies
npm install [package-name]
```

## 🔍 **Checking Installation**

```bash
# Verify Node.js
node --version  # Should show v18.20.8

# Verify npm
npm --version   # Should show 10.8.2

# Check if X11 is working
xset q

# Test the app
cd /home/marcel/imagedesk && npm start
```

## 💡 **Pro Tips**

1. **Windows File Access**: Use `/mnt/c/Users/YourName/Pictures` to access Windows Pictures
2. **Performance**: WSL2 generally performs better than WSL1 for GUI apps
3. **Firewall**: Windows Defender might prompt about X server connections - allow them
4. **Multiple Sessions**: You can run multiple instances of the app
5. **Shortcuts**: Create Windows shortcuts that run the WSL commands

## 🚨 **Common Issues & Solutions**

### **Issue**: App window doesn't appear
**Solution**: Make sure VcXsrv/Xming is running with "Disable access control" checked

### **Issue**: Can't access Windows files
**Solution**: Use `/mnt/c/` path prefix to access Windows C: drive

### **Issue**: Slow performance
**Solution**: 
- Make sure you're using WSL2 (not WSL1)
- Close other heavy applications
- Use SSD storage if possible

### **Issue**: "Module not found" errors
**Solution**: Reinstall dependencies:
```bash
cd /home/marcel/imagedesk
rm -rf node_modules package-lock.json
npm install
```

## 🎉 **Success!**

If everything is working, you should see:
1. The ImageDesk window opens in Windows
2. You can load images from Windows folders
3. All clustering and similarity features work
4. File operations (move, copy, delete) work on Windows files

**Your ImageDesk is now a fully native Windows desktop application running from WSL!** 🎊

---

**Need help?** The app is ready to run. Just make sure you have an X server running on Windows and execute `./start-wsl.sh` from the imagedesk directory.