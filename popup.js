chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    const currentTab = tabs[0]
    let db = initDatabase()
    bindEvent(db, currentTab)
    displayLinks(db, currentTab.url)
})

function initDatabase() {
   let db = openDatabase('associate_link', '1.0', '链接关联', 30 * 1024 * 1024)
    db.transaction(function (tx) {
        tx.executeSql('create table if not exists links (srcLink, relatedLink, relatedText)')
    })
    return db
}

function getAll(db, url, handler) {
    db.transaction(function (tx) {
        tx.executeSql('SELECT srcLink, relatedLink, relatedText FROM links where srcLink=?', [url], function (tx, data) {
            let array = []
            let len = data.rows.length;
            for (let i = 0; i < len; i++){
                let o = {}
                o.srcLink = data.rows.item(i).srcLink
                o.relatedLink = data.rows.item(i).relatedLink
                o.relatedText = data.rows.item(i).relatedText
                array.push(o)
            }
            handler(array)
        });
    });
}

function addAll(db, array) {
    db.transaction(function (tx) {
        for (let i = 0; i < array.length; i++) {
            tx.executeSql('insert into links (srcLink, relatedLink, relatedText) values (?, ?, ?) ', [array[i].srcLink, array[i].relatedLink, array[i].relatedText])
        }
    });
}

function remove(db, obj) {
    db.transaction(function (tx) {
        tx.executeSql('delete from links where srcLink = ? and relatedLink = ?', [obj.srcLink, obj.relatedLink])
    });
}

function displayLinks(db, url) {
    getAll(db, url, function (array) {
        for (let i = 0; i < array.length; i++) {
            appendChildren(array[i].relatedLink, array[i].relatedText)
        }
    })
}

function appendChildren(link, text) {
    let links = document.querySelector('#links')
    let li = document.createElement('li')
    let a = document.createElement('a')
    a.href = link
    a.text = text
    a.target = '_blank'
    li.appendChild(a)
    links.appendChild(li)
}


function clearChildren() {
    let links = document.querySelector('#links')
    while (links.firstChild) {
        links.removeChild(links.lastChild);
    }
}

function clearInputs() {
    document.querySelector('#newText').value = ''
    document.querySelector('#newLink').value = ''
    document.querySelector('#deleteLink').value = ''
}

function markLink(url, link, text, display, db) {
    getAll(db, url, function (array) {
        for (let i = 0; i < array.length; i++) {
            if (array[i].relatedLink === link) {
                return
            }
        }
        let array2 = []
        let o = {}
        o.srcLink = url
        o.relatedLink = link
        o.relatedText = text
        array2.push(o)
        addAll(db, array2)
        if (display === true) {
            appendChildren(link, text)
        }
        clearInputs()
    })
}

function bindEvent(db, currentTab) {
    document.querySelector('#createItem').addEventListener('click', () => {
        let text = document.querySelector('#newText').value;
        let link = document.querySelector('#newLink').value;
        markLink(currentTab.url, link, text, true, db)
        markLink(link, currentTab.link, currentTab.title, false, db)
    })

    document.querySelector('#markItems').addEventListener('click', () => {
        chrome.tabs.getAllInWindow(null, function(tabs){
            for (let i = 0; i < tabs.length; i++) {
                for (let j = 0; j < tabs.length; j++) {
                    if (i === j) {
                        continue
                    }
                    let display = false
                    if (tabs[i].url === currentTab.url) {
                        display = true
                    }
                    markLink(tabs[i].url, tabs[j].url, tabs[j].title, display, db)
                }
            }
        });
    })

    document.querySelector('#moreActions').addEventListener('click', () => {
        let node = document.querySelector('#moreActionsDetail')
        if (node.style.display === "none") {
            node.style.display = "block";
        } else {
            node.style.display = "none";
        }
    })

    document.querySelector('#deleteItem').addEventListener('click', () => {
        let link = document.querySelector('#deleteLink').value;
        if (link === "") {
            return
        }
        let obj = {}
        obj.srcLink = currentTab.url
        obj.relatedLink = link
        remove(db, obj)
        clearChildren()
        clearInputs()
        displayLinks(db, currentTab.url)
    })
}