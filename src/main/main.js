const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');

// 获取今日日期字符串 (YYYY-MM-DD)
function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 下载每日一图
function downloadDailyImage() {
  return new Promise((resolve, reject) => {
    // 创建图片缓存目录
    const imageCacheDir = path.join('C:/timetable', 'images');
    if (!fs.existsSync(imageCacheDir)) {
      fs.mkdirSync(imageCacheDir, { recursive: true });
    }

    // 图片保存路径
    const today = getTodayDateString();
    const imagePath = path.join(imageCacheDir, `background-${today}.jpg`);

    // 如果今日图片已存在，直接返回路径
    if (fs.existsSync(imagePath)) {
      console.log('使用缓存的今日图片');
      resolve(imagePath);
      return;
    }

    // 从 Bing 获取每日一图 URL
    const apiUrl = 'https://bing.biturl.top/?resolution=3840';

    https.get(apiUrl, (response) => {
      let data = '';

      response.on('data', (chunk) => {
        data += chunk;
      });

      response.on('end', () => {
        try {
          const imageData = JSON.parse(data);
          if (imageData && imageData.url) {
            // 下载图片
            const imageUrl = imageData.url;
            const file = fs.createWriteStream(imagePath);

            https.get(imageUrl, (imgResponse) => {
              imgResponse.pipe(file);
              file.on('finish', () => {
                file.close();
                console.log('每日一图下载完成');
                resolve(imagePath);
              });
            }).on('error', (err) => {
              fs.unlink(imagePath, () => {}); // 删除未完成的文件
              reject(err);
            });
          } else {
            reject(new Error('无法获取图片URL'));
          }
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

// 创建默认配置文件的函数
function createDefaultConfigFiles() {
  // 定义 timetable 目录路径
  const timetableDir = 'C:/timetable';

  // 创建目录（如果不存在）
  if (!fs.existsSync(timetableDir)) {
    fs.mkdirSync(timetableDir, { recursive: true });
  }

  // 默认配置文件内容
  const defaultConfig = {
    "times": [
      "7:30-8:00",
      "8:00-8:40",
      "8:50-9:30",
      "9:30-10:00",
      "10:50-11:30",
      "10:50-11:30",
      "11:40-12:20",
      "12:20-14:10",
      "14:10-14:50",
      "15:05-15:45",
      "16:00-16:40",
      "16:55-17:35",
      "17:35-18:30",
      "18:30-19:40",
      "19:50-20:30",
      "20:40-21:20"
    ],
    "names": [
      "早间",
      "第一节",
      "第二节",
      "课间操",
      "第三节",
      "第四节",
      "第五节",
      "午休",
      "第六节",
      "第七节",
      "第八节",
      "第九节",
      "晚餐与自由活动",
      "晚一",
      "晚二",
      "晚三"
    ],
    "id": [
      0,
      1,
      2,
      -1,
      3,
      4,
      5,
      -1,
      6,
      7,
      8,
      9,
      -1,
      10,
      11,
      12
    ],
    "timetable": {
      "周一": [
        "升旗",
        "数学",
        "历史",
        "英语",
        "化学",
        "语文",
        "信息",
        "物理",
        "体育",
        "政治",
        "",
        "",
        "",
      ],
      "周二": [
        "英语",
        "英语",
        "英语",
        "数学",
        "物理",
        "政治",
        "语文",
        "化学",
        "数优",
        "数优",
        "物优",
        "物优",
        ""
      ],
      "周三": [
        "语文",
        "语文",
        "语文",
        "体育",
        "数学",
        "英语",
        "历史",
        "政治",
        "数优",
        "数优",
        "",
        "",
        ""
      ],
      "周四": [
        "英语",
        "英语",
        "历史",
        "语文",
        "数学",
        "数学",
        "化学",
        "体育",
        "音乐/美术",
        "物理"
      ],
      "周五": [
        "语文",
        "语文",
        "数学",
        "物理",
        "政治",
        "化学",
        "英语",
        "历史",
        "自习",
        "放学"
      ]
    }
  };

  const defaultOptions = {
    "changes": [
      {
        "2000/1/1": {
          "change_to_weekday": 3,
          "classes": {
            "3": "美术",
            "5": "语文"
          }
        }
      }
    ]
  };

  // 配置文件路径
  const configPath = path.join(timetableDir, 'config.json');
  const optionsPath = path.join(timetableDir, 'options.json');

  // 如果配置文件不存在，则创建默认文件
  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2), 'utf8');
    console.log('已创建默认 config.json 文件');
  }

  if (!fs.existsSync(optionsPath)) {
    fs.writeFileSync(optionsPath, JSON.stringify(defaultOptions, null, 2), 'utf8');
    console.log('已创建默认 options.json 文件');
  }
}

// 读取配置文件内容
function readConfigFile() {
  try {
    const timetableDir = 'C:/timetable';
    const configPath = path.join(timetableDir, 'config.json');

    if (fs.existsSync(configPath)) {
      const configContent = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(configContent);
    }
  } catch (error) {
    console.error('读取配置文件失败:', error);
  }
  return null;
}

// 定时检查配置文件更新
function startConfigWatcher(mainWindow) {
  let lastConfig = null;
  let lastConfigString = '';

  // 每10秒检查一次配置文件
  setInterval(() => {
    try {
      const currentConfig = readConfigFile();
      if (currentConfig) {
        const currentConfigString = JSON.stringify(currentConfig);

        // 检查配置是否发生变化
        if (currentConfigString !== lastConfigString) {
          console.log('检测到配置文件更新');
          lastConfig = currentConfig;
          lastConfigString = currentConfigString;

          // 通过IPC发送更新通知给渲染进程
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('config-updated', currentConfig);
          }
        }
      }
    } catch (error) {
      console.error('检查配置文件时出错:', error);
    }
  }, 10000); // 10秒检查一次
}

// 保存主窗口引用
let mainWindowInstance = null;

function createWindow(imagePath) {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false, // 删除标题栏
    webPreferences: {
      preload: path.join(__dirname, '../renderer/preload.js'),
      nodeIntegration: true,
      contextIsolation: true
    }
  });

  // 保存窗口引用
  mainWindowInstance = mainWindow;

  // 将图片路径传递给渲染进程
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.executeJavaScript(`
      window.backgroundImagePath = "${imagePath.replace(/\\/g, '\\\\')}";
    `);
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();
}

app.whenReady().then(async () => {
  // 在创建窗口前创建默认配置文件
  createDefaultConfigFiles();

  // 下载或获取缓存的每日一图
  try {
    const imagePath = await downloadDailyImage();
    console.log('背景图片路径:', imagePath);
    createWindow(imagePath);
  } catch (error) {
    console.error('下载每日一图失败:', error);
    createWindow(null);
  }

  // 启动配置文件监视器
  setTimeout(() => {
    if (mainWindowInstance) {
      startConfigWatcher(mainWindowInstance);
    }
  }, 1000);

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});