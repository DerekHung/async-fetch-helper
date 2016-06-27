"use strict";

var soap = require('soap');
var soapMap = {};

function itemError(code, msg, stack){
	return function asyncSoapItem(asyncCallback){
		var returnResult= {
			errorCode: code,
			errorMsg: msg,
			errorStack: stack
		};
		return asyncCallback(null, returnResult);
	};
}

function itemSuccess(result){
	return function asyncSoapItem(asyncCallback){
		var returnResult= result;
		return asyncCallback(null, returnResult);
	};
}

function AsyncItem(defaults, _childProcess){
	return function main(url, soapCallback){
		return function proxy(asyncCallback){
			function createMathod(soapClient, methodNameList){
				var wrap = {};
				
				methodNameList.map(function loopMethodNameList(methodName) {
					wrap[methodName] = function(params, returnKey, methodCallback){
						if(!params){
							return itemError(500, 'Server Error', new Error("Params in function '" + methodName + "'  of soap client is necessary!"))(asyncCallback);
						}else{
							var returnAll = false;
							
							if(typeof returnKey === 'function'){
								methodCallback = returnKey;
								returnKey = '';
							}
							
							if(params.hasOwnProperty('returnAll')){
								returnAll = ['undefined', null, false, 'false', 0, '0'].indexOf(params.returnAll) === -1;
								delete params.returnAll;
							}
							
							soapClient[methodName](params, function soapMathodCallback(methodError, methodResponse) {
								if(methodError){
									return itemError(500, 'Server Error', methodError)(asyncCallback);
								}else{
									var result = {};
									
									try{
										if(typeof methodResponse !== 'undefined' && methodResponse.hasOwnProperty('return')){
											//get return
											try {
												result = JSON.parse(methodResponse.return);	
											} catch(returnIsStr) {
												result = methodResponse.return;
											}
											
											//get response
											if(result !== 'undefined' && result.hasOwnProperty("error")){
												return itemError(500, result.message, result.exception)(asyncCallback);
											}else if(result !== 'undefined' && result.hasOwnProperty("warning")){
												return itemSuccess({
													response:{
														warning: result.warning
													}
												})(asyncCallback);
											}else if(result !== 'undefined' && result.hasOwnProperty("response")){
												//get special key at first floor
												if(returnKey && result.hasOwnProperty(returnKey)){
													result = result[returnKey];
												}
												
												//multi data
												if(Array.isArray(result)){
													result = {currentResult:result};
												}
												
												//response to callback
												if(methodCallback){
													var newPool = methodCallback(result);
													
													if(newPool && newPool.length > 0){
														_childProcess(newPool, function childProcessCallback(newPoolResult) {
															result.childResult = newPoolResult;
															return itemSuccess(result)(asyncCallback);
														});
													}else{
														return itemSuccess(result)(asyncCallback);
													}
												}else{
													return itemSuccess(result)(asyncCallback);
												}
											}else if(result !== 'undefined' && result.hasOwnProperty("issuerList")){
												return itemSuccess(result)(asyncCallback);
											}else{
												if(returnAll === true){
													return itemSuccess(result)(asyncCallback);
												}else{
													return itemError(500, 'Server Error', new Error('Something happen at methodResponse.return'))(asyncCallback);
												}
											}
										}else{
											return itemError(500, 'Server Error', new Error('Something happen at methodResponse: no return'))(asyncCallback);
										}
									}catch(eAll){
										return itemError(500, 'Server Error', eAll)(asyncCallback);
									}
								}	
							});
						}
					};
				});

				return wrap;
			}
			
			if(!soapMap[url]){
				var source = /^http/.test(url) ? url : defaults.apiUrl+url+"?wsdl";
				
				soap.createClient(source, function(soapError, soapClient){
					if(soapError){
						return itemError(500, 'Server Error', soapError)(asyncCallback);
					}else{
						var key = url.replace(/\//,'');
						var methodNameList = Object.keys(soapClient[key][key+'HttpSoap11Endpoint']);
						
						soapMap[url] = {
							client : soapClient,
							methodNameList : methodNameList
						};
						
						var methodList = createMathod(soapClient, methodNameList);
						soapCallback(methodList);
					}
				});
			}else{
				var soapClient = soapMap[url].client;
				var methodNameList = soapMap[url].methodNameList;
				var methodList = createMathod(soapClient, methodNameList);
				soapCallback(methodList);
			}
		};
	}
};

module.exports = function wrap(defaults, _childProcess){
	return function soapCreator(url, soapCallback){         
		if(!url || !soapCallback){
			return itemError(500, "Server Error", new Error('Url and soapCallback in soap function are necessary!'));
		}else{
			return new AsyncItem(defaults, _childProcess)(url, soapCallback);
		}    
	};
};