"use strict";

var unirest = require('unirest');

module.exports = function wrap(defaults){
	return function rest(method, url, params, headers, returnKey, restCallback){
		if(!method || !url || !params){
			throw new Error("method and url and params in rest function are necessary!");
			return;
		}
		switch(arguments.length){
			case 4:
				if(typeof arguments[3] === 'function'){
					restCallback = arguments[3];
					headers = {};
					returnKey = '';
				}else if(typeof arguments[3] === 'string'){
					returnKey = arguments[3];
					headers = {};
					restCallback = null;
				}
				break;
				
			case 5:
				if(typeof arguments[3] === 'string'){
					restCallback = arguments[4];
					returnKey = arguments[3];
					headers = {};
				}else if(typeof arguments[3] === 'object'){
					if(typeof arguments[4] === 'function'){
						restCallback = arguments[4];
						returnKey = '';
					}else if(typeof arguments[4] === 'string'){
						restCallback = null;
					}
				}
				break;
		}
		
		return function asyncRestItem(asyncCallback){
			var main = function(mainCallback){
				var mainSelf = this;
				var source = /^http.+/.test(url)?url:(defaults.apiUrl+url);
				var request = unirest[method](source);
				
				request.headers(headers);
				
				mainSelf.mainCallback = mainCallback;
				
				switch(method){
					case 'get':
					case 'delete':
						request.query(params);
						break;
					case 'post':
					case 'put':
						request.send(params);
						break;
					default:break;
				}
				
				request.end(function resultHandler(restResponse){
					var result = {};
					
					if(restResponse && restResponse.hasOwnProperty('body')){
						result = restResponse.body;
					}
					
					if(returnKey && result.hasOwnProperty(returnKey)){
						result = result[returnKey];
					}
					
					if(Array.isArray(result)){
						result = {currentResult:result};
					}
					
					if(restCallback){
						var newPool = restCallback(result);
							
						if(newPool && newPool.length > 0){                                        
							_childProcess(newPool, function childProcessCallback(newPoolResult) {
								result.childResult = newPoolResult;
								mainSelf.mainCallback(null, result);
							});
						}else{
							mainSelf.mainCallback(null, result);
						}
					}else{
						mainSelf.mainCallback(null, result);
					}
				});
			};
			
			new main(asyncCallback);
		};
	};
};