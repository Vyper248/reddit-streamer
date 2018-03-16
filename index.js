let express = require('express');
let app = express();

app.use(express.static(__dirname+'/public'));

app.get('/', function(req, res){
    res.send('Hello');
});

app.listen(34862, function(){
    console.log('Listening on port 34862');
});