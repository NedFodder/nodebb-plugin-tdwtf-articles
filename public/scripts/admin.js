'use strict';
/*globals define, socket, config, app*/

define('admin/plugins/tdwtfarticles', ['settings'], function(settings) {
	var tdwtfArticles = {};
	
	function enableAutoComplete(selector) {
		selector.autocomplete({
			source: function(request, response) {
				socket.emit('admin.user.search', {query: request.term}, function(err, results) {
					if (err) {
						app.alertError(err.message);
					} else if (results && results.users) {
						var users = results.users.map(function(user) {
							return user.username;
						});
						response(users);
						$('.ui-autocomplete a').attr('href', '#');
					}
				});
			}
		});
	}
	function enableTagsInput(selector) {
		selector.tagsinput({
			maxTags: config.maximumTagsPerTopic,
			confirmKeys: [13, 44]
		});
	}
	
	tdwtfArticles.init = function() {
	
		var wrapper = $('.tdwtfarticles-settings');
		
		socket.emit('categories.get', function(err, data) {
			for (var i = 0; i < data.length; ++i) {
				$('.article-category').append('<option value=' + data[i].cid + '>' + data[i].name + '</option>');
			}
		
			settings.sync('tdwtfarticles', wrapper, function() {
				enableAutoComplete($('.tdwtfarticles-settings .article-user'));
				enableTagsInput($('.tdwtfarticles-settings .article-tags'));
			});
		
		});
	
		$('#save').click(function(event) {
            event.preventDefault();
            settings.persist('tdwtfarticles', wrapper, function(){
                socket.emit('admin.settings.syncTdwtfArticles', config);
            });
		});
		
	};
	
	return tdwtfArticles;
});

