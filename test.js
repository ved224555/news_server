var fetch=require('node-fetch')
var data;
fetch('https://newsapi.org/v2/top-headlines?country=in&category=sports&apiKey=c7b2f0f57c364e6f9bed11d164d7f5f1').then(result=>result.text()).then(body=>{data=body})
console.log(JSON.parse(data))
