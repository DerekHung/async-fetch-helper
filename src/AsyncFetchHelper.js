"use strict";

var async = require('async');
var userDefinedHandler = {};
var connectionPool = {};

function AsyncFetchHelper(settings) {
	function _asyncFetchHelper(settings){
		var defaults = {
			apiUrl : 'http://api.com/services'
		};
		
		var self = this;
		self.args = [];
		self.pool = [];
		self.need = need;
		
		if(typeof settings === 'object'){
			defaults = Object.assign({}, defaults, settings);
			
			if(defaults.hasOwnProperty('connectionPool') && (defaults.connectionPool.hasOwnProperty('rest')||defaults.connectionPool.hasOwnProperty('soap'))){
				connectionPool = defaults.connectionPool;
			}
		}

		return self;
		
		function _childProcess(pool, callback){
			async.parallel(pool, function asyncFinalCallback(asyncError, asyncResults){
				if(asyncError){
					callback({error: asyncError});
				}else{
					callback(asyncResults);
				}
			});
		}
		
		function reset(){
			self.args = [];
			self.pool = [];
		}
		
		function need(apiType) {
			reset();
			
			apiType = apiType || [];
			
			for(var i = 0; i < apiType.length; i++){
				var method = apiType[i];
				
				switch(method){
					case 'rest':
					case 'soap':
					case 'thrift':
						var poolSetting = null;
						
						if( connectionPool.hasOwnProperty(method) ){
							poolSetting = connectionPool[method];
						}
						
						var methodFun = require('./lib/' + method + 'Creator')(defaults, poolSetting, _childProcess);
						self.args.push(methodFun);
						break;
					default:
						if(typeof userDefinedHandler[method] === 'function' ){
							self.args.push(userDefinedHandler[method]);
						}
						break;
				}
			}

			return self;
		}
	}
		
	_asyncFetchHelper.prototype.then = function then(callback){
		var self = this;
		
		self.pool = callback.apply(self, self.args);

		return self;
	}
	
	_asyncFetchHelper.prototype.end = function end(callback){
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
	}
	
	return new _asyncFetchHelper(settings);
}

AsyncFetchHelper.register = function(apiType, handler){
	if(!userDefinedHandler[apiType] && typeof handler() === 'function'){
		userDefinedHandler[apiType] = handler;
	}
};

AsyncFetchHelper.setConnectionPool = function(setting){
	connectionPool = setting;
};

module.exports = AsyncFetchHelper;
