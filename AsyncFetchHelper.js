import async from 'async';
import soap from 'soap';
import unirest from "unirest";

let defaults = {
	apiUrl : 'http://api.com/services';
};
let soapMap = {};
let userDefinedHandler = {};

function AsyncFetchHelper(apiType) {
	let self = this;
	
	self.args = [];
	self.pool = [];
	
	apiType = apiType || [];
	apiType.map((method) => {
		switch(method){
			case 'rest':
				self.args.push(_rest);
				break;
			case 'soap':
				self.args.push(_soap);
				break;
			case 'thrift':
				self.args.push(_thrift);
				break;
			default:
				if(typeof userDefinedHandler[method] === 'function' ){
					self.args.push(userDefinedHandler[method]);
				}
				break;
		}
	});
	
	function _rest(method, url, params, returnKey, restCallback){
		switch(arguments.length){
			case 3:
				if(typeof arguments[2] === 'function'){
					restCallback = arguments[2];
					params = {};
					returnKey = '';
				}else if(typeof arguments[2] === 'string'){
					returnKey = arguments[2];
					params = {};
					restCallback = null;
				}
				break;
				
			case 4:
				if(typeof arguments[3] === 'function'){
					restCallback = arguments[3];
					
					if(typeof arguments[2] === 'string'){
						returnKey = arguments[2];
						params = {};
					}
				}
				break;
		}
		
		return function asyncRestItem(asyncCallback){
			let main = function(mainCallback){
				let mainSelf = this;
				let source = /^http.+/.test(url)?url:(defaults.apiUrl+url);
				let request = unirest[method](source);
				
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
					let result = {};
					
					if(restResponse){
						result = restResponse.body;
					}
					
					if(returnKey && result.hasOwnProperty(returnKey)){
						result = result[returnKey];
					}
					
					if(Array.isArray(result)){
						result = {currentResult:result};
					}
					
					if(restCallback){
						let newPool = restCallback(result);
							
						if(newPool && newPool.length > 0){                                        
							_childProcess(newPool, (newPoolResult) => {
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
	}
	
	function _soap(url, soapCallback){                
		return function asyncSoapItem(asyncCallback){
			let main = function(mainCallback){
				let createMathod = function(soapClient, methodNameList){
					let wrap = {};
					
					methodNameList.map((methodName) => {
						wrap[methodName] = function(params, returnKey, methodCallback){
							if(typeof returnKey === 'function'){
								methodCallback = returnKey;
								returnKey = '';
							}
							
							soapClient[methodName](params, (clientError, clientResponce) => {
								let result = {};

								if(clientResponce){
									result = JSON.parse(clientResponce.return);
								}
								
								if(returnKey && result.hasOwnProperty(returnKey)){
									result = result[returnKey];
								}
								
								if(Array.isArray(result)){
									result = {currentResult:result};
								}
								
								if(methodCallback){
									let newPool = methodCallback(result);
									
									if(newPool && newPool.length > 0){
										_childProcess(newPool, (newPoolResult) => {
											result.childResult = newPoolResult;
											mainCallback(null, result);
										});
									}else{
										mainCallback(null, result);
									}
								}else{
									mainCallback(null, result);
								}
							});
						};
					});

					return wrap;
				};

				if(!soapMap[url]){
					let source = defaults.apiUrl+url+"?wsdl";

					soap.createClient(source, function(soapError, soapClient){
						let key = url.replace(/\//,'');
						let methodNameList = Object.keys(soapClient[key][key+'HttpSoap11Endpoint']);
						
						soapMap[url] = {
							client : soapClient,
							methodNameList : methodNameList
						};
						
						let methodList = createMathod(soapClient, methodNameList);
						soapCallback(methodList);
					});
				}else{
					let soapClient = soapMap[url].client;
					let methodNameList = soapMap[url].methodNameList;
					let methodList = createMathod(soapClient, methodNameList);
					soapCallback(methodList);
				}
			};
			
			new main(asyncCallback);
		};
	}
	
	function _thrift(){
		return false;
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
}

AsyncFetchHelper.prototype.then = function(callback){
	let self = this;
	
	self.pool = callback.apply(self, self.args);
	return self;
};

AsyncFetchHelper.prototype.end = function(callback){
	let self = this;
	
	async.parallel(self.pool, function asyncFinalCallback(asyncError, asyncResults){
		self.pool.length = 0;

		if(asyncError){
			callback({error: asyncError});
		}else{
			callback(asyncResults);
		}
	});
};

AsyncFetchHelper.need = function(apiTypeList) {
	return new AsyncFetchHelper(apiTypeList);
};

AsyncFetchHelper.register = function(apiType, handler){
	if(!userDefinedHandler[apiType] && typeof handler() === 'function'){
		userDefinedHandler[apiType] = handler;
	}
};

AsyncFetchHelper.setting = function(setting){
	if(typeof setting === 'object'){
		defaults = Object.assign({}, defaults, setting);
	}
};

export default AsyncFetchHelper;
