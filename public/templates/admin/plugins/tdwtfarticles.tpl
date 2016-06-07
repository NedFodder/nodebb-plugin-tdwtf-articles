<div class="row">
	<div class="col-lg-9">
		<form class="form tdwtfarticles-settings">
			<div class="panel panel-default">
				<div class="panel-heading">RSS Feed</div>
				<div class="panel-body">
					<div class="row">
					
						<div class="col-sm-12 col-xs-12">
							<div class="form-group">
								<!--<input type="checkbox" data-key="enabled">Enable RSS Feed</input>-->
								<label for="enabled">
									<input type="checkbox" data-key="enabled"></input>
									Enable RSS Feed
								</label>
							</div>
							<div class="form-group">
								<label for="url">URL</label>
								<input class="form-control" type="text" data-key="url" placeholder="http://" />
							</div>
						</div>
						
						<div class="clearfix">
							<div class="col-sm-3 col-xs-12">
								<div class="form-group">
									<label>Category</label>
									<select class="form-control article-category" type="number" data-key="category"></select>
								</div>
							</div>
							<div class="col-sm-9 col-xs-12">
								<div class="form-group">
									<label>Tags</label><br/>
									<input class="form-control article-tags" type="text" data-key="tags" placeholder="Tags for the topics" value="">
								</div>
							</div>
						</div>
						
						<div class="col-sm-2 col-xs-12">
							<div class="form-group">
								<label for="userName">Default User</label>
								<input class="form-control article-user" type="text" data-key="userName" placeholder="User to post as" value="" />
							</div>
						</div>
						<div class="col-sm-2 col-xs-12">
							<div class="form-group">
								<label>Interval</label>
								<select class="form-control article-interval" type="text" data-key="interval">
									<option value="hour">1 Hour</option>
									<option value="halfDay">12 Hours</option>
									<option value="day">24 Hours</option>
									<option value="minute">1 Minute</option>
								</select>
							</div>
						</div>
						<div class="col-sm-2 col-xs-12">
							<div class="form-group">
								<label># Entries / Interval</label>
								<input class="form-control article-entries-to-pull" type="text" data-type="number" data-key="entries" placeholder="Number of entries to pull every interval" value="">
							</div>
						</div>
						<div class="col-sm-3 col-xs-12">
							<div class="form-group">
								<label for="timestamp">Topic Timestamp</label>
								<select class="form-control article-topictimestamp" data-key="timestamp">
									<option value="now">Now</option>
									<option value="article">Article Publish Time</option>
								</select>
							</div>
						</div>
						
					</div>
				</div>
			</div>
			<div class="panel panel-default">
				<div class="panel-heading">Authors</div>
				<div class="panel-body">
					<div class="col-sm-12 col-xs-12">
						If a front page author has a forum account, enter their name
						(as it appears on TDWTF) and their user name. Their account must
						have permissions to post to the category specified above.
					</div>
					<div class="col-sm-12 col-xs-12">
						<div class="form-group">
							<div class="row">
								<div class="col-sm-3 col-xs-12">
									<label>Real Name</label>
								</div>
								<div class="col-sm-3 col-xs-12">
									<label>User Name</label>
								</div>
							</div>
							<div class="authors" data-key="authors" data-type="articleAuthor" ></div>
						</div>
						<button class="btn btn-primary" id="add-author">Add Author</button>
					</div>
				</div>
			</div>
			<div class="panel panel-default">
				<div class="panel-body">
					<div class="col-sm-3">
						<button class="btn btn-primary btn-block" id="save">Save Settings</button>
					</div>
					<div class="col-sm-3">
						<button class="btn btn-block" id="reset">Undo Changes</button>
					</div>
					<div class="col-sm-3">
						<button class="btn btn-danger btn-block" id="restore">Restore Defaults</button>
					</div>
				</div>
			</div>
		</form>
	</div>
</div>

