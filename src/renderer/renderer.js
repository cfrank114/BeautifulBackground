// 动态背景设置
let backgroundImagePath = null;

// 从主进程获取背景图片路径
if (window.backgroundImagePath) {
    backgroundImagePath = window.backgroundImagePath;
} else {
    // 如果主进程没有传递图片路径，尝试从预加载脚本获取
    try {
        backgroundImagePath = window.electronAPI.getBackgroundImagePath();
    } catch (error) {
        console.log('无法获取背景图片路径:', error);
    }
}

// 使用CSS变量存储主题色
function ColorMulyiplier(rgbArray, multiplier) {
    let color = rgbArray.slice();
    for (var i = 0; i < rgbArray.length; i++) {
        color[i] = Math.round(rgbArray[i] * multiplier);
    }
    return color;
}

function reduceContrast(rgb, ratio = 0.2) {
    // 确保ratio在合理范围内
    // ratio = Math.max(0, Math.min(1, ratio));

    // 计算混合的中性灰（使用与原始颜色相同的亮度或固定灰阶）
    const grayValue = 128; // 也可用 0.299 * r + 0.587 * g + 0.114 * b 计算亮度
    // const grayValue = Math.round(0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]); // 按亮度值混合

    // 将每个通道与灰色按比例混合
    const newR = Math.round(rgb[0] * (1 - ratio) + grayValue * ratio);
    const newG = Math.round(rgb[1] * (1 - ratio) + grayValue * ratio);
    const newB = Math.round(rgb[2] * (1 - ratio) + grayValue * ratio);

    return [newR, newG, newB];
}
function colorFix(rgb){
    console.log(rgb)
    let maxcol = Math.max(rgb[0],rgb[1],rgb[2]);
    console.log(maxcol);
    if (maxcol<=255) return [rgb[0],rgb[1],rgb[2]];
    let ratio = 255.0/maxcol;
    console.log(ratio);
    return[rgb[0]*ratio,rgb[1]*ratio,rgb[2]*ratio];
}

function applyThemeColor(rgbArray) {
    if (!rgbArray || !Array.isArray(rgbArray) || rgbArray.length !== 3) return;

    // 计算文本颜色（根据亮度决定黑白）[1](@ref)
    const brightness = (rgbArray[0] * 299 + rgbArray[1] * 587 + rgbArray[2] * 114) / 1000;
    let basetextColor = reduceContrast(rgbArray, -0.05);
    let universalContainerColor = [255,255,255];
    let no_sc_col = rgbArray.slice();
    let th_col = rgbArray.slice();
    if (brightness > 128) {
        basetextColor = ColorMulyiplier(basetextColor, 0.2);
        no_sc_col = ColorMulyiplier(no_sc_col, 0.3)
        no_sc_col = reduceContrast(no_sc_col, 0.3);
        th_col = reduceContrast(rgbArray, 0.8);
        th_col = ColorMulyiplier(th_col, 1.6);
        universalContainerColor = [255,255,255];
    } else {
        basetextColor = reduceContrast(basetextColor, 0.8);
        basetextColor = ColorMulyiplier(basetextColor, 3.0);
        no_sc_col = reduceContrast(no_sc_col, 0.8);
        no_sc_col = ColorMulyiplier(no_sc_col, 1.8)
        th_col = reduceContrast(rgbArray, 0.1);
        th_col = ColorMulyiplier(th_col, 1.5);
        universalContainerColor = [128,128,128];
    }
    basetextColor=colorFix(basetextColor);
    no_sc_col= colorFix(no_sc_col);
    th_col=colorFix(th_col);
    document.documentElement.style.setProperty('--dominant-color', rgbArray.join(','));
    document.documentElement.style.setProperty('--text-color', basetextColor.join(','));

    // 应用颜色到特定元素
    const titleElements = document.getElementsByClassName('container-title');
    for (let i = 0; i < titleElements.length; i++) {
        titleElements[i].style.color = `rgb(${basetextColor.join(',')})`;
    }
    const noSchElements = document.getElementsByClassName('no-schedule');
    for (let i = 0; i < noSchElements.length; i++) {
        noSchElements[i].style.color = `rgb(${no_sc_col.join(',')})`;
    }
    const thElements = document.getElementsByTagName('th');
    for (let i = 0; i < thElements.length; i++) {
        thElements[i].style.background = `rgba(${th_col.join(',')},0.2)`;
    }
    const ucElements = document.getElementsByClassName('universal-container');
    for (let i = 0; i < thElements.length; i++) {
        ucElements[i].style.background = `rgba(${universalContainerColor.join(',')},0.2)`;
    }


    console.log('主题色已应用:', rgbArray, '文字颜色:', basetextColor);
}

// 读取配置文件
let config, options;

// 通过preload.js中的API读取配置文件
const configData = window.electronAPI.readConfigFiles();
config = configData.config;
options = configData.options;

if (!config || !options) {
    console.error('无法读取配置文件');
}

// 更新显示函数
function updateDisplay(newConfig) {
    if (newConfig) {
        config = newConfig;

        // 获取课表数据
        const times = config.times || [];
        const timetable = config.timetable || {};

        // 获取当前日期和星期
        const now = new Date();
        const day = now.getDay();
        const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
        const currentWeekday = weekdays[day];

        // 更新星期显示
        document.getElementById('weekdayDisplay').textContent = `今天是${currentWeekday}`;

        // 检查是否是工作日（周一至周五）
        if (day >= 1 && day <= 5) {
            let schedule = timetable[currentWeekday] || [];

            // 应用调课数据（如果存在options）
            const currentDate = `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()}`;
            if (options && options.changes) {
                schedule = applyScheduleChanges(schedule, currentDate);
            }

            let tableHTML = `
                <table class="schedule-table">
                    <thead>
                        <tr>
                            <th>时间</th>
                            <th>节次</th>
                            <th>课程安排</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            // 获取names和id数组（如果存在）
            const names = config.names || [];
            const ids = config.id || [];

            for (let i = 0; i < ids.length; i++) {
                // 获取节次名称
                const periodName = names[i] || `第${i+1}节`;

                tableHTML += `
                    <tr>
                        <td class="time-column">${times[i] || ''}</td>
                        <td>${periodName}</td>
                        <td>${(ids[i]==-1?"":(schedule[ids[i]] || ""))}</td>
                    </tr>
                `;
            }

            tableHTML += `
                    </tbody>
                </table>
            `;

            const scheduleContent = document.getElementById('scheduleContent');
            if (scheduleContent) {
                scheduleContent.innerHTML = tableHTML;
            }
        } else {
            const scheduleContent = document.getElementById('scheduleContent');
            if (scheduleContent) {
                scheduleContent.innerHTML = `
                    <div class="no-schedule">无课程</div>
                `;
            }
        }
    }
}

// 监听配置更新
window.electronAPI.onConfigUpdated((event, newConfig) => {
    console.log('收到配置更新:', newConfig);
    updateDisplay(newConfig);
    options = newConfig.options || options; // 更新options（如果配置中包含）
});

// 初始更新显示
updateDisplay(config);

// 获取课表数据
const times = config ? config.times : [];
const timetable = config ? config.timetable : {};

// 获取当前日期和星期
const now = new Date();
const day = now.getDay();
const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
const currentWeekday = weekdays[day];

// 应用调课数据
function applyScheduleChanges(schedule, currentDate) {
    const changes = options.changes;
    if (!changes || changes.length === 0) return schedule;

    // 查找适用于当前日期的更改
    for (const changeItem of changes) {
        const changeDate = Object.keys(changeItem)[0];
        if (changeDate === currentDate) {
            const changeData = changeItem[changeDate];

            // 如果指定了更改为某周的安排
            let modifiedSchedule = [...schedule];
            if (changeData.change_to_weekday && changeData.change_to_weekday > 0) {
                const weekdayIndex = changeData.change_to_weekday;
                const weekdayNames = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
                const weekdayName = weekdayNames[weekdayIndex];
                if (timetable[weekdayName]) {
                    modifiedSchedule = [...timetable[weekdayName]];
                }
            }

            // 应用具体的课程更改
            if (changeData.classes) {
                for (const [period, subject] of Object.entries(changeData.classes)) {
                    const periodIndex = parseInt(period) - 1; // 转换为0基索引
                    if (periodIndex >= 0 && periodIndex < modifiedSchedule.length) {
                        modifiedSchedule[periodIndex] = subject;
                    }
                }
            }

            return modifiedSchedule;
        }
    }

    return schedule;
}


function bgimg(imagePath) {
    return new Promise((resolve, reject) => {
        // 如果没有本地图片路径，则使用网络API
        if (!imagePath) {
            const jsonDataUrl = 'https://bing.biturl.top/?resolution=3840';
            fetch(jsonDataUrl)
                .then(response => response.json())
                .then(data => {
                    if (data && data.url) {
                        const bgImage = document.querySelector('.bg-image');
                        let imgurl = data.url;

                        bgImage.style.backgroundImage = `url(${imgurl})`;

                        const img = new Image();
                        img.crossOrigin = 'anonymous';
                        img.src = imgurl;

                        img.onload = function () {
                            const colorThief = new ColorThief();
                            try {
                                // 成功时，用resolve传递结果
                                const dominantColor = colorThief.getColor(img, 5);
                                console.log('提取的主题色:', dominantColor);
                                resolve(dominantColor);
                            } catch (error) {
                                console.error('颜色提取失败:', error);
                                // 失败时，用reject传递错误，或者resolve一个默认值
                                reject(error);
                                // 或者如果不想阻断流程，可以resolve默认颜色
                                // resolve([255, 255, 255]);
                            }
                        };

                        img.onerror = function () {
                            console.error('图片加载失败');
                            reject(new Error('图片加载失败'));
                            // 或者 resolve([255, 255, 255]);
                        };
                    } else {
                        reject(new Error('JSON数据中未找到有效的URL'));
                    }
                })
                .catch(error => {
                    console.error('获取背景图片失败:', error);
                    reject(error);
                });
        } else {
            // 使用本地图片
            const bgImage = document.querySelector('.bg-image');
            // 修复路径中的特殊字符编码问题
            const normalizedPath = imagePath.replace(/\\/g, '/').replace(/%/g, '%25');
            bgImage.style.backgroundImage = `url(file:///${normalizedPath})`;

            const img = new Image();
            img.src = `file:///${normalizedPath}`;

            img.onload = function () {
                const colorThief = new ColorThief();
                try {
                    // 成功时，用resolve传递结果
                    const dominantColor = colorThief.getColor(img, 5);
                    console.log('提取的主题色:', dominantColor);
                    resolve(dominantColor);
                } catch (error) {
                    console.error('颜色提取失败:', error);
                    // 失败时，用reject传递错误，或者resolve一个默认值
                    reject(error);
                    // 或者如果不想阻断流程，可以resolve默认颜色
                    // resolve([255, 255, 255]);
                }
            };

            img.onerror = function () {
                console.error('本地图片加载失败');
                reject(new Error('本地图片加载失败'));
            };
        }
    });
}

// 2. 使用async/await或.then()来等待操作完成
(async function () {
    try {
        // 等待Promise完成，并获取resolve传递的值（dominantColor数组）
        const dominantColor = await bgimg(backgroundImagePath);

        // 此处的dominantColor已经是有效值，第一项肯定不为-1
        console.log('成功获取颜色，执行后续操作', dominantColor);
        // 在这里执行你需要在获取主题色后进行的操作
        // 例如：应用主题色、更新UI等
        applyThemeColor(dominantColor)

    } catch (error) {
        console.error('在处理过程中发生错误:', error);
        // 处理错误，例如使用默认颜色执行操作
        const defaultColor = [255, 255, 255];
        console.log('使用默认颜色执行操作', defaultColor);
        // yourOperations(defaultColor);
    }
})();

async function startDynamicTime(timeselector, dateselector) {
    try {
        // 获取目标元素
        const timeElement = document.querySelector(timeselector);
        const dateElement = document.querySelector(dateselector)

        if (!timeElement) {
            throw new Error(`未找到选择器为 "${selector}" 的元素`);
        }

        // 更新时间函数
        const updateTime = () => {
            const now = new Date();

            // 获取时、分、秒并确保两位数显示
            const hours = now.getHours().toString().padStart(2, '0');
            const minutes = now.getMinutes().toString().padStart(2, '0');
            const seconds = now.getSeconds().toString().padStart(2, '0');
            const month = (now.getMonth() + 1).toString();
            const day = now.getDate().toString();

            // 格式化时间字符串
            const timeString = `${hours}:${minutes}:${seconds}`;
            const dateString = `${month}/${day}`;

            // 更新元素内容
            timeElement.textContent = timeString;
            dateElement.textContent = dateString;
        };

        // 立即更新一次时间
        updateTime();

        // 设置定时器，每秒更新一次
        // 返回一个Promise，该Promise不会resolve，保持定时器运行
        return new Promise((resolve) => {
            const intervalId = setInterval(updateTime, 1000);

            // 可以在这里保存intervalId以便后续清除
            timeElement._intervalId = intervalId;
        });

    } catch (error) {
        console.error('启动动态时间显示时出错:', error);
        throw error; // 重新抛出错误以便外部处理
    }
}

// 页面加载完成后启动时间显示
document.addEventListener('DOMContentLoaded', () => {
    startDynamicTime('.time-display', '.date-display')
        .catch(error => {
            console.error('时间显示功能初始化失败:', error);
        });
});