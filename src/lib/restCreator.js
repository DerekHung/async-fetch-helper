"use strict";

var http = require('http');
var unirest = require('unirest');
var agent = null;

function itemError(code, msg, stack){
	return function asyncRestItem(asyncCallback){
		var returnResult= {
			errorCode: code,
			errorMsg: msg,
			errorStack: stack
		};
		return asyncCallback(null, returnResult);
	};
}

function itemSuccess(result){
	return function asyncRestItem(asyncCallback){
		var returnResult= result;
		return asyncCallback(null, returnResult);
	};
}

function AsyncItem(defaults, _childProcess){
	return function main(method, url, params, headers, returnKey, restCallback){
		var source = /^http.+/.test(url) ? url : (defaults.apiUrl + url);
		var request = null;
		var returnAll = false;
		
		if(params.hasOwnProperty('returnAll')){
			returnAll = ['undefined', null, false, 'false', 0, '0'].indexOf(params.returnAll) === -1;
			delete params.returnAll;
		}
		
		function createRequest(){
			request = unirest[method](source);
			request.options.agent = agent;
			
			if(headers.hasOwnProperty('cookies')){
				request.options.headers.cookie = headers.cookies;
				delete headers.cookies;
			}
			
			if(Object.keys(headers).length > 0){
				request.headers(headers);
			}
		}
		
		function setRequestParams(){
			switch(method){
				case 'get':
				case 'delete':
					request.query(params);
					break;
					
				case 'post':
				case 'put':
					request.send(params);
					break;
					
				default:
					break;
			}
		}
		
		function requestEnd(asyncCallback){
			request.end(function resultHandler(restResponse){
				var result = {};
				
				try {
					//get response
					if(typeof restResponse !== 'undefined' && restResponse.hasOwnProperty('body')){
						result = restResponse.body;
						
						if(result !== 'undefined' && result.hasOwnProperty("error") && result.error !== ""){
							return itemError(500, result.error.message, result.error.exception)(asyncCallback);
						}else if(result !== 'undefined' && result.hasOwnProperty("warning") && result.warning !== ""){
							return itemSuccess({
								response:{
									warning: result.warning
								}
							})(asyncCallback);
						}else if(result !== 'undefined' && result.hasOwnProperty("response") && result.response !== ""){
							//get special key at first floor
							if(returnKey && typeof result !== 'undefined' && result.hasOwnProperty(returnKey)){
								result = result[returnKey];
							}
							
							//multi data
							if(Array.isArray(result)){
								result = {currentResult: result};
							}
							
							//response to callback
							if(restCallback){
								var newPool = restCallback(result);
									
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
						}else if(result !== 'undefined' && result.hasOwnProperty("Result") && result.hasOwnProperty("Report") && result.Result !== "" && result.Report !== ""){
							return itemSuccess(result)(asyncCallback);
						}else{
							if(returnAll === true){
								return itemSuccess(result)(asyncCallback);
							}else{
								return itemError(500, 'Server Error', new Error('Something happen at restResponse.body : '+ result.message))(asyncCallback);
							}
						}
					}else{
						return itemError(500, 'Server Error', new Error('Something happen at restResponse: no body'))(asyncCallback);
					}
				}catch(eAll){
					return itemError(500, 'Server Error', eAll)(asyncCallback);
				}
			});
		}
		
		return function proxy(asyncCallback){
			createRequest();
			setRequestParams();
			requestEnd(asyncCallback);
		};
	};
}

module.exports = function wrap(defaults, poolSetting, _childProcess){
	if(poolSetting && !agent){
		agent = new http.Agent(poolSetting);
	}
	
	return function creator(method, url, params, headers, returnKey, restCallback){
		if(!method || !url || !params){
			return itemError(500, 'Server Error', new Error('Method, url and params in rest function are necessary!'));
		}else{
			try{
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
				
				return new AsyncItem(defaults, _childProcess)(method, url, params, headers, returnKey, restCallback);
			}catch(e){
				return itemError(500, 'Server Error', e);
			}
		}
	};
};