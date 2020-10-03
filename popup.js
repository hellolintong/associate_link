chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    const currentTab = tabs[0]
    let db = initDatabase()
    bindEvent(db, currentTab)
    displayTags(db, currentTab.url)
})

var lastTagName

function initDatabase() {
   let db = openDatabase('tags', '1.0', '标签插件', 30 * 1024 * 1024)
    db.transaction(function (tx) {
        tx.executeSql('create table if not exists tags (tagName)')
        tx.executeSql('create table if not exists tagUrls (tagName, relatedLink, relatedText)')
        tx.executeSql('create table if not exists scene (key, value)', [], function () {
            tx.executeSql("select value from scene where key='tag'", [], function (tx, data2) {
                if (data2.rows.length === 0) {
                    tx.executeSql("insert into scene (key, value) values ('tag', '')")
                } else {
                    lastTagName = data2.rows[0].value
                }
            })
        })
    })
    return db
}

function getTagLinks(db, tagName, handler) {
    db.transaction(function (tx) {
        tx.executeSql("SELECT tagName, relatedLink, relatedText from tagUrls where tagName=?", [tagName], function (tx, data){
           handler(data)
        })
    })
}

function collectUrl(db, tagName, url, text) {
    getTagLinks(db, tagName, function (data) {
        for (let i = 0; i < data.rows.length; i++) {
            if (data.rows[i].relatedLink === url) {
                return
            }
        }
        db.transaction(function (tx) {
            tx.executeSql('insert into tagUrls (tagName, relatedLink, relatedText) values (?, ?, ?) ', [tagName, url, text], function (tx, data) {
                displayTags(db, url)
            })
        });
    })
}

function addTag(db, url, text, tagName) {
    db.transaction(function (tx) {
        tx.executeSql("SELECT tagName from tags where tagName=?", [tagName], function (tx, data) {
             for (let i = 0; i < data.rows.length; i++) {
                 if (data.rows[i].tagName === tagName) {
                     return
                 }
             }
             db.transaction(function (tx) {
                 tx.executeSql("insert into tags (tagName) values (?) ", [tagName], function (tx, data) {
                     tx.executeSql("insert into tagUrls (tagName, relatedLink, relatedText) values (?, ?, ?)", [tagName, url, text], function (tx, data) {
                         displayTags(db, url)
                     })
                 })
             })
        })
    })
}

function checkTag(db, tagName) {
    clearChildren("#links")
    getTagLinks(db, tagName, function (data) {
        let links = document.querySelector('#links')
        for (let i = 0; i < data.rows.length; i++) {
            let input = document.createElement('input')
            input.type = "radio"
            input.value = data.rows[i].relatedLink
            input.name = tagName
            let a = document.createElement('a')
            a.href = input.value
            a.text = data.rows[i].relatedText
            a.target = '_blank'
            links.appendChild(input)
            links.appendChild(a)
            links.appendChild(document.createElement('br'))
        }
    })
}

function deleteUrl(db, tagName, relatedLink) {
    db.transaction(function (tx) {
        tx.executeSql("delete from tagUrls where relatedLink = ?", [relatedLink], function (tx, data) {
            checkTag(db, tagName)
        })
    })
}

function deleteTag(db, url, tagName) {
    db.transaction(function (tx) {
        tx.executeSql("delete from tags where tagName = ?", [tagName], function (tx, data) {
            displayTags(db, url)
        })
        tx.executeSql("delete from tagUrls where tagName = ?", [tagName], function (tx, data) {
            clearChildren("#links")
        })
    })
}

function displayTags(db, url) {
    clearChildren("#tags")
    clearChildren('#links')
    db.transaction(function (tx) {
        tx.executeSql("select distinct(tagName) from tagUrls where relatedLink = ?", [url], function (tx, data) {
            let links = document.querySelector('#tags')
            for (let i = 0; i < data.rows.length; i++) {
                let input = document.createElement('input')
                input.type = "radio"

                input.value = data.rows[i].tagName
                input.name = url
                input.addEventListener('change', function (){
                    lastTagName = getSelectedTag()
                    db.transaction(function (tx) {
                        tx.executeSql('update scene set value=? where key=?', [lastTagName, 'tag'], function () {
                            checkTag(db, data.rows[i].tagName)
                        })
                    })
                })
                links.appendChild(input)
                links.appendChild(document.createTextNode(data.rows[i].tagName))
                links.appendChild(document.createElement('br'))
                if (data.rows[i].tagName === lastTagName) {
                    input.click()
                }
            }

            links.appendChild(document.createTextNode('--------'))
            links.appendChild(document.createElement('br'))

            tx.executeSql("select distinct(tagName) from tagUrls where relatedLink != ?", [url], function (tx, data2) {
                let links = document.querySelector('#tags')
                for (let i = 0; i < data2.rows.length; i++) {
                    let found = false
                    for (let j = 0; j < data.rows.length; j++) {
                        if (data2.rows[i].tagName === data.rows[j].tagName) {
                            found = true
                            break
                        }
                    }
                    if (found === true) {
                        continue
                    }
                    let input = document.createElement('input')
                    input.type = "radio"
                    input.value = data2.rows[i].tagName
                    input.name = url
                    input.addEventListener('change', function (){
                        checkTag(db, data2.rows[i].tagName)
                    })
                    links.appendChild(input)
                    links.appendChild(document.createTextNode(data2.rows[i].tagName))
                    links.appendChild(document.createElement('br'))
                    if (data2.rows[i].tagName === lastTagName) {
                        input.click()
                    }
                }
            })
        })
    })
}


function clearChildren(name) {
    let nodes = document.querySelector(name)
    while (nodes.firstChild) {
        nodes.removeChild(nodes.lastChild);
    }
}

function clearInputs() {
    document.querySelector('#newTag').value = ''
}

function getSelectedTag() {
    let tags = document.querySelector('#tags').childNodes
    for (let i = 0; i < tags.length; i++) {
        if (tags[i].checked === true) {
            return tags[i].value
        }
    }
    return "";
}

function getSelectedUrl() {
    let links = document.querySelector('#links').childNodes
    for (let i = 0; i < links.length; i++) {
        if (links[i].checked === true) {
            return links[i].value
        }
    }
    return "";
}

function bindEvent(db, currentTab) {
    document.querySelector('#collectUrl').addEventListener('click', () => {
        let tagName = getSelectedTag()
        if (tagName === "") {
            return
        }
        collectUrl(db, tagName, currentTab.url, currentTab.title)
    })

    document.querySelector('#addTag').addEventListener('click', () => {
       let tagName = document.querySelector('#newTag').value
        addTag(db, currentTab.url, currentTab.title, tagName)
        clearInputs()
    })

    document.querySelector('#deleteTag').addEventListener('click', () => {
        let tagName = getSelectedTag()
        if (tagName === "") {
            return
        }
        deleteTag(db, currentTab.url, tagName)
    })

    document.querySelector('#deleteUrl').addEventListener('click', () => {
        let tagName = getSelectedTag()
        let urlName = getSelectedUrl()
        if (urlName === "" || tagName === "") {
            return
        }
        deleteUrl(db, tagName, urlName)
    })
}