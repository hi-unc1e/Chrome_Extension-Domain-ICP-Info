// API配置对象
const API_CONFIG = {
    icp_leafone: {
        baseUrl: "https://api.leafone.cn/api/icp",
        buildUrl: (hostname) => `https://api.leafone.cn/api/icp?name=${hostname}`,
        parseResponse: (jsonData) => {
            if (jsonData.code !== 200 || !jsonData.data || !jsonData.data.list || jsonData.data.list.length === 0) {
                return null; // 返回null表示解析失败，触发备用API
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
        cacheExpiration: 24 * 60 * 60 * 1000,
        retryCount: 3
    },
    icp_apihz: {
        baseUrl: "https://cn.apihz.cn/api/wangzhan/icp.php",
        buildUrl: (hostname) => `https://cn.apihz.cn/api/wangzhan/icp.php?id=88888888&key=88888888&domain=${hostname}`,
        parseResponse: (jsonData) => {
            if (jsonData.code !== 200) {
                return null;
            }
            return {
                domain: jsonData.domain || "未知",
                company_name: jsonData.unit || "未知",
                site_name: jsonData.domain || "未知",
                nature: "未知", // 该API无此字段
                icp: jsonData.icp || "未知",
                time: jsonData.time || "未知"
            };
        },
        cacheExpiration: 24 * 60 * 60 * 1000,
        retryCount: 3
    }
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
    constructor(primaryApiType, fallbackApiType = null) {
        this.primaryConfig = API_CONFIG[primaryApiType];
        this.fallbackConfig = fallbackApiType ? API_CONFIG[fallbackApiType] : null;
        
        if (!this.primaryConfig) {
            throw new Error(`未知的主API类型: ${primaryApiType}`);
        }
    }

    async getData(hostname) {
        try {
            // 尝试从缓存获取
            const cachedData = await CacheManager.get(hostname, this.primaryConfig.cacheExpiration);
            if (cachedData) {
                return cachedData;
            }

            // 尝试主API
            let data = await this.tryFetchAPI(hostname, this.primaryConfig);
            
            // 如果主API失败且存在备用API，尝试备用API
            if (!data && this.fallbackConfig) {
                console.log('主API失败，尝试备用API');
                data = await this.tryFetchAPI(hostname, this.fallbackConfig);
            }

            // 如果所有API都失败，返回空数据
            if (!data) {
                return getEmptyData();
            }

            // 保存到缓存
            await CacheManager.set(hostname, data);
            return data;

        } catch (error) {
            console.error('查询失败:', error);
            return getEmptyData();
        }
    }

    async tryFetchAPI(hostname, config) {
        try {
            const url = config.buildUrl(hostname);
            console.log(`【API查询】${url}`);
            
            const response = await APIClient.fetch(url, config.retryCount);
            return config.parseResponse(response);
        } catch (error) {
            console.error(`API请求失败:`, error);
            return null;
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
        // 创建DataFetcher实例时指定主API和备用API
        const fetcher = new DataFetcher('icp_leafone', 'icp_apihz');
        const data = await fetcher.getData(hostname);
        document.getElementById('content').innerHTML = UIRenderer.renderResult(data);
    } catch (error) {
        document.getElementById('content').innerHTML = UIRenderer.renderError(
            error, 
            API_CONFIG.icp_leafone.buildUrl(hostname)
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