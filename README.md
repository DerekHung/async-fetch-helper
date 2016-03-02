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

# AsyncFetchHelper Api

## AsyncFetchHelper.need(apiTypeList)

- `apiTypeList` - _ArrayList_; api type (rest, soap, etc...)

	The method will return constructor of AsyncFetchHelper.
		
	### then(callback)
	
	- `callback` -  _Function_; The function "then" will apply the api type you need, and it must return an array that about the api request settings
	
	```javascript
	then(function(rest, soap){
		return [rest(),soap()];
	})
	```
	
	### end(callback)
	
	- `callback` - _Function_; The function will get all api response using array
	
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

- `settings ` -  _Object_;

The options we have:
	
- `apiUrl ` -  _String_; If your api have the same domain,your can setting this param

example : if you have two apis that url is `[rest] http://api.com.tw/api1` and `[soap] http://api.com.tw/api2`

```javascript
// settings
settings = {
	apiUrl : 'http://api.com.tw'
};

// call api
rest('get', '/api1', params),soap('/api2', (client)=>{})
```

# AsyncFetchHelper method

# rest(method, url, params, returnKey, restCallback)

- `method` - _String_; Request type (GET, PUT, POST, etc...)
- `url` - _String_; api url
- `params` - _Object_; _Optional_; Request params, if request type is get or delete, it will be query uri, or it will be request body
- `returnKey` - _String_; _Optional_; Return value of key at first level in Result 
- `restCallback` - _Function_; _Optional_; This function will get current request result, and it is like function `then` that must return an array that about the api request settings

# soap(url, soapCallback)

- `url` - _String_; api url
- `soapCallback` - _Function_; This function will get soap client, and `method wrapper`

	### method wrapper(params, returnKey, methodCallback)
	
	- `params` - _Object_; _Optional_; Request params
	- `returnKey` - _String_; _Optional_; Return value of key at first level in Result 
	- `restCallback` - _Function_; _Optional_; This function will get current request result, and it is like function `then` that must return an array that about the api request settings
	