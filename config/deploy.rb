require "capistrano/node-deploy"

default_run_options[:pty] = true

set :application, "application-name"
set :repository, "ssh://git_repo"
set :app_environment, "PRODUCTION=1 CONFIG_LOADER_PATH=/home/<service account>/<app>/current/config/config.js"
set :user, "<service account>"
set :scm, :git
set :deploy_to, "/home/<service account>/<app>"

role :app, "<dest app>"
