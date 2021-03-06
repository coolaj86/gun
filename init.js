(function(){

process.env.rootdir = __dirname;
var LIVE = process.env.LIVE || (process.env.NODE_ENV === 'production'), web, opt = {};
opt.port = process.env.OPENSHIFT_NODEJS_PORT || process.env.VCAP_APP_PORT || process.env.PORT;
opt.host = process.env.OPENSHIFT_NODEJS_IP;
if(opt.port || opt.host){ LIVE = true }
opt.port = opt.port || 8888;
opt.host = opt.host || '0.0.0.0';

if(LIVE){
	//process.env['redis-install'] = '/tmp';
} else {
	// Keys are hosted outside this folder, you must provide your own with environment variables.
	var keys = '../../linux/.ssh/keys-gun.js';
	if((require('fs').existsSync||require('path').existsSync)(keys)){
		require(keys);
	}
	if((require('fs').existsSync||require('path').existsSync)('../coalesce')){
		web = require('../coalesce');
	}
}

opt.run = ['./test/server', './test/tests', './test/shoot'];
opt.node = {key: "temp gun key", src:["http://gunjs.herokuapp.com/com","http://gunjs-amark.rhcloud.com/com","http://gunjs.aws.af.cm/com"]};

web = web || require('coalesce');
web(opt); 
console.log("Gun @ "+ opt.port);

})();