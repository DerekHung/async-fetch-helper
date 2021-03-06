"use strict";

var http = require('http');
var soap = require('soap');
var agent = null;

function itemError(code, msg, stack, info){
	return function asyncSoapItem(asyncCallback){
		var returnResult= {
			errorCode: code,
			errorMsg: msg + " - " + stack.message,
			errorStack: stack.stack || stack.exception,
			errorInfo: info || {}
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
			function createMathod(soapClientName, soapClient, methodNameList){
				var wrap = {};

				methodNameList.map(function loopMethodNameList(methodName) {
					wrap[methodName] = function(params, returnKey, methodCallback){
						if(!params){
							return itemError(500, 'Server Error', new Error("Params in function '" + methodName + "'  of soap client is necessary!"), {
								url:url, params:{}, methodName:methodName, result:{}
							})(asyncCallback);
						}else{
							var returnAll = false;
							var defaultParams = Object.keys(soapClient.wsdl.definitions.messages[methodName].parts).reduce(function(newObj, value, index){
								var paramName = value;

								if(/\[\]/.test(paramName)){
									paramName = paramName.replace('[]','');
									newObj[paramName] = [];
								} else {
									newObj[paramName] = '';
								}

								return newObj;
							}, {});

							params = Object.assign({}, defaultParams, params);

							if(typeof returnKey === 'function'){
								methodCallback = returnKey;
								returnKey = '';
							}

							if(params.hasOwnProperty('returnAll')){
								returnAll = ['undefined', null, false, 'false', 0, '0'].indexOf(params.returnAll) === -1;
								delete params.returnAll;
							}

							if(params.hasOwnProperty('browserTimeStamp')) delete params.browserTimeStamp;

							soapClient[methodName](params, function soapMathodCallback(methodError, methodResponse) {
								if(methodError){
									try{
										return itemError(500, 'Server Error', methodError, {
											url:url, params:params, methodName:methodName, result:methodResponse.body
										})(asyncCallback);
									}catch(methodResponseError){
										return itemError(500, 'Server Error', methodError, {
											url:url, params:params, methodName:methodName, result:""
										})(asyncCallback);
									}
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
											if(result !== undefined && result !== 'undefined' && result.hasOwnProperty("error") && result.error !== ""){
												return itemError(500, 'Server Error', result.error, {
													url:url, params:params, methodName:methodName, result:result
												})(asyncCallback);
											}else if(result !== 'undefined' && result.hasOwnProperty("warning") && result.warning !== ""){
												return itemSuccess({
													response:{
														warning: result.warning
													}
												})(asyncCallback);
											}else if(result !== undefined && result !== 'undefined' && result.hasOwnProperty("response") && result.response !== ""){
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
											}else if(result !== undefined && result !== 'undefined' && result.hasOwnProperty("issuerList") && result.issuerList !== ""){
												return itemSuccess(result)(asyncCallback);
											}else{
												if(returnAll === true){
													return itemSuccess(result)(asyncCallback);
												}else{
													return itemError(500, 'Server Error', new Error('Something happen at methodResponse.return : '+ result.message), {
														url:url, params:params, methodName:methodName, result:result
													})(asyncCallback);
												}
											}
										}else{
											if(returnAll === true){
												return itemSuccess(result)(asyncCallback);
											}else{
												return itemError(500, 'Server Error', new Error('Something happen at methodResponse: no return'), {
													url:url, params:params, methodName:methodName, result:result
												})(asyncCallback);
											}
										}
									}catch(eAll){
										if(returnAll === true){
											return itemSuccess(result)(asyncCallback);
										}else{
											return itemError(500, 'Server Error', eAll, {
												url:url, params:params, methodName:methodName, result:result
											})(asyncCallback);
										}
									}
								}
							}, {agent: agent});
						}
					};
				});

				return wrap;
			}

			var source = /^http/.test(url) ? url : defaults.apiUrl+url+"?wsdl";

			soap.createClient(source, function(soapError, soapClient){
				if(soapError){
					return itemError(500, 'Server Error', soapError)(asyncCallback);
				}else{
					var soapClientName = url.replace(/\//,'');
					var methodNameList = Object.keys(soapClient[soapClientName][soapClientName+'HttpSoap11Endpoint']);
					var methodList = createMathod(soapClientName, soapClient, methodNameList);
					try{
						soapCallback(methodList);	
					}catch(e){
						return itemError(500, 'Server Error', e)(asyncCallback);
					}
				}
			});
		};
	}
};

module.exports = function wrap(defaults, poolSetting, _childProcess){
	if(poolSetting && !agent){
		agent = new http.Agent(poolSetting);
	}

	return function soapCreator(url, soapCallback){
		if(!url || !soapCallback){
			return itemError(500, "Server Error", new Error('Url and soapCallback in soap function are necessary!'));
		}else{
			return new AsyncItem(defaults, _childProcess)(url, soapCallback);
		}
	};
};
