"use strict";
var ClientBase = require('./ClientBase'),
  request = require("request"),
  handleError = require('./errorHandler').handleError,
  Account = require("./model/Account"),
  Checkout = require("./model/Checkout"),
  Notification = require("./model/Notification"),
  Order = require("./model/Order"),
  PaymentMethod = require("./model/PaymentMethod"),
  User = require("./model/User"),
  Merchant = require("./model/Merchant"),
  crypto = require("crypto"),
  _ = require("lodash"),
  qs = require("querystring"),
  assign = require("object-assign"),
  callback_key = require('./CallbackKey.js');


function Client(opts) {

  if (!(this instanceof Client)) {
    return new Client(opts);
  }
  ClientBase.call(this, opts);
}

Client.prototype = Object.create(ClientBase.prototype);

Client.prototype.refresh = function () {
  return new Promise((resolve, reject) => {
    var self = this;
    var params = {
      'grant_type': 'refresh_token',
      'refresh_token': this.refreshToken
    };
    var path = this.tokenUri;
    this._postHttp(path, params, function myPost(err, result) {

      if (err) {
        err.type = etypes.TokenRefreshError;
        reject(err);
        return;
      }
      self.accessToken = result.access_token;
      self.refreshToken = result.refresh_token;
      resolve(result);
    });
  });
};

Client.prototype.getAccounts = function (args) {
  return new Promise((resolve, reject) => {
    var opts = {
      'colName': 'accounts',
      'ObjFunc': Account
    };

    this._getAllHttp(_.assign(args || {}, opts), (err, result) => err ? reject(err) : resolve(result));
  });
};

Client.prototype.getAccount = function (account_id) {
  return new Promise((resolve, reject) => {
    var opts = {
      'path': 'accounts/' + account_id,
      'ObjFunc': Account
    };
    this._getOneHttp(opts, (err, result) => err ? reject(err) : resolve(result));
  });
};

Client.prototype.createAccount = function (args) {
  return new Promise((resolve, reject) => {
    var opts = {
      'colName': 'accounts',
      'ObjFunc': Account,
      'params': args
    };

    this._postOneHttp(opts, (err, result) => err ? reject(err) : resolve(result));
  });
};

Client.prototype.getCurrentUser = function () {
  return new Promise((resolve, reject) => {
    var opts = {
      'path': 'user',
      'ObjFunc': User
    };

    this._getOneHttp(opts, (err, result) => err ? reject(err) : resolve(result));
  });
};

Client.prototype.getUser = function (userId) {
  return new Promise((resolve, reject) => {
    var opts = {
      'path': 'users/' + userId,
      'ObjFunc': User
    };

    this._getOneHttp(opts, (err, result) => err ? reject(err) : resolve(result));
  });
};

Client.prototype.getNotifications = function (args) {
  return new Promise((resolve, reject) => {
    var opts = {
      'colName': 'notifications',
      'ObjFunc': Notification
    };

    this._getAllHttp(_.assign(args || {}, opts), (err, result) => err ? reject(err) : resolve(result));
  });
};

Client.prototype.getNotification = function (notificationId) {
  return new Promise((resolve, reject) => {
    var opts = {
      'path': 'notifications/' + notificationId,
      'ObjFunc': Notification
    };
    this._getOneHttp(opts, (err, result) => err ? reject(err) : resolve(result));
  });
};

Client.prototype.getBuyPrice = function (params) {
  return new Promise((resolve, reject) => {
    var currencyPair;
    if (params.currencyPair) {
      currencyPair = params.currencyPair;
    } else if (params.currency) {
      currencyPair = 'BTC-' + params.currency;
    } else {
      currencyPair = 'BTC-USD';
    }
    this._getOneHttp({ 'path': 'prices/' + currencyPair + '/buy' }, (err, response) => err ? reject(err) : resolve(response));
  });
};

Client.prototype.getSellPrice = function (params) {
  return new Promise((resolve, reject) => {
    var currencyPair;
    if (params.currencyPair) {
      currencyPair = params.currencyPair;
    } else if (params.currency) {
      currencyPair = 'BTC-' + params.currency;
    } else {
      currencyPair = 'BTC-USD';
    }
    this._getOneHttp({ 'path': 'prices/' + currencyPair + '/sell' }, (err, result) => err ? reject(err) : resolve(result));
  });
};

Client.prototype.getSpotPrice = function (params) {
  return new Promise((resolve, reject) => {
    var opts, currencyPair;
    if (params.currencyPair) {
      currencyPair = params.currencyPair;
      delete params.currencyPair;
    } else if (params.currency) {
      currencyPair = 'BTC-' + params.currency;
      delete params.currency;
    } else {
      currencyPair = 'BTC-USD';
    }
    opts = { 'path': 'prices/' + currencyPair + '/spot', 'params': params };

    this._getOneHttp(opts, (err, result) => err ? reject(err) : resolve(result));
  });
};

// deprecated. use getSpotPrice with ?date=YYYY-MM-DD
Client.prototype.getHistoricPrices = function (params) {
  return new Promise((resolve, reject) => {
    this._getOneHttp({ 'path': 'prices/historic', 'params': params }, (err, result) => err ? reject(err) : resolve(result));
  });
};

Client.prototype.getCurrencies = function () {
  return new Promise((resolve, reject) => {
    this._getOneHttp({ 'path': 'currencies' }, (err, result) => err ? reject(err) : resolve(result));
  });
};

Client.prototype.getExchangeRates = function (params) {
  return new Promise((resolve, reject) => {
    this._getOneHttp({ 'path': 'exchange-rates', 'params': params }, (err, result) => err ? reject(err) : resolve(result));
  });
};

Client.prototype.getTime = function () {
  return new Promise((resolve, reject) => {
    this._getOneHttp({ 'path': 'time' }, (err, result) => err ? reject(err) : resolve(result));
  });
};

Client.prototype.getPaymentMethods = function (args) {
  return new Promise((resolve, reject) => {
    var opts = {
      'colName': 'payment-methods',
      'ObjFunc': PaymentMethod
    };

    this._getAllHttp(_.assign(args || {}, opts), (err, result) => err ? reject(err) : resolve(result));
  });
};

Client.prototype.getPaymentMethod = function (methodId) {
  return new Promise((resolve, reject) => {
    var opts = {
      'path': 'payment-methods/' + methodId,
      'ObjFunc': PaymentMethod
    };

    this._getOneHttp(opts, (err, result) => err ? reject(err) : resolve(result));
  });
};

// Merchant Endpoints
Client.prototype.getOrders = function (args) {
  return new Promise((resolve, reject) => {
    var opts = {
      'colName': 'orders',
      'ObjFunc': Order
    };

    this._getAllHttp(_.assign(args || {}, opts), (err, result) => err ? reject(err) : resolve(result));
  });
};

Client.prototype.getOrder = function (orderId) {
  return new Promise((resolve, reject) => {
    var opts = {
      'path': 'orders/' + orderId,
      'ObjFunc': Order
    };

    this._getOneHttp(opts, (err, result) => err ? reject(err) : resolve(result));
  });
};

Client.prototype.createOrder = function (args) {
  return new Promise((resolve, reject) => {
    var opts = {
      'colName': 'orders',
      'ObjFunc': Order,
      'params': args
    };

    this._postOneHttp(opts, (err, result) => err ? reject(err) : resolve(result));
  });
};

Client.prototype.getCheckouts = function (args) {
  return new Promise((resolve, reject) => {
    var opts = {
      'colName': 'checkouts',
      'ObjFunc': Checkout
    };

    this._getAllHttp(_.assign(args || {}, opts), (err, result) => err ? reject(err) : resolve(result));
  });
};

Client.prototype.getCheckout = function (checkoutId) {
  return new Promise((resolve, reject) => {
    var opts = {
      'path': 'checkouts/' + checkoutId,
      'ObjFunc': Checkout
    };

    this._getOneHttp(opts, (err, result) => err ? reject(err) : resolve(result));
  });
};

Client.prototype.createCheckout = function (args) {
  return new Promise((resolve, reject) => {
    var opts = {
      'colName': 'checkouts',
      'ObjFunc': Checkout,
      'params': args
    };

    this._postOneHttp(opts, (err, result) => err ? reject(err) : resolve(result));
  });
};

Client.prototype.getMerchant = function (merchantId) {
  return new Promise((resolve, reject) => {
    var opts = {
      'path': 'merchants/' + merchantId,
      'ObjFunc': Merchant
    };

    this._getOneHttp(opts, (err, result) => err ? reject(err) : resolve(result));
  });
}

Client.prototype.verifyCallback = function (body, signature) {
  var verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(body);
  return verifier.verify(callback_key, signature, 'base64');
};

Client.prototype.toString = function () {
  return "Coinbase API Client for " + this.baseApiUri;
};

module.exports = Client;

