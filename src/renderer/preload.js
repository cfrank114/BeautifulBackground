const { contextBridge, ipcRenderer } = require('electron');
const path = require('path');
const fs = require('fs');

// 读取配置文件的函数
function readConfigFiles() {
  try {
    // 从 C:/timetable 目录读取配置文件
    const timetableDir = 'C:/timetable';
    const configPath = path.join(timetableDir, 'config.json');
    const optionsPath = path.join(timetableDir, 'options.json');

    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const options = JSON.parse(fs.readFileSync(optionsPath, 'utf8'));

    return { config, options };
  } catch (error) {
    console.error('读取配置文件失败:', error);
    return { config: null, options: null };
  }
}

// 获取背景图片路径
function getBackgroundImagePath() {
  // 获取今日日期字符串
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const today = `${year}-${month}-${day}`;

  // 构造图片路径
  const imageCacheDir = path.join('C:/timetable/images');
  const imagePath = path.join(imageCacheDir, `background-${today}.jpg`);

  // 检查文件是否存在
  if (fs.existsSync(imagePath)) {
    return imagePath;
  }

  return null;
}

// 通过contextBridge暴露API给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  readConfigFiles: readConfigFiles,
  getBackgroundImagePath: getBackgroundImagePath,
  onConfigUpdated: (callback) => ipcRenderer.on('config-updated', callback),
  removeAllConfigListeners: () => ipcRenderer.removeAllListeners('config-updated')
});