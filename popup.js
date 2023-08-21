chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    var url = new URL(tabs[0].url);
    var hostname = url.hostname;
    var domain = extractMainDomain(hostname);  // You need to implement this function.
    
    var apiURL = "https://api.vvhan.com/api/icp?url=" + domain;
  
    fetchWithRetry(apiURL, 3)
      .then(response => response.json())
      .then(data => {
        var table = createTableFromJSON(data);
        document.body.appendChild(table);
        document.getElementById('content').appendChild(table);
        // document.getElementById('content').textContent = table;
        // document.getElementById('content').textContent = JSON.stringify(data, null, 2);
      })
      .catch(error => {
        document.getElementById('content').textContent = 'Error: ' + error.message;
      });
  });
  


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