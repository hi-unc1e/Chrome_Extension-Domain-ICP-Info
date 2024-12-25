// 获取当前标签页信息并发起API请求
chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    const url = new URL(tabs[0].url);
    const hostname = extractMainDomain(url.hostname);
    const icp_URL = "https://api.leafone.cn/api/icp?name=" + hostname;
    
    console.log("【ICP查询】" + icp_URL);
    
    fetchWithRetry(icp_URL, 3)
      .then(response => response.json())  // 改为解析JSON
      .then(data => {
        const processedData = getDataFromJSON(data);
        document.getElementById('content').innerHTML = craftHTML(processedData);
      })
      .catch(error => {
        document.getElementById('content').innerHTML = `
          <div style="color: red; text-align: center;">
            查询失败: ${error.message}<br>
            <a href="${icp_URL}" target="_blank">点击直接访问API</a>
          </div>`;
      });
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