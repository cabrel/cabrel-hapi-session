test:
		CONFIG_LOADER_PATH=config/config.js npm test

coverage:
		CONFIG_LOADER_PATH=config/config.js LIB_COV=1 /usr/bin/mocha -R html-cov > coverage.html
			rm -rf lib-cov

update:
		npm update

install:
		npm install

devconfig:
		CONFIG_LOADER_PATH=config/config.js node config/populate.js

prodconfig:
		CONFIG_LOADER_PATH=config/config.js PRODUCTION=1 node config/populate.js

.PHONY: test coverage update install devconfig prodconfig

