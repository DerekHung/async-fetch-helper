"use strict";

var async = require('async');
var userDefinedHandler = {};

function AsyncFetchHelper(settings) {
	var self = this;
	var defaults = {
		apiUrl : 'http://api.com/services'
	};
	
	self.args = [];
	self.pool = [];
	self.need = need;
	
	function _asyncFetchHelper(){
		if(typeof settings === 'object'){
			defaults = Object.assign({}, defaults, settings);
		}
	}
	
	function _childProcess(pool, callback){
		async.parallel(pool, function asyncFinalCallback(asyncError, asyncResults){
			if(asyncError){
				callback({error: asyncError});
			}else{
				callback(asyncResults);
			}
		});
	}
	
	function need(apiType) {
		apiType = apiType || [];
		apiType.map(function loopApiType(method) {
			switch(method){
				case 'rest':
				case 'soap':
				case 'thrift':
					var methodFun = require('./lib/' + method + 'Creator')(defaults);
					self.args.push(methodFun);
					break;
				default:
					if(typeof userDefinedHandler[method] === 'function' ){
						self.args.push(userDefinedHandler[method]);
					}
					break;
			}
		});
		
		return self;
	}
	
	_asyncFetchHelper();
}

AsyncFetchHelper.prototype.then = function(callback){
	var self = this;
	
	self.pool = callback.apply(self, self.args);
	return self;
};

AsyncFetchHelper.prototype.end = function(callback){
	var self = this;
	
	try{
		async.parallel(self.pool, function asyncFinalCallback(asyncError, asyncResults){
			self.pool.length = 0;

			if(asyncError){
				callback({error: asyncError});
			}else{
				callback(asyncResults);
			}
		});
	}catch(e){
		self.pool.length = 0;
		callback({error: e.message});
	}	
};

AsyncFetchHelper.register = function(apiType, handler){
	if(!userDefinedHandler[apiType] && typeof handler() === 'function'){
		userDefinedHandler[apiType] = handler;
	}
};

module.exports = AsyncFetchHelper;
