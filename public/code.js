    var sound = new Howl({
        src: ['howler/squiggle.mp3'],
        volume: 0.25,
    });
    
    $('.tabular.menu .item').tab();
    
    var app = angular.module('redditApp', []);
    app.controller('myCtrl', function($scope) {  
        
        //setup variables----------------------------------------
        
        //cache for storing current threads
        $scope.threadCache = {};  
        
        //variables for multis
        $scope.currentMulti = localStorage.currentMulti || 'All';
        $scope.multis = localStorage.multis;
        if ($scope.multis === undefined) $scope.multis = JSON.stringify([{name: 'Playstation', array: ['PSVR','PS4']}]);
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
        
        //variable to switch between new or hot etc
        $scope.sortType = '/new';
        
        //array to store threads
        $scope.currentThreads = [];
        $scope.mute = true;
        
        //array to store filters for unwanted threads - case insensitive
        $scope.filterUnwanted = localStorage.filterUnwanted;
        if ($scope.filterUnwanted === undefined) $scope.filterUnwanted = '[]';
        $scope.filterUnwanted = JSON.parse($scope.filterUnwanted);
        
        //array to store filters for only wanted threads
        $scope.filterWanted = localStorage.filterWanted;
        if ($scope.filterWanted === undefined) $scope.filterWanted = '[]';
        $scope.filterWanted = JSON.parse($scope.filterWanted);
        
        //variable to keep track of how much time has passed since last update
        let firstTime = new Date();
        
        //functions ---------------------------------------------------------------------------------------------
        
        //update local storage if user changes subs selection
        $scope.updateStorage = function(){
            localStorage.setItem('subs', $scope.subs);
            localStorage.setItem('multis', JSON.stringify($scope.multis));
            localStorage.setItem('currentMulti', $scope.currentMulti);
            localStorage.setItem('filterUnwanted', JSON.stringify($scope.filterUnwanted));
            localStorage.setItem('filterWanted', JSON.stringify($scope.filterWanted));
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
            getNewData(75);
        }
        
        //setup initial variables
        $scope.selectMulti($scope.currentMulti);
        
        $scope.editMultis = function(){
            $('#multiModal').modal({centered: false}).modal('show');
        };
        
        //edit the name of a multi
        $scope.editMultiName = function(multi, event){
            let newValue = event.currentTarget.value;
            if (newValue.length === 0) newValue = 'Empty';
            if ($scope.currentMulti === multi.name) $scope.currentMulti = newValue;
            multi.name = newValue;
            $scope.updateStorage();
        };
        
        //add a new multi with default values
        $scope.addMulti = function(){
            //console.log($scope.multis);
            $scope.multis.push({name: 'New', array: []});
        };
        
        $scope.deleteMulti = function(multi){
            let index = $scope.multis.indexOf(multi);
            $scope.multis.splice(index, 1);
            $scope.updateStorage();
        };
        
        //Filter Functions -----------------------------------------------------
        $scope.addFilterUnwanted = function(){
            $scope.filterUnwanted.push('New');
        };
        
        $scope.deleteFilterUnwanted = function(filter){
            let index = $scope.filterUnwanted.indexOf(filter);
            $scope.filterUnwanted.splice(index, 1);
            $scope.updateStorage();
        };
        
        $scope.editFilterUnwantedName = function(filter, event){
            let newValue = event.currentTarget.value;
            let index = $scope.filterUnwanted.indexOf(filter);
            if (newValue.length === 0) newValue = 'Empty';
            $scope.filterUnwanted[index] = newValue;
            $scope.updateStorage();
        };
        
        $scope.addFilterWanted = function(){
            $scope.filterWanted.push('New');
        };
        
        $scope.deleteFilterWanted = function(filter){
            let index = $scope.filterWanted.indexOf(filter);
            $scope.filterWanted.splice(index, 1);
            $scope.updateStorage();
        };
        
        $scope.editFilterWantedName = function(filter, event){
            let newValue = event.currentTarget.value;
            let index = $scope.filterWanted.indexOf(filter);
            if (newValue.length === 0) newValue = 'Empty';
            $scope.filterWanted[index] = newValue;
            $scope.updateStorage();
        };
        
        //Various other functions ----------------------------------------------

        //remove red outline when user clicks on a thread
        $scope.removeColour = function(thread){
            if (thread.colour !== ''){
                thread.colour = '';
                $scope.clickedOn.push(thread.id);
                if ($scope.clickedOn.length > 3000) $scope.clickedOn.shift();
                localStorage.setItem('clicked', $scope.clickedOn.join(','));
            }
        };
        
        //return number of new items
        $scope.newItems = function(){
            let newItems = $scope.currentThreads.filter((thread) => thread.colour !== '');
            if (newItems !== undefined) {
                return newItems.length;
            }
            return 0;
        };
        
        $scope.markAllRead = function(){
            $scope.currentThreads.forEach((thread) => $scope.removeColour(thread));
        };
        
        $scope.switchType = function(){
            $scope.sortType === '/new' ? $scope.sortType = '/hot' : $scope.sortType = '/new';
            $scope.currentThreads = [];
            $scope.threadCache = {};
            getNewData(75);
        }
        
        //Comment functions ----------------------------------------------------
        
        //open modal view with comments
        $scope.showComments = function(thread){
            let url = "https://www.reddit.com/r/"+thread.sub+"/"+thread.id+".json";
            
            $('#commentTitle').html("<span class='sub'>"+thread.sub+"</span> - "+thread.title+"<br>"+"<h4 class='sub'>"+thread.author+"</h4>");
            let text_html = $.parseHTML(thread.description_html);
            //check if thread contains text or media and parse
            let hasMedia = false;
            if (text_html) {
                text_html = text_html[0].data;
            } else {
                if (thread.media.content !== undefined){
                    text_html = $.parseHTML(thread.media.content)[0].data;
                    hasMedia = true;
                } else {
                    text_html = '';
                }
            }
            $('#threadBody').html(text_html);
            if (hasMedia) $('#threadBody').addClass('centered');
            else $('#threadBody').removeClass('centered');
            
            $('#comments').html('<div class="ui active centered inline loader"></div>');
            $('#commentModal').modal({
                centered: false,
                onHide: function(){
                    $('#threadBody').html('');
                },
            }).modal('show');
            
            $.get(url, function(data){
                let comments = data[1].data.children;
                $('#comments').html('');
                //top level comments
                addComments(comments, '#comments');
            });
        };
        
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
                if (comment.kind === 'more') return;
                let data = comment.data;
                let text = data.body_html;
                let author = data.author;
                let html = $.parseHTML(text);
                if (html) html = html[0].data;
                else html = '';
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
            getNewData(10);
        }, 5000);
        
        //Initial gather
        getNewData(75);
        
        //get new data from reddit in JSON format
        function getNewData(limit){
            //if users hibernates or loses internet etc, then when they try again, use the high limit
            let secondTime = new Date();
            if (secondTime - firstTime > 20000) limit = 75;
            
            if ($scope.subs.length === 0) return;
            let currentSubs = $scope.subs;
            $.getJSON('https://www.reddit.com/r/'+$scope.subs+$scope.sortType+'.json?limit='+limit,function(data){
                //only record time when successful
                firstTime = new Date();
                
                //just in case user switches while gathering new list of threads
                if ($scope.subs !== currentSubs) return;
                //threads is within data.children (array)
                let addedNew = false;
                let threads = data.data.children;
                
                //for each thread, get desired data and create an object
                threads.forEachReverse((thread) => {
                    let data = thread.data;
                    //check for any unwanted filters, and skip if found
                    let skip = false;
                    $scope.filterUnwanted.forEach((filter) => {
                        let regEx = new RegExp(filter,'i');
                        if (regEx.test(data.title)){
                            skip = true;
                        }
                    });
                    //check for any wanted filters (shows only when there's a match)
                    $scope.filterWanted.forEach((filter) => {
                        let regEx = new RegExp(filter,'i');
                        if (regEx.test(data.title) === false){
                            skip = true;
                        }
                    });
                    if (skip) return;
                    
                    //console.log(data);
                    let obj = {
                        id: data.id,
                        author: data.author,
                        created: data.created,
                        title: data.title,
                        description: data.selftext,
                        description_html: data.selftext_html,
                        url: data.url,
                        sub: data.subreddit,
                        comments: data.permalink,
                        domain: data.domain,
                        numberComments: data.num_comments,
                        media: data.media_embed,
                        colour: 'red'
                    };
                    if ($scope.clickedOn.indexOf(obj.id) !== -1) obj.colour = '';
                    if (checkExists(obj.id) === false){
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
                
                //if found a new thread, play a sound and update Angular
                if (addedNew){
                    $scope.$apply();
                    if ($scope.mute === false){
                        sound.play();
                    }
                }
                
                
            });
        }
        
        //check if a thread already exists in the array
        function checkExists(id){
            let exists = false;
            let test = $scope.currentThreads.find((thread) => thread.id == id);
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
    
    //custom Array function to run forEach in reverse
    Array.prototype.forEachReverse = function(func){
        for (let i = this.length-1; i >= 0; i--){
            func(this[i], i);
        }
    };
