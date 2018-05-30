// Global Map and InfoWindow References
var map;
var infoWindow;

/* Initialize Google Map */

var Map = function() {

	// handle Google Map API errors
	// (KO bindings haven't been applied, use jQuery here)
	if ( typeof google != 'object' || typeof google.maps != 'object') {

		// display error message
		$('.error-message').html('<h2>ERROR: could not load Google Maps API.</h2>?</h5>');

		// hide search bar/result are
		$('.search-area').hide();

		// quit
		return false;
	}

	// Map 
	var mapOptions = {
     // center area at capital city og south korea seoul 
		center: {lat: 37.532600 ,lng:  127.024612},
		zoom: 6,
		disableDefaultUI: true
	};

	// map variable
	map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);

	// info window
	infoWindow = new google.maps.InfoWindow({
		maxWidth: 240
	});
	return true;
};

/* ViewModel */
var ViewModel = function() {

	// Reference to ViewModel
	var self = this;

	// Information for the location
	this.Location = function(title, lat, lng, keyWords, street, city) {

		// Store information about the location
		this.title = ko.observable(title);
		this.lat = ko.observable(lat);
		this.lng = ko.observable(lng);
		this.keyWords = ko.observableArray(keyWords);
		this.street = ko.observable(street);
		this.city = ko.observable(city);

		// Create map marker
		this.marker = new google.maps.Marker({
			position: new google.maps.LatLng(lat, lng),
			animation: google.maps.Animation.DROP,
			title: title,
		});

		// Google Street View
		this.streetViewImg = ko.observable('<img class="bgimg" src="http://maps.googleapis.com/maps/api/streetview?size=600x400&location=' + street + ', ' + city + '">');

		// Wikipedia Links
		this.wikiInfo = ko.observable('');

		// NYTimes info
		this.nytInfo = ko.observable('');

		// Reference to current location for use in event handlers
		var temp = this;

		// Infowindow information
		this.info = ko.computed(function(){
			return '<div>'+
						'<h3>' + temp.title() + '</h3>'+
						'<div><p>'+
							temp.keyWords().join(', ')+'<br><br>'+
							temp.wikiInfo()+'<br>'+
							temp.nytInfo()+'<br>'+
							'<div class="hidden-xs hidden-sm col-md-12">'+temp.streetViewImg()+'</div>'+
						'</p></div>'+
					'</div>';
		});

		// Add click event to show info window
		google.maps.event.addListener(this.marker, 'click', function() {
			temp.reveal();
		});

		this.reveal = function() {
			map.setCenter(temp.marker.getPosition());
			infoWindow.setContent(temp.info());
			infoWindow.open(map, temp.marker);	
		};

		// Set marker map
		this.marker.setMap(map);
	};

	// A list of all location objects
	this.generateLocationList = function() {

		// Declare variables
		var locations = [];
		var keyWords;

		// no enough information about street 
		keyWords = ['capital city'];
		locations.push( ko.observable(new self.Location('Seoul', 37.532600, 127.024612, keyWords, 'City')) );

		keyWords = ['island'];
		locations.push( ko.observable(new self.Location('Jeju Island',33.407461 , 126.702292, keyWords, '1310 4th Ave', 'Seattle, WA')) );

		keyWords = ['city'];
		locations.push( ko.observable(new self.Location('Busan', 35.172228 , 129.034045, keyWords, 'city')) );

		keyWords = ['Park'];
		locations.push( ko.observable(new self.Location('Dadohae Haesang National Park', 34.297794 , 126.710107, keyWords, 'Park')) );

		keyWords = ['tower', 'market'];
		locations.push( ko.observable(new self.Location('Lotte World Tower', 37.513067, 127.102517, keyWords, 'entertainment')) );

		keyWords = ['tower'];
		locations.push( ko.observable(new self.Location('Namsan Seoul Tower', 37.551459, 126.988248, keyWords, 'tower')) );

         keyWords = ['park'];
		locations.push( ko.observable(new self.Location('Changdeokgung Palace and Huwon', 37.551459, 126.988248, keyWords, 'park')) );

		return locations;
	};
	this.allLocations = ko.observable(this.generateLocationList());

	// Initial value for search input field
	var defaultString = 'Search';

	// Search string
	this.searchString = ko.observable(defaultString);

	//filtered based on searchString
	this.locations = ko.computed(function() {

		// Instantiate observable array
		var filteredLocations = ko.observableArray();

		// Determine filter from search string
		var filter = self.searchString().toLowerCase();

		// Iterate over locations
		self.allLocations().forEach(function(location) {

			// Set all location markers to be invisible
			location().marker.setVisible(false);

			// Check if title contains filter 
			if ( location().title().toLowerCase().indexOf(filter) != -1 || self.searchString() === defaultString) {
				filteredLocations.push(location());
				location().marker.setVisible(true);
			}
			else {
				var words  = location().keyWords();

				for (var i = 0; i < words.length; i++) {
					
					
					if (words[i].toLowerCase().indexOf(filter) != -1) {
						filteredLocations.push(location());
						location().marker.setVisible(true);
						break;
					}
				}
			}
		});
		return filteredLocations();
	});

	// Determine wikipedia information
	this.wikipedia = function () {

		var wikipediaRequest = function(index) {

			// Wikipedia request error handling
			var wikiRequestTimeout = setTimeout(function(){
				self.locations()[index].wikiInfo('No WIKI info to dispay.<br>');
			}, 1000); // 1 second timeout error

			// Request
			$.ajax({
				url: wikiUrl,
				dataType: 'jsonp',
				success: function(response){

					// string to replace wikInfo
					var newWikiInfo = self.locations()[index].wikiInfo();
					newWikiInfo = newWikiInfo.concat('Wikipedia:');
					newWikiInfo = newWikiInfo.concat('<ul>');

					
					var articleList = response[1];

					for (var j = 0; j < articleList.length; j++) {
						
						if (j > 2) {
							break;
						}
						var articleStr = articleList[j];
						var url = 'http://en.wikipedia.org/wiki/' + articleStr;
						newWikiInfo = newWikiInfo.concat('<li> <a href="' + url + '">' + articleStr + '</a></li>');
					}
		            clearTimeout(wikiRequestTimeout);
					newWikiInfo = newWikiInfo.concat('</ul>');
					self.locations()[index].wikiInfo(newWikiInfo);
				}
			});
		};

		for (var i = 0; i < self.locations().length; i++){

			// Wikipedia AJAX Request
			var wikiUrl = 'http://en.wikipedia.org/w/api.php?action=opensearch&search=' + self.locations()[i].title() + '&format=json&callback=wikiCallBack';
			wikipediaRequest(i);
		}
	};
	this.wikipedia();

	this.nytimes = function () {

		// AJAX request
		var nytimesRequest = function(index) {
			var nytimesUrl = 'http://api.nytimes.com/svc/search/v2/articlesearch.json?q=' + self.locations()[index].title() + '&sort=newest&api-key=cb7b11a0c162aa1eb6bb4eb9c5fa140f:9:72128533';
			$.getJSON(nytimesUrl, function(data){

				var newNytimesInfo = self.locations()[index].nytInfo();
				newNytimesInfo = newNytimesInfo.concat('New York Times:');
				newNytimesInfo = newNytimesInfo.concat('<ul>');

				var articles = data.response.docs;
				for (var j = 0; j < articles.length; j++) {
				
					if (j > 2) {
						break;
					}
					var article = articles[j];
					newNytimesInfo = newNytimesInfo.concat('<li class="article"> <a href="' + article.web_url + '">' + article.headline.main + '</a></li>');
				}

				self.locations()[index].nytInfo(newNytimesInfo);

			}).error(function(e){
				self.locations()[index].nytInfo('No NYTimes info to display.<br>');
			});
		};

		for (var i = 0; i < self.locations().length; i++){
			nytimesRequest(i);
		}
	};
	this.nytimes();
};

// Knockout 
$(function(){

	//  (returns true if Google Map API is successfully loaded)
	if ( Map() ) {

		// Apply KO bindings
		ko.applyBindings(new ViewModel());
	}
});