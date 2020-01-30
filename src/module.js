const marked = require ('marked');

const getAlignedContent = (mdContent) => {
    var headings = mdContent.match(/(?:\r\n)#.*$/mg);
    if (!headings) {
        return mdContent;
    }
    for (var i = 0; i < headings.length; i++) {
        var heading = headings[i].trim();
        var propHeading = new RegExp('(?:\r\n){2}' + heading + '.*$', 'mg');
        if(!mdContent.match(propHeading)) {
            var wrongHeading = new RegExp('(?:\r\n)' + heading + '.*$', 'mg');
            mdContent = mdContent.replace(wrongHeading, '\r\n\r\n' + heading);
        }
    }
    return mdContent;
}

module.exports.markdown_to_jsontree = (markdown) => {
    return new Promise ((resolve, reject) => {
        var linear          = marked.lexer (getAlignedContent (markdown)),
            currentDepth    = 0,
            resultObject    = null,
            objectsMap      = { },
            isList          = false,
            latestListItem  = null,
            listItemCount   = 0;
        
        linear.forEach ((item, index) => {
            // console.log ('==>', item.type);

            switch (item.type) {
                case 'heading':
                    var entry = {
                        text: item.text,
                        children: []      
                    }
                    

                    if (resultObject === null) {
                        resultObject = entry;
                        currentDepth = item.depth;
                        objectsMap[currentDepth] = entry;
                    } else if (item.depth > currentDepth) {
                        objectsMap[currentDepth].children.push (entry);
                        currentDepth = item.depth;
                        objectsMap[currentDepth] = entry;
                    } else if (currentDepth === item.depth) {
                        objectsMap[currentDepth - 1].children.push (entry);
                        objectsMap[currentDepth] = entry;
                    } else {
                        var par_depth = currentDepth - (currentDepth - item.depth) - 1,
                            ent_depth = par_depth + 1;
                               
                        objectsMap[par_depth].children.push (entry);
                        objectsMap[ent_depth] = entry;
                        currentDepth = item.depth;
                    }

                    // console.log (currentDepth);

                    break;
                case 'code':
                    if (objectsMap[currentDepth]) {
                        objectsMap[currentDepth].children.push ({
                            type: 'code',
                            text: item.text
                        })
                    }
                    break;
                case 'list_start':
                    isList = true;
                    break;
                case 'list_end':
                    isList = false;
                    break;
                case 'list_item_start':
                    latestListItem = {
                        type: 'list',
                        text: ''
                    }
                    break;
                case 'list_item_end':
                    if (objectsMap[currentDepth]) {
                        objectsMap[currentDepth].children.push (latestListItem)
                    }
                    break;
                case 'space':
                    // console.log ('space', item)
                    break;
                case 'paragraph':
                    if (objectsMap[currentDepth]) {
                        objectsMap[currentDepth].children.push ({
                            type: 'paragraph',
                            text: item.text
                        })
                    }
                    break;
                case 'text':
                    // console.log ('>> text', item.text, item)
                    var type = isList ? 'list' : 'text';

                    if (isList) {
                        if (latestListItem) {
                            latestListItem.text += ((latestListItem !== '' ? ' ' : '') + item.text);
                        }
                    } 
                    
                    else if (objectsMap[currentDepth]) {
                        objectsMap[currentDepth].children.push ({
                            type: 'text',
                            text: item.text
                        })
                    }
                    break;
                default:
                    break;
            }
        });

        resolve (resultObject);
    })
}