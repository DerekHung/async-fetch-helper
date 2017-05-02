"use strict";

var http = require('http');
var agent = null;

module.exports = function wrap(defaults, poolSetting, _childProcess){
	if(poolSetting && !agent){
		//agent = new http.Agent(poolSetting);
	}
	
	return function thriftCreator(){
		return false;
	};
};