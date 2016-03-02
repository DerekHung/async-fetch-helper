# Async Fetch Helper

[![License][npm-license]][license-url]
[![Downloads][npm-downloads]][npm-url]

AsyncFetchHelper is wrapper for [async](https://www.npmjs.com/package/async) 
that using [unirest](https://github.com/Mashape/unirest-nodejs) or [soap](https://github.com/vpulim/node-soap) to fetch data with less code.

## Install

```bash
$ npm install async-fetch-helper --save
```

## Usage

```javascript
var AsyncFetchHelper = require('async-fetch-helper');

AsyncFetchHelper.need(['soap', 'rest']).then(function(soap, rest){
	return [
		soap('http://soapApi.com', function(client){
			client.method(paramObj);
		}),
		rest('get', 'http://restApi.com', params)
	];
}).end(function(results){
	console.log(results);
	// [soapResult, restResult]
})
```

# Api

## AsyncFetchHelper.need(apiTypeList)

- `apiTypeList` - _ArrayList_; api type (rest, soap, etc...)

	The method will return constructor of AsyncFetchHelper.
		
	### then(callback)
	
	- `callback` -  The function "then" will apply the api type you need, and it must return an array that about the api request settings
	
	```javascript
	then(function(rest, soap){
		return [rest(),soap()];
	})
	```
	
	### end(callback)
	
	- `callback` - The function will get all api response using array
	
	```javascript
	end(function(result){
		console.log(results);
		// [soapResult, restResult]
	})
	```
	
## AsyncFetchHelper.register(apiType, handler)

- `apiType` - _String_; Naming for handler
- `handler` - _Function_; Other method for call api defined by user

	This method will add your handler to method options of need, so you can call your handler by `need(['youApiTypeName'])`

## AsyncFetchHelper.setting(settings)

The options we have:
	
- `apiUrl ` -  If your api have the same domain,your can setting this param

example : if you have two apis that url is `[rest] http://api.com.tw/api1` and `[soap] http://api.com.tw/api2`

```javascript
// settings
settings = {
	apiUrl : 'http://api.com.tw'
};

// call api
rest('get', '/api1', params),soap(/api2', (client)=>{})
	```
	
	