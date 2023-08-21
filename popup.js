chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    var url = new URL(tabs[0].url);
    var hostname = url.hostname;
    var domain = extractMainDomain(hostname);  // You need to implement this function.
    
    var apiURL = "https://api.vvhan.com/api/icp?url=" + domain;
  
    fetchWithRetry(apiURL, 3)
      .then(response => response.json())
      .then(data => {
        document.getElementById('content').innerHTML = craftHTML(data);
      })
      .catch(error => {
        document.getElementById('content').textContent = 'Error: ' + error.message;
      });
  });
  

  function craftHTML(data) {
    var output = '<center><table>';

    output += '<tr><td><b>Domain</b></td><td>' + data.domain + '</td></tr>';
    output += '<tr><td><b>Name</b></td><td>' + data.info.name + '</td></tr>';
    output += '<tr><td><b>Nature</b></td><td>' + data.info.nature + '</td></tr>';
    output += '<tr><td><b>ICP</b></td><td>' + data.info.icp + '</td></tr>';
    output += '<tr><td><b>Title</b></td><td>' + data.info.title + '</td></tr>';
    output += '<tr><td><b>Time</b></td><td>' + data.info.time + '</td></tr>';

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