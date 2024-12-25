// 缓存相关配置
const CACHE_EXPIRATION =  30 * 24 * 60 * 60 * 1000; // 30天过期

// 检查缓存是否过期
function isCacheExpired(timestamp) {
    return Date.now() - timestamp > CACHE_EXPIRATION;
}

// 从缓存获取数据
async function getFromCache(hostname) {
    return new Promise((resolve) => {
        chrome.storage.local.get(hostname, (result) => {
            if (result[hostname] && !isCacheExpired(result[hostname].timestamp)) {
                console.log("【缓存命中】", hostname);
                resolve(result[hostname].data);
            } else {
                resolve(null);
            }
        });
    });
}

// 将数据存入缓存
async function saveToCache(hostname, data) {
    return new Promise((resolve) => {
        chrome.storage.local.set({
            [hostname]: {
                data: data,
                timestamp: Date.now()
            }
        }, () => {
            console.log("【已缓存】", hostname);
            resolve();
        });
    });
}

// 获取当前标签页信息并发起API请求
chrome.tabs.query({active: true, currentWindow: true}, async function(tabs) {
    const url = new URL(tabs[0].url);
    const hostname = extractMainDomain(url.hostname);
    const icp_URL = "https://api.leafone.cn/api/icp?name=" + hostname;
    
    try {
        // 先尝试从缓存获取
        const cachedData = await getFromCache(hostname);
        if (cachedData) {
            document.getElementById('content').innerHTML = craftHTML(cachedData);
            return;
        }

        console.log("【ICP查询】" + icp_URL);
        
        // 缓存未命中，发起API请求
        const response = await fetchWithRetry(icp_URL, 3);
        const data = await response.json();
        const processedData = getDataFromJSON(data);
        
        // 保存到缓存
        await saveToCache(hostname, processedData);
        
        // 显示结果
        document.getElementById('content').innerHTML = craftHTML(processedData);
    } catch (error) {
        document.getElementById('content').innerHTML = `
            <div style="color: red; text-align: center;">
                查询失败: ${error.message}<br>
                <a href="${icp_URL}" target="_blank">点击直接访问API</a>
            </div>`;
    }
});

// 解析API返回的JSON数据
function getDataFromJSON(jsonData) {
    // 检查API返回状态
    if (jsonData.code !== 200 || !jsonData.data || !jsonData.data.list || jsonData.data.list.length === 0) {
        return {
            domain: "未查询到",
            company_name: "未查询到",
            site_name: "未查询到",
            nature: "未查询到",
            icp: "未查询到",
            time: "未查询到"
        };
    }

    const info = jsonData.data.list[0];
    return {
        domain: info.domain || "未知",
        company_name: info.unitName || "未知",
        site_name: info.domain || "未知", // API中没有单独的网站名称，使用域名代替
        nature: info.natureName || "未知",
        icp: info.serviceLicence || "未知",
        time: info.updateRecordTime || "未知"
    };
}

// 生成HTML展示内容
function craftHTML(data) {
    return `
        <center>
            <table>
                <tr><td><b>域名</b></td><td>${data.domain}</td></tr>
                <tr><td><b>网站名</b></td><td>${data.site_name}</td></tr>
                <tr><td><b>性质</b></td><td>${data.nature}</td></tr>
                <tr><td><b>单位名称</b></td><td>${data.company_name}</td></tr>
                <tr><td><b>审核时间</b></td><td>${data.time}</td></tr>
                <tr><td><b>ICP</b></td><td>${data.icp}</td></tr>
            </table>
        </center>`;
}

// 重试机制
function fetchWithRetry(url, retries) {
    return fetch(url).catch(function(error) {
        if (retries > 1) {
            return fetchWithRetry(url, retries - 1);
        }
        throw error;
    });
}

// 提取主域名
function extractMainDomain(hostname) {
    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (ipPattern.test(hostname)) {
        return hostname;
    }

    const parts = hostname.split('.');
    if (parts.length > 2) {
        return parts.slice(-2).join('.');
    }
    return hostname;
}