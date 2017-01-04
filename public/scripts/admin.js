'use strict';
/*globals define, socket, config, app*/

define('admin/plugins/tdwtfarticles', ['settings'], function(settings) {
	var tdwtfArticles = {};
	
	function enableAutoComplete(selector) {
		require(['jqueryui'], function() {
			selector.autocomplete({
				source: function(request, response) {
					socket.emit('admin.user.search', {query: request.term}, function(err, results) {
						if (err) {
							return app.alertError(err.message);
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
		});
	}
	function enableTagsInput(selector) {
		selector.tagsinput({
			maxTags: config.maximumTagsPerTopic,
			confirmKeys: [13, 44]
		});
	}
	
	function addAuthorControls(element, author, user) {
	
		var nameControl = $('<input />', {
			class: 'form-control author-name',
			value: author
		});
		var userControl = $('<input />', {
			class: 'form-control author-user',
			value: user
		});
		var removeButton = $('<button />', {
			class: 'btn btn-sm btn-primary remove',
			text: 'Remove',
			on: {
				click: function(event) {
					event.preventDefault();
					$(this).closest('.author').remove();
				}
			}
		});
		var controls = $('<div class="author row" />')
			.append([
				$('<div class="col-sm-3 col-xs-12" />').append(nameControl),
				$('<div class="col-sm-3 col-xs-12" />').append(userControl),
				$('<div class="col-sm-3 col-xs-12" />').append(removeButton)
			]);
		element.append(controls);
		
		enableAutoComplete(userControl);
	}
	
	function registerPlugin() {
		settings.registerPlugin({
			types: ['articleAuthor'],
			set: function(element, value, trim) { // eslint-disable-line no-unused-vars
				element.children().remove();
				for (var i = 0; i < value.length; ++i) {
					addAuthorControls(element, value[i].name, value[i].user);
				}
			},
			get: function(element, trim, empty) { // eslint-disable-line no-unused-vars
				var values = [];
				var children = element.find('.author');
				children.each(function(_, child) {
					child = $(child);
					var name = child.find('.author-name:first').val();
					var user = child.find('.author-user:first').val();
					if (name.length && user.length) {
						values.push({name: name, user: user});
					}
				});
				return values;
			}
		});
	}
	
	tdwtfArticles.init = function() {
	
		var wrapper = $('.tdwtfarticles-settings');
		
		socket.emit('categories.get', function(err, data) {
			for (var i = 0; i < data.length; ++i) {
				$('.article-category').append('<option value=' + data[i].cid + '>' + data[i].name + '</option>');
			}
			
			registerPlugin();
				
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
		
		$('#reset').click(function(event) {
            event.preventDefault();
			settings.sync('tdwtfarticles', wrapper, function() {
				enableAutoComplete($('.tdwtfarticles-settings .article-user'));
				enableTagsInput($('.tdwtfarticles-settings .article-tags'));
			});
		});
		
		$('#restore').click(function(event) {
            event.preventDefault();
			socket.emit('admin.settings.getTdwtfArticlesDefaults', null, function (err, data) {
				settings.set('tdwtfarticles', data, wrapper, function(){
					socket.emit('admin.settings.syncTdwtfArticles');
				});
			});
		});
		
		$('#add-author').click(function(event) {
			event.preventDefault();
			addAuthorControls($('.authors'), '', '');
		});
		
	};
	
	return tdwtfArticles;
});

