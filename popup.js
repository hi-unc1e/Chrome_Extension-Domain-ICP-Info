// API配置对象
const API_CONFIG = {
    icp_leafone: {
        baseUrl: "https://api.leafone.cn/api/icp",
        buildUrl: (hostname) => `https://api.leafone.cn/api/icp?name=${hostname}`,
        parseResponse: (jsonData) => {
            if (jsonData.code !== 200 || !jsonData.data || !jsonData.data.list || jsonData.data.list.length === 0) {
                return getEmptyData();
            }
            const info = jsonData.data.list[0];
            return {
                domain: info.domain || "未知",
                company_name: info.unitName || "未知",
                site_name: info.domain || "未知",
                nature: info.natureName || "未知",
                icp: info.serviceLicence || "未知",
                time: info.updateRecordTime || "未知"
            };
        },
        cacheExpiration: 24 * 60 * 60 * 1000, // 24小时
        retryCount: 3
    }
    // 可以添加更多API配置
    // whois: { ... },
    // dns: { ... }
};

// 缓存管理类
class CacheManager {
    static async get(key, expiration) {
        return new Promise((resolve) => {
            chrome.storage.local.get(key, (result) => {
                if (result[key] && !this.isExpired(result[key].timestamp, expiration)) {
                    console.log(`【缓存命中】${key}`);
                    resolve(result[key].data);
                } else {
                    resolve(null);
                }
            });
        });
    }

    static async set(key, data) {
        return new Promise((resolve) => {
            chrome.storage.local.set({
                [key]: {
                    data: data,
                    timestamp: Date.now()
                }
            }, () => {
                console.log(`【已缓存】${key}`);
                resolve();
            });
        });
    }

    static isExpired(timestamp, expiration) {
        return Date.now() - timestamp > expiration;
    }
}

// API请求类
class APIClient {
    static async fetch(url, retries = 1) {
        try {
            const response = await fetch(url);
            return await response.json();
        } catch (error) {
            if (retries > 1) {
                return this.fetch(url, retries - 1);
            }
            throw error;
        }
    }
}

// 数据查询类
class DataFetcher {
    constructor(apiType) {
        this.config = API_CONFIG[apiType];
        if (!this.config) {
            throw new Error(`未知的API类型: ${apiType}`);
        }
    }

    async getData(hostname) {
        try {
            // 尝试从缓存获取
            const cachedData = await CacheManager.get(hostname, this.config.cacheExpiration);
            if (cachedData) {
                return cachedData;
            }

            // 发起API请求
            const url = this.config.buildUrl(hostname);
            console.log(`【API查询】${url}`);
            
            const response = await APIClient.fetch(url, this.config.retryCount);
            const processedData = this.config.parseResponse(response);
            
            // 保存到缓存
            await CacheManager.set(hostname, processedData);
            
            return processedData;
        } catch (error) {
            console.error('查询失败:', error);
            return getEmptyData();
        }
    }
}

// 辅助函数
function getEmptyData() {
    return {
        domain: "未查询到",
        company_name: "未查询到",
        site_name: "未查询到",
        nature: "未查询到",
        icp: "未查询到",
        time: "未查询到"
    };
}

// UI渲染类
class UIRenderer {
    static renderResult(data) {
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

    static renderError(error, url) {
        return `
            <div style="color: red; text-align: center;">
                查询失败: ${error.message}<br>
                <a href="${url}" target="_blank">点击直接访问API</a>
            </div>`;
    }
}

// 主程序入口
chrome.tabs.query({active: true, currentWindow: true}, async function(tabs) {
    const url = new URL(tabs[0].url);
    const hostname = extractMainDomain(url.hostname);
    
    try {
      // 指定API类型
        const fetcher = new DataFetcher('icp_leafone');
        const data = await fetcher.getData(hostname);
        document.getElementById('content').innerHTML = UIRenderer.renderResult(data);
    } catch (error) {
        document.getElementById('content').innerHTML = UIRenderer.renderError(
            error, 
            API_CONFIG.icp.buildUrl(hostname)
        );
    }
});

// 域名处理函数保持不变
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