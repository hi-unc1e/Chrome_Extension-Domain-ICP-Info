chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    var url = new URL(tabs[0].url);
    var hostname = url.hostname;
    // var domain = extractMainDomain(hostname);  // You need to implement this function.
    // /Users/dpdu/Desktop/bin/Chrome_ext/Domain ICP Info/popup.js
    var icp_URL = "https://icp.chinaz.com/" + hostname;
    console.log("【ICP】" + icp_URL);
    fetchWithRetry(icp_URL, 3)
      .then(response => response.text())
      .then(data => {
        document.getElementById('content').innerHTML = craftHTML(data);
      })
      .catch(error => {
        document.getElementById('content').textContent = 'Error: ' + error.message;
      });
  });
  

  function extractValueFromHTML(html, selector) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const elements = doc.querySelectorAll(selector);
  
    const values = Array.from(elements).map(element => element.textContent);
    console.log("Try find `" + selector + "` -> " + values);
    
    return values;
  }
  

  function getDataFromHTML(html) {
    data = {};

    data.domain = extractValueFromHTML(html, "#first > li:nth-child(6) > p");
    // 主办单位名称
    data.company_name = extractValueFromHTML(html, "#companyName"); 
    // 网站名称
    data.site_name = extractValueFromHTML(html, "#first > li:nth-child(4) > p");  
    data.nature = extractValueFromHTML(html, "#first > li:nth-child(2) > p > strong");
    data.icp = extractValueFromHTML(html, "#permit");
    data.time = extractValueFromHTML(html, "#first > li:nth-child(8) > p");
    return data;
  }

  function craftHTML(html) {
    data = getDataFromHTML(html);
    var output = '<center><table>';

    output += '<tr><td><b>域名</b></td><td>' + data.domain + '</td></tr>';
    output += '<tr><td><b>性质</b></td><td>' + data.nature + '</td></tr>';
    output += '<tr><td><b>ICP号</b></td><td>' + data.icp + '</td></tr>';
    output += '<tr><td><b>网站名称</b></td><td>' + data.site_name + '</td></tr>';
    output += '<tr><td><b>单位名称</b></td><td>' + data.company_name + '</td></tr>';
    output += '<tr><td><b>审核时间</b></td><td>' + data.time + '</td></tr>';

    output += '</table></center>';

    return output;
}

function createTableFromJSON(jsonData) {
  var info = jsonData.info;

  var table = document.createElement('table');
  table.style.width = '100%';
  table.setAttribute('border', '1');

  var thead = document.createElement('thead');
  var tbody = document.createElement('tbody');

  var headers = ['Name', 'Nature', 'ICP', 'Title', 'Time'];
  var dataFields = ['name', 'nature', 'icp', 'title', 'time'];

  var headerRow = document.createElement('tr');
  headers.forEach(headerText => {
      var header = document.createElement('th');
      header.textContent = headerText;
      headerRow.appendChild(header);
  });
  thead.appendChild(headerRow);

  var dataRow = document.createElement('tr');
  dataFields.forEach(field => {
      var cell = document.createElement('td');
      cell.textContent = info[field];
      dataRow.appendChild(cell);
  });
  tbody.appendChild(dataRow);

  table.appendChild(thead);
  table.appendChild(tbody);

  return table;
}



  function fetchWithRetry(url, retries) {
    return fetch(url).catch(function(error) {
      if (retries > 1) {
        return fetchWithRetry(url, retries - 1);
      } else {
        throw error;
      }
    });
  }
  
  // You need to implement this function to extract the main domain from a hostname.
  function extractMainDomain(hostname) {
    // Check if hostname is an IP address
    var ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (ipPattern.test(hostname)) {
      return false;
    }

    var parts = hostname.split('.');
    if (parts.length > 2) {
      return parts.slice(-2).join('.');
    } else {
      return hostname;
    }
}