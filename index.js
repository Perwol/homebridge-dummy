"use strict";

var Service, Characteristic, HomebridgeAPI;

module.exports = function(homebridge) {

  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  HomebridgeAPI = homebridge;
  homebridge.registerAccessory("homebridge-dummy", "DummySwitch", DummySwitch);
}

function DummySwitch(log, config) {
  this.log = log;
  this.name = config.name;
  this.stateful = config.stateful;
  this.reverse = config.reverse;
  this._service = new Service.Switch(this.name);
  
  this.cacheDirectory = HomebridgeAPI.user.persistPath();
  this.storage = require('node-persist');
  this.storage.initSync({dir:this.cacheDirectory, forgiveParseErrors: true});
  
  this._service.getCharacteristic(Characteristic.On)
    .on('set', this._setOn.bind(this));

  if (this.reverse) this._service.setCharacteristic(Characteristic.On, true);

  if (this.stateful) {
	var cachedState = this.storage.getItemSync(this.name);
	if((cachedState === undefined) || (cachedState === false)) {
		this._service.setCharacteristic(Characteristic.On, false);
	} else {
		this._service.setCharacteristic(Characteristic.On, true);
	}
  }

  if (config.to_hour >= 0) {
    this.toHour = config.to_hour;
    this.toMin = config.to_min ? config.to_min : 0;
  } else {
    this.time = config.time ? config.time : 1000;
  }
}

DummySwitch.prototype.getServices = function() {
  return [this._service];
}

DummySwitch.prototype._setOn = function(on, callback) {

  this.log("Setting switch to " + on);

  if (on && this.toHour >= 0) {
    var now = new Date();
    this.time = new Date(now.getFullYear(), now.getMonth(), now.getDate(), this.toHour, this.toMin, 0, 0) - now;
    if (this.time < 0) {
      this.time += 86400000;
    }
  } else {
    this.time = 1000;
  }
  
  if (on && !this.reverse && !this.stateful) {
    setTimeout(function() {
      this._service.setCharacteristic(Characteristic.On, false);
    }.bind(this), this.time);
  } else if (!on && this.reverse && !this.stateful) {
    setTimeout(function() {
      this._service.setCharacteristic(Characteristic.On, true);
    }.bind(this), this.time);
  }
  
  if (this.stateful) {
	this.storage.setItemSync(this.name, on);
  }
  
  callback();
}
