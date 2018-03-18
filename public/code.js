    var sound = new Howl({
        src: ['howler/squiggle.mp3'],
        volume: 0.25,
    });
    
    var app = angular.module('redditApp', []);
    app.controller('myCtrl', function($scope) {  
        
        //setup variables----------------------------------------
        
        //cache for storing current threads
        $scope.threadCache = {};  
        
        //variables for multis
        $scope.currentMulti = localStorage.currentMulti || 'All';
        $scope.multis = localStorage.multis;
        if ($scope.multis === undefined) $scope.multis = JSON.stringify([{name: 'Subs', array: ['All']}, {name: 'Playstation', array: ['PSVR','PS4']}]);
        $scope.multis = JSON.parse($scope.multis);
        
        //storage of items already seen, so they don't turn red again
        let clickedArray = localStorage.clicked;
        if (clickedArray === undefined) $scope.clickedOn = [];
        else $scope.clickedOn = clickedArray.split(',');
        
        //variables to store current array of comments and current thread, used for comments modal
        $scope.currentComments = [];
        $scope.currentThread = {};
        
        //search result variables
        let timer;
        $scope.searchResults = [''];
        
        //variable linked to sub search input
        $scope.searchText = '';
        
        //array to store threads
        $scope.currentThreads = [];
        $scope.mute = true;
        
        //functions ---------------------------------------------------------------------------------------------
        
        //update local storage if user changes subs selection
        $scope.updateStorage = function(){
            localStorage.setItem('subs', $scope.subs);
            localStorage.setItem('multis', JSON.stringify($scope.multis));
            localStorage.setItem('currentMulti', $scope.currentMulti);
        };
        
        //Adding and removing Subs ---------------------------------------------
        //function to add sub to array
         $('.ui.dropdown').dropdown({
            onChange: function(value, text){
                if (value && $scope.subAlreadyAdded(value) === false){
                    $scope.subs += '+'+value;
                    $scope.subArray.push(value);
                    $scope.updateStorage();
                    $scope.$apply();
                    $('.ui.dropdown').dropdown('set text', '<i class="search icon"></i>Search Subs');
                } else {
                    $('.ui.dropdown').dropdown('set text', '<i class="search icon"></i>Search Subs');
                }                    
            }
        });
        
        //remove sub from array and update storage
        $scope.removeSub = function(sub){
            $scope.subArray.splice($scope.subArray.indexOf(sub), 1);
            if ($scope.subArray.length === 0) $scope.subArray = ['All'];
            $scope.subs = $scope.subArray.join('+');
            $scope.updateStorage();
        }
        
        //check if sub is already added
        $scope.subAlreadyAdded = function(sub){
            if ($scope.subArray.indexOf(sub) !== -1) return true;
            else return false;
        }
        
        //check if search dropdown should be disabled or not
        $scope.searchDisabled = function(){
            if ($scope.currentMulti === 'All') return 'disabled';
            else return '';
        }
        
        //gets array of subs which match search string
        $scope.searchSubs = function(){
            if (timer) clearTimeout(timer);
            timer = setTimeout(function(){
                timer = undefined;
                $.getJSON('https://www.reddit.com/subreddits/search.json?q='+$scope.searchText, function(data){
                    $scope.searchResults = data.data.children.map((item) => item.data.display_name);
                    $scope.$apply();
                });
            }, 500);
        };
        
        //Functions for multis -------------------------------------------------

        //function to get style for currentMulti
        $scope.checkMulti = function(multi){
            if (multi === $scope.currentMulti){
                return {backgroundColor: 'lightgray'};
            } else {
                return {};
            }
        }

        //when user selects a multi, switch current sub array to that one
        $scope.selectMulti = function(multi){
            $scope.threadCache[$scope.currentMulti] = $scope.currentThreads;
            if (multi === 'All') {
                $scope.subArray = [];
                $scope.multis.forEach((multi) => $scope.subArray.push(...multi.array));
                $scope.subs = $scope.subArray.join('+');
                $scope.currentMulti = 'All';
                $scope.updateStorage();
            } else {
                $scope.subArray = $scope.multis.find((group) => group.name === multi).array;
                $scope.subs = $scope.subArray.join('+');
                $scope.currentMulti = multi;
                $scope.updateStorage();
            }
            $scope.currentThreads = $scope.threadCache[multi] || [];
            getNewData();
        }
        
        //setup initial variables
        $scope.selectMulti($scope.currentMulti);
        
        $scope.editMultis = function(){
            $('#multiModal').modal('show');
        };
        
        //edit the name of a multi
        $scope.editMultiName = function(multi, event){
            let newValue = event.currentTarget.value;
            if (newValue.length === 0) newValue = 'Empty';
            if ($scope.currentMulti === multi.name) $scope.currentMulti = newValue;
            multi.name = newValue;
            $scope.updateStorage();
        }
        
        //add a new multi with default values
        $scope.addMulti = function(){
            $scope.multis.push({name: 'New', array: []});
        }
        
        $scope.deleteMulti = function(multi){
            let index = $scope.multis.indexOf(multi);
            $scope.multis.splice(index, 1);
            $scope.updateStorage();
        }
        
        //Various other functions ----------------------------------------------
        
        //remove red outline when user clicks on a thread
        $scope.removeColour = function(thread){
            if (thread.colour !== ''){
                thread.colour = '';
                $scope.clickedOn.push(thread.id);
                localStorage.setItem('clicked', $scope.clickedOn.join(','));
            }
        }
        
        //return number of new items
        $scope.newItems = function(){
            let newItems = $scope.currentThreads.filter((thread) => thread.colour !== '');
            if (newItems !== undefined) {
                return newItems.length;
            }
            return 0;
        }
        
        $scope.markAllRead = function(){
            $scope.currentThreads.forEach((thread) => $scope.removeColour(thread));
        }
        
        //Comment functions ----------------------------------------------------
        
        //open modal view with comments
        $scope.showComments = function(thread){
            let url = "http://www.reddit.com/r/"+thread.sub+"/"+thread.id+".json";
            $.get(url, function(data){
                let comments = data[1].data.children;
                $('#comments').html("");
                //top level comments
                addComments(comments, '#comments');
                $('#title').html("<span class='sub'>"+thread.sub+"</span> - "+thread.title+"<br>"+"<h4 class='sub'>"+thread.author+"</h4>");
                $('#commentModal').modal({centered: false}).modal('show');
            });
        }
        
        //recursive function that goes through comment children and adds them to the comment div
        function addLowerComments(upperComment, div){
            let replies = upperComment.replies;
            if (replies){
                let comments = replies.data.children;
                addComments(comments, div);
            }
        }
        
        //sorts and adds comments from array
        function addComments(comments, div){
            comments.sort((a,b) => b.data.created - a.data.created);
            comments.forEach((comment) => {
                let data = comment.data;
                let text = data.body_html;
                let author = data.author;
                let html = $.parseHTML(text)[0].data;
                let commentDiv = $('<div class="ui segment" id="comment">').html(html).appendTo(div);
                
                let commentHeader = $('<h4 class="sub">').prependTo(commentDiv);
                let closeComment = $("<span onclick='closeComment(this)' class='pointer'>").text('[-] ').prependTo(commentHeader);
                let authorSpan = $("<span>").text(author).appendTo(commentHeader);
                if (data.is_submitter) authorSpan.addClass('OP');
                addLowerComments(data, commentDiv);
            });
        }

        //functions for getting new thread data from Reddit --------------------
        
        //set interval for getting new data, currently every second
        setInterval(()=>{
            getNewData();
        }, 5000);
        
        //Initial gather
        getNewData();
        
        //get new data from reddit in JSON format
        function getNewData(){
            if ($scope.subs.length === 0) return;
            let currentSubs = $scope.subs;
            $.getJSON('https://www.reddit.com/r/'+$scope.subs+'/new.json',function(data){
                //just in case user switches while gathering new list of threads
                if ($scope.subs !== currentSubs) return;
                //threads is within data.children (array)
                let addedNew = false;
                let threads = data.data.children;
                
                //for each thread, get desired data and create an object
                threads.forEach((thread) => {
                    let data = thread.data;
                    let obj = {
                        id: data.id,
                        author: data.author,
                        created: data.created,
                        title: data.title,
                        description: data.selftext,
                        url: data.url,
                        sub: data.subreddit,
                        comments: data.permalink,
                        domain: data.domain,
                        numberComments: data.num_comments,
                        colour: 'red'
                    };
                    if ($scope.clickedOn.indexOf(obj.id) !== -1) obj.colour = '';
                    if (checkExists(obj) === false){
                        //console.log(obj, " doesn't exist");
                        $scope.currentThreads.unshift(obj);
                        if ($scope.currentThreads.length > 75) $scope.currentThreads.pop();
                        addedNew = true;
                    } else {
                        let existing = $scope.currentThreads.find((thread) => thread.id === obj.id);
                        existing.numberComments = obj.numberComments;
                        if ($scope.clickedOn.indexOf(existing.id) !== -1) existing.colour = '';
                        $scope.$apply();
                    }
                });
                
                //if found a new thread, then sort array, play a sound and update Angular
                if (addedNew){
                    $scope.currentThreads.sort((a,b) => b.created - a.created);
                    $scope.$apply();
                    if ($scope.mute === false){
                        sound.play();
                    }
                }
                
                
            });
        }
        
        //check if a thread already exists in the array
        function checkExists(obj){
            let exists = false;
            let test = $scope.currentThreads.find((thread) => thread.id == obj.id);
            if (test !== undefined) exists = true;
            return exists;
        }
    });
    
    //closes a comment
    let closeComment = function(e){
        if ($(e).text() === '[-] ') $(e).text('[+] ');
        else $(e).text('[-] ');
        $(e).parent().parent().toggleClass('closed');
    }
