require "capistrano/node-deploy"

default_run_options[:pty] = true

set :application, "application-name"
set :repository, "ssh://git_repo"
set :app_environment, "PRODUCTION=1 CONFIG_LOADER_PATH=/home/<service account>/<app>/shared/config.js"
set :user, "<service account>"
set :scm, :git
set :deploy_to, "/home/<service account>/<app>"

role :app, "<dest app>"

namespace :remote do;
  task :upload_shared_files do;
    put(File.read("config/config.js"), "#{shared_path}/config.js", :via => :scp)
  end;
end;

before :deploy, 'remote:upload_shared_files'
