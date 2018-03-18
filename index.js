let express = require('express');
let app = express();

app.use(express.static(__dirname+'/public'));

app.get('*', function(req, res){
    res.redirect('redditStreamer.html');
});

var port = process.env.PORT || 34862;
var ip = process.env.IP;
app.listen(port, ip, function(){
    console.log('Listening on port '+port);
});