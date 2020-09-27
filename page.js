
function addLink(url) {
  alert(url)
  let text = document.querySelector('#newText')
  let link = document.querySelector('#newLink')
    alert(text)
  alert(link)
  let links = document.querySelector('#links')
  let li = document.createElement('li')
  let a = document.createElement('a')
  a.href = link
  a.text = text
  li.appendChild(a)
  links.appendChild(li)

  let linkContent = localStorage.getItem("link_" + url)
  let textContent = localStorage.getItem("text_" + url)
  if (linkContent === null || textContent === null) {
    localStorage.setItem("link_" + url, link)
    localStorage.setItem("text_" + url, text)
  } else {
    localStorage.setItem("link_" + url, linkContent + '||' + link)
    localStorage.setItem("text_" + url, textContent + '||' + text)
  }
}

// 监听消息
chrome.runtime.onMessage.addListener((data, sender, callback) => {
  if (data.msg === 'createItem') {
    addLink(data.url)
  }
})