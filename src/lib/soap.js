"use strict";

var soap = require('soap');
var soapMap = {};

module.exports = function soap(url, soapCallback){         
	if(!url || !soapCallback){
		throw new Error("Url and soapCallback in soap function are necessary!");
		return;
	}       
	return function asyncSoapItem(asyncCallback){
		var main = function(mainCallback){
			var createMathod = function(soapClient, methodNameList){
				var wrap = {};
				
				methodNameList.map(function loopMethodNameList(methodName) {
					wrap[methodName] = function(params, returnKey, methodCallback){
						if(!params){
							throw new Error("params in function '" + methodName + "'  of soap client is necessary!");
							return;
						}      
						
						if(typeof returnKey === 'function'){
							methodCallback = returnKey;
							returnKey = '';
						}
						
						soapClient[methodName](params, function soapClientCallback(clientError, clientResponce) {
							var result = {};

							if(clientResponce && clientResponce.hasOwnProperty('return')){
								try {
									result = JSON.parse(clientResponce.return);	
								} catch(err) {
									result = clientResponce.return;
								}
								
							}
							
							if(returnKey && result.hasOwnProperty(returnKey)){
								result = result[returnKey];
							}
							
							if(Array.isArray(result)){
								result = {currentResult:result};
							}
							
							if(methodCallback){
								var newPool = methodCallback(result);
								
								if(newPool && newPool.length > 0){
									_childProcess(newPool, function childProcessCallback(newPoolResult) {
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
				var source = /^http/.test(url) ? url : defaults.apiUrl+url+"?wsdl";

				soap.createClient(source, function(soapError, soapClient){
					if(soapError){
						throw soapError;
						return;
					}
					
					var key = url.replace(/\//,'');
					var methodNameList = Object.keys(soapClient[key][key+'HttpSoap11Endpoint']);
					
					soapMap[url] = {
						client : soapClient,
						methodNameList : methodNameList
					};
					
					var methodList = createMathod(soapClient, methodNameList);
					soapCallback(methodList);
				});
			}else{
				var soapClient = soapMap[url].client;
				var methodNameList = soapMap[url].methodNameList;
				var methodList = createMathod(soapClient, methodNameList);
				soapCallback(methodList);
			}
		};
		
		new main(asyncCallback);
	};
};