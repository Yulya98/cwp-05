const http = require('http');

const hostname = '127.0.0.1';
const port = 3000;
let fs = require('fs');

let count = -1;
let dataArticles = [];
let dataComments = [];
let error = {"code": 400, "message": "Request invalid" };

const handlers = {
    '/api/articles/readall' :readall,
    '/api/articles/read' : read,
    '/api/articles/create' : create,
    '/api/articles/update' : update,
    '/api/articles/delete' : deleteArticle,
    '/api/comments/create' : createComment,
    '/api/comments/delete' : deleteComment
};

const server = http.createServer((req, res) => {
    parseBodyJson(req, (err, payload) => {
        if(dataComments.length != count)
            return;
        if(!validation(req.url, payload)){
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end( JSON.stringify(error) );
            return ;
        }

        const handler = getHandler(req.url);
        logWrite(req.url, JSON.stringify(payload));

        handler(req, res, payload, (err, result) => {
            if (err) {
                res.statusCode = err.code;
                res.setHeader('Content-Type', 'application/json');
                res.end( JSON.stringify(err) );

                return;
            }
            else {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(result));
            }
        });
    });
});

function validation(url,body) {
    if(url === '/api/articles/read'){
        if(body.id === undefined)
            return false;
    }
    if(url === '/api/articles/create'){
        if(body.title === undefined || body.text === undefined || body.date === undefined || body.author === undefined)
            return false;
    }
    if(url === '/api/articles/update'){
        if( body.text === undefined || body.id === undefined)
            return false;
    }
    if(url === '/api/articles/delete'){
        if( body.id === undefined)
            return false;
    }
    if(url === '/api/comments/create'){
        if ( body.articleId === undefined ||  body.text === undefined ||  body.date === undefined ||  body.author === undefined)
            return false;
    }
    if(url === '/api/comments/delete'){
        if( body.id === undefined)
            return false;
    }
    return true;
}

server.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
    fs.readFile('./articles.json', 'utf-8', function (err, data) {
        let text = JSON.parse(data);
        count = text.comments.length;
        for(let i = 0;i<text.articles.length;i++) {
            dataArticles.push(text.articles[i]);
        }
        for(let i = 0;i<text.comments.length;i++){
            dataComments.push(text.comments[i]);
        }
    });
});

function getHandler(url) {
    return handlers[url] || notFound;
}

function logWrite(url,body) {
    let date = Date.now();
    fs.appendFile('./logger.log', "Date: " + date +" url: "+url+ " body: "+body + " \n", (err) => {
        if (err)
            throw err;
    });
}

function readall(req, res, payload, cb) {
    const result = { articles, comments: dataArticles};
    cb(null, result);
}

function read(req, res, payload, cb) {
    let commentsArray ;
    const result = { article: [], comments: []};
    for(let i = 0;i < dataArticles.length;i++){
        if(dataArticles[i].id === payload.id){
            result.article.push(dataArticles[i]);
            commentsArray = dataArticles[i].comments;
        }
    }
    for(let j =0;j < commentsArray.length; j++) {
        for (let i = 0; i < dataComments.length; i++) {
            if (dataComments[i].id === commentsArray[j]) {
                result.comments.push(dataComments[i]);
            }
        }
    }

    cb(null, result);
}

function create(req, res, payload, cb) {
    let newItem = {"id": dataArticles.length+1, "title": payload.title, "text": payload.text, "date": payload.date, "author": payload.author, "comments": payload.comments};
    dataArticles.push(newItem);
    updateFile(dataArticles, dataComments);

    cb(null, newItem);
}

function updateFile(dataArticles, dataComments) {
    let result = {  "articles": [],"comments" :[] };
    result.articles = dataArticles;
    result.comments = dataComments;
    fs.writeFile('./articles.json',JSON.stringify(result), function (err) {
        if(err)
            console.log(err);
    });
}

function update(req, res, payload, cb) {
    for(let i = 0;i < dataArticles.length;i++){
        if(dataArticles[i].id === payload.id){
            dataArticles[i].text = payload.text;
        }
    }
    updateFile(dataArticles, dataComments);
    cb(null, null);
}

function deleteArticle(req, res, payload, cb) {
    for(let i = 0;i < dataArticles.length;i++){
        if(dataArticles[i].id === payload.id){
            dataArticles.splice(i,1);
            for(let j = 0;j < dataComments.length;j++){
                if(dataComments[j].articleId === payload.id){
                    dataComments.splice(j,1);
                }
            }
        }
    }

    updateFile(dataArticles, dataComments);
    cb(null, null);
}

function createComment(req, res, payload, cb) {
    let newItem = {"id": dataComments.length + 1, "articleId": payload.articleId, "text": payload.text,"date": payload.date,"author": payload.author};
    dataComments.push(newItem);
    updateFile(dataArticles, dataComments);
    cb(null, newItem);
}

function deleteComment(req, res, payload, cb) {
    for(let i = 0;i < dataComments.length;i++){
        if(dataComments[i].id === payload.id){
            dataComments.splice(i,1);
        }
    }
    updateFile(dataArticles, dataComments);
    cb(null, null);
}

function notFound(req, res, payload, cb) {
    cb({ code: 404, message: 'Not found'});
}

function parseBodyJson(req, cb) {
    let body = [];

    req.on('data', function(chunk) {
        body.push(chunk);
    }).on('end', function() {
        body = Buffer.concat(body).toString();

        let params = JSON.parse(body);

        cb(null, params);
    });
}