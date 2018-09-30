"use strict";

const util = require('./lib/util.js');

const Ether = function(){
    const Web3 = require('web3');
    const Tx = require('ethereumjs-tx');

    this.setChain = function(chain){
          switch(chain){
            case 'mainnet':
               return {'node':'https://mainnet.infura.io/'+ process.env.INFURA_KEY, 'id':1};
               break;
            case 'ropsten':              
               return {'node':'https://ropsten.infura.io/'+ process.env.INFURA_KEY, 'id':3};
               break;
            case 'rinkeby':              
               return {'node':'https://rinkeby.infura.io/'+ process.env.INFURA_KEY, 'id':4};
               break;
            case 'kovan':              
               return {'node':'https://kovan.infura.io/'+ process.env.INFURA_KEY, 'id':42};
               break;
            default:
               return {'node':'https://mainnet.infura.io/'+ process.env.INFURA_KEY, 'id':1};
               break;
         }
    }

    this.validateAddress = function(address){
        var valid = true;
        if(String(address) == ''){
            valid = false;
        }
        else if(
                String(address).length != 42
            || !String(address).match(/^[0-9a-zA-Z]/)
            || !(String(address).slice(0,2)=='0x')
        ){
            valid = false;
        }
        return valid;
    }

    this.validatePrivKey = function(secret){
        var valid = true;
        if(String(secret) == ''){
            valid = false;
        }
        else if(
                String(secret).length != 64
            || !String(secret).match(/^[0-9a-z]/)
        ){
            valid = false;
        }
        return valid;
    }
  
    this.getBalance = function(chain,address){
        const web3 = new Web3(new Web3.providers.HttpProvider(this.setChain(chain).node));
        return new Promise((resolve, reject) => {
            if(this.validateAddress(address)){
                  resolve(web3.fromWei(web3.eth.getBalance(address), "ether").toNumber() + ' Ether');
            }
            else{
                  reject('Invalid address.');
            }
        });
    }

    this.transfer = function(chain,sendFrom,sendTo,amount,secret){
      const web3 = new Web3(new Web3.providers.HttpProvider(this.setChain(chain).node));
      
      return new Promise((resolve, reject) => {
          if(!this.validateAddress(sendFrom)){
                reject('Sender address is invalid.')
          }
          if(!this.validateAddress(sendTo)){
                reject('Destination address is invalid.')
          }
          if(typeof(amount)!=='number' || amount<0){
                reject('Invalid amount.')
          }
          if(!this.validatePrivKey(secret)){
                reject('Invalid secret.')
          }
        
          web3.eth.getTransactionCount(sendFrom, (err,txCount) => {
              var privateKey = new Buffer(secret, 'hex')
              var rawTx = {
                  nonce: web3.toHex(txCount),
                  gasPrice: web3.toHex(web3.toWei('4', 'gwei')),
                  gasLimit: web3.toHex(21000),
                  to: sendTo,
                  value: web3.toHex(web3.toWei(amount, 'ether')),  
                  data:null,
                  chainId: this.setChain('ropsten').id
              }

              var tx = new Tx(rawTx);
              tx.sign(privateKey);

              var signedTx = tx.serialize();
              web3.eth.sendRawTransaction('0x' + signedTx.toString('hex'),(err, txHash)=>{
                  if(err) {
                      reject(err);
                  } else {
                      resolve(txHash);
                  }
              });
          });
      });
   }
}


const Linebot = function(app) {
  const linebot = require('linebot');
  const Database = require('nedb');
  const db={};
  db.botstatus = new Database({
      filename: '.database/botstatus',
      autoload: true
  });
  
  this.bot = linebot({
      channelId: process.env.CHANNEL_ID,
      channelSecret: process.env.CHANNEL_SECRET,
      channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
      verify: true
  });
  app.post('/', this.bot.parser());
  
  this.onMessageEvent = function (callback){
      this.bot.on('message',event => {
            this.setMessageTemplate(event);
            callback(event);
      });
      this.bot.on('postback',event => {
            this.setMessageTemplate(event);
            callback(event);
      });
  }
  
  this.setMessageTemplate = function(event){
    
      event.replyText = function(message){
           event.reply([{
              "type": "text",
              "text": message
           }]).then(data => {
                console.log('Success', data);
           }).catch(error => {
                console.log('Failed', error);
           });
      }
      
      event.replyButton = function(/*title,message,button,postback,...*/){
           var obj = {
              "type": "template",
              "altText": arguments[0],
              "template": {
                  "type": "buttons",
                  "thumbnailImageUrl": null,
                  "imageAspectRatio": "rectangle",
                  "imageSize": "cover",
                  "imageBackgroundColor": "#FFFFFF",
                  "title": arguments[0],
                  "text": arguments[1],
                  "actions": [
                      {
                        "type": "postback",
                        "label": arguments[2],
                        "data": arguments[3],
                      }
                  ]
              }
           }
           for (var i = 0; i < 3; i++) {
             if(arguments.length > 2*i+4){
                obj.template.actions[i+1]={
                  "type":  "postback",
                  "label": arguments[2*i+4],
                  "data":  arguments[2*i+5] 
                };
             }
           }
          event.reply([obj]).then(data => {
                console.log('Success', data);
           }).catch(error => {
                console.log('Failed', error);
           });
      }
      
      event.replyFlex = function(title,src,message,button,uri){
           event.reply([{
               "type": "flex",
                "altText": title,
                "contents": {
                    "type": "bubble",
                    "header": {
                        "type": "box",
                        "layout": "vertical",
                        "contents": [
                            {
                                "type": "text",
                                "text": title
                            }
                        ]
                    },
                    "hero": {
                        "type": "image",
                        "url": src,
                        "size": "full",
                        "aspectRatio": "2:1"
                    },
                    "body": {
                        "type": "box",
                        "layout": "vertical",
                        "contents": [
                            {
                                "type": "text",
                                "text": message,
                                "wrap": true
                            }
                        ]
                    },
                    "footer": {
                        "type": "box",
                        "layout": "horizontal",
                        "contents": [
                            {
                                "type": "button",
                                "style": "primary",
                                "action": {
                                    "type": "uri",
                                    "label": button,
                                    "uri": uri
                                }
                            }
                        ]
                    }
                }
           }]).then(data => {
                console.log('Success', data);
           }).catch(error => {
                console.log('Failed', error);
                 try{throw new Error('Success');}catch(e){console.log(e);}
           });
          }
      }

      this.readDatabase = function(lineID,callback){
          return new Promise((resolve, reject) =>  {
              db.botstatus.findOne({ lineid: lineID }, (err, obj) =>{
                   if(err == null && obj!=null){
                       resolve(obj.status);
                   }
                   else if(err == null && obj==null){
                       resolve('action=null');
                   }
                   else{
                       reject(err);
                   }
              });
          });
      }

      this.writeDatabase = function(lineID,status){
          db.botstatus.findOne({ lineid: lineID }, (err, obj) => {
              if(obj==null){
                  db.botstatus.insert({'lineid':lineID,'status':status});  
              }
              else{
                  db.botstatus.update({ 'lineid': lineID }, { $set: { status: status } }, { multi: true });
              }
          });
      }
}

const Route = function(app){
  
    app.use(express.static('public'));
    
    app.get("/redirect/accountinfo", (req, res) => {
        res.sendFile(__dirname + '/redirect/accountinfo.html');
    });
    app.get("/accountinfo", (req, res) => {
        res.sendFile(__dirname + '/public/accountinfo.html');
    });
    app.get("/redirect/transfer", (req, res) => {
        res.sendFile(__dirname + '/redirect/transfer.html');
    }); 
    app.get("/transfer", (req, res) => {
        res.sendFile(__dirname + '/public/transfer.html');
    }); 
    app.get("/redirect/invoice", (req, res) => {
        res.sendFile(__dirname + '/redirect/invoice.html');
    }); 
    app.get("/invoice", (req, res) => {
        res.sendFile(__dirname + '/public/invoice.html');
    }); 
}


var Main = function(app){
    const route = new Route(app);
    const bot = new Linebot(app);
    const ether = new Ether();
  
    bot.getAction = function(event,message){
        try{　
            if(typeof(message['action']) == 'undefined' || message['action']==''){
                throw 'No Action Detected.';
            }
            switch(message['action']){
            case 'getBalance':
                bot.writeDatabase(event.source.userId,'action=showbalance&listen=chain');
                event.replyButton(
                    'Select Chain','Select Ethereum chain.',
                    'Mainnet','chain=mainnet',
                    'Ropsten','chain=ropsten',
                    'Rinkeby','chain=rinkeby',
                    'Kovan','chain=kovan'
                );
                break;
            case 'accountInfo':
                event.replyFlex(
                    "Show Account Info",
                    "https://snst-lab.github.io/etherbot/public/img/icon.png",
                    "Click the button below to show your account information.",
                    "Show",
                    "https://etherbot.glitch.me/redirect/accountinfo"
                );
                break;
            case 'payment':
                event.replyFlex(
                    "Payment",
                    "https://snst-lab.github.io/etherbot/public/img/icon.png",
                    "Click the button below to open URL.",
                    "Open URL",
                    "https://etherbot.glitch.me/redirect/transfer"
                );
                break;
            case 'invoice':
                event.replyFlex(
                    "Manage Invoice",
                    "https://snst-lab.github.io/etherbot/public/img/icon.png",
                    "Click the button below to open URL.",
                    "Open URL",
                    "https://etherbot.glitch.me/redirect/invoice"
                );
                break;
            default:
                throw 'No Action Detected.';
                break;
            }

          }catch(e){
               event.replyText(e);
          }
    }
    
    this.onMessageEvent = function(event){
        switch(event.type){
           case 'message':
              var message = util.queryParse(event.message.text);      
              break;
           case 'postback':
              var message = util.queryParse(event.postback.data);
              break;
           default:
              event.replyText('The event type is not supported.');
              break;
        }
      
        bot.readDatabase(event.source.userId).then(function(statusQuery) {
              var status = util.queryParse(statusQuery);
          
              if(status['action']=='getbalance' && status['listen']=='chain'){
                    console.log(message['chain']);   
                    if(typeof message['chain'] !== 'undefined'){
                        bot.writeDatabase(event.source.userId, 'action=getbalance&listen=address&chain=' + message['chain']);
                        event.replyText('Send '+ message['chain']+ ' Address.');
                    }
                    else{
                        bot.writeDatabase(event.source.userId, null);
                        event.replyText('Failed to select chain.');
                    }
              }
              else if(status['action']=='getbalance' && status['listen']=='address' && typeof status['chain'] !== 'undefined'){
                    ether.getBalance(status['chain'] , event.message.text).then(function(data){
                        event.replyText(data);
                    })
                    .catch(function(err){
                        event.replyText(err);
                    });
                    bot.writeDatabase(event.source.userId, null);
              }
              else{
                  bot.getAction(event,message);
              }
          
        }).catch(function (err) {
            bot.getAction(event,message);
        });
    }
    
    app.listen(process.env.PORT || 3000, () => {
        console.log('Server is running.');
    });
    bot.onMessageEvent(this.onMessageEvent);
}
const express = require('express');
new Main(express());